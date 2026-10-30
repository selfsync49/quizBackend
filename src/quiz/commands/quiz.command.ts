import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Quiz } from '../entities/quiz.entity';
import { SubmitQuizAttemptDto } from '../dtos/quiz.dtos';

@Injectable()
export class QuizCommand {
    constructor(
        @InjectRepository(Quiz) private readonly quizRepo: Repository<Quiz>,
        private readonly dataSource: DataSource,
    ) { }

    private async resolveUserId(userId: string): Promise<string | null> {
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (UUID_REGEX.test(userId)) return userId;

        const users = await this.dataSource.query(
            `SELECT id FROM users WHERE LOWER(email) = LOWER($1) OR username = $1 LIMIT 1;`,
            [userId],
        );
        return users && users.length > 0 ? users[0].id : null;
    }

    private async ensureAttemptsConstraint() {
        try {
            await this.dataSource.query(`
                DO $$
                DECLARE
                    r RECORD;
                BEGIN
                    -- Drop legacy UNIQUE(user_id, quiz_id) constraints that block playing across days
                    FOR r IN (
                        SELECT c.conname
                        FROM pg_constraint c
                        JOIN pg_class t ON c.conrelid = t.oid
                        WHERE t.relname = 'quiz_attempts'
                          AND c.contype = 'u'
                          AND c.conname != 'quiz_attempts_pkey'
                    ) LOOP
                        EXECUTE 'ALTER TABLE quiz_attempts DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname) || ';';
                    END LOOP;

                    -- Drop legacy unique index as well (excluding primary key)
                    FOR r IN (
                        SELECT indexname
                        FROM pg_indexes
                        WHERE tablename = 'quiz_attempts'
                          AND indexdef ILIKE '%UNIQUE%'
                          AND indexname NOT LIKE '%pkey%'
                    ) LOOP
                        EXECUTE 'DROP INDEX IF EXISTS ' || quote_ident(r.indexname) || ';';
                    END LOOP;
                END $$;
            `);
        } catch (e) {
            // Ignore if constraints already clean
        }
    }

    async submitQuizAttempt(dto: SubmitQuizAttemptDto) {
        try {
            if (!dto.userId || !dto.quizId) {
                return { status: false, message: 'User ID and Quiz ID are required.' };
            }

            const targetUserId = await this.resolveUserId(dto.userId);
            if (!targetUserId) {
                return { status: false, message: 'User account not found.' };
            }

            await this.ensureAttemptsConstraint();

            // 1. Check if user has already submitted this quiz TODAY (in IST timezone)
            const existingAttempt = await this.dataSource.query(
                `SELECT id, total_sp_earned, score, correct_count, submitted_at 
                 FROM quiz_attempts 
                 WHERE user_id = $1 
                   AND quiz_id = $2
                   AND (submitted_at AT TIME ZONE 'Asia/Kolkata')::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date;`,
                [targetUserId, dto.quizId],
            );

            if (existingAttempt && existingAttempt.length > 0) {
                return {
                    status: false,
                    alreadyAttempted: true,
                    message: 'You have already played this quiz today. Only one attempt is allowed per daily contest.',
                    data: existingAttempt[0],
                };
            }

            const score = dto.score ?? dto.spEarned ?? 0;
            const spEarned = dto.spEarned ?? 0;
            const correctCount = dto.correctCount ?? 0;
            const wrongCount = dto.wrongCount ?? 0;
            const unansweredCount = dto.unansweredCount ?? 0;

            // 2. Insert into quiz_attempts
            const attemptInsert = await this.dataSource.query(
                `INSERT INTO quiz_attempts (
                    id, user_id, quiz_id, score, total_sp_earned,
                    correct_count, wrong_count, unanswered_count,
                    started_at, submitted_at
                ) VALUES (
                    gen_random_uuid(), $1, $2, $3, $4,
                    $5, $6, $7,
                    NOW() - INTERVAL '10 minutes', NOW()
                ) RETURNING id;`,
                [targetUserId, dto.quizId, score, spEarned, correctCount, wrongCount, unansweredCount],
            );

            const attemptId = attemptInsert[0].id;

            // 3. Insert individual answers if present
            if (Array.isArray(dto.answers) && dto.answers.length > 0) {
                for (const ans of dto.answers) {
                    if (ans.questionId && ans.selectedOptionId) {
                        try {
                            await this.dataSource.query(
                                `INSERT INTO attempt_answers (
                                    id, attempt_id, question_id, selected_option_id,
                                    is_correct, sp_delta, answered_at
                                ) VALUES (
                                    gen_random_uuid(), $1, $2, $3,
                                    $4, $5, NOW()
                                ) ON CONFLICT (attempt_id, question_id) DO NOTHING;`,
                                [
                                    attemptId,
                                    ans.questionId,
                                    ans.selectedOptionId,
                                    ans.isCorrect ?? false,
                                    ans.spDelta ?? (ans.isCorrect ? 10 : 0),
                                ],
                            );
                        } catch (e) {
                            console.error('Error inserting attempt answer:', e);
                        }
                    }
                }
            }

            // 4. Credit Skill Points to user wallet
            let newBalance = 0;
            if (spEarned > 0) {
                // Ensure user skill bank account exists
                await this.dataSource.query(
                    `INSERT INTO skill_bank_accounts (
                        id, user_id, balance_sp, total_earned_sp, total_withdrawn_sp, created_at, updated_at
                    ) VALUES (
                        gen_random_uuid(), $1, 0, 0, 0, NOW(), NOW()
                    ) ON CONFLICT (user_id) DO NOTHING;`,
                    [targetUserId],
                );

                // Add funds to skill bank
                const updateRes = await this.dataSource.query(
                    `UPDATE skill_bank_accounts
                     SET balance_sp = balance_sp + $1,
                         total_earned_sp = total_earned_sp + $1,
                         updated_at = NOW()
                     WHERE user_id = $2
                     RETURNING id, balance_sp;`,
                    [spEarned, targetUserId],
                );

                const updatedRows = Array.isArray(updateRes[0]) ? updateRes[0] : (Array.isArray(updateRes) ? updateRes : []);
                if (updatedRows && updatedRows.length > 0 && updatedRows[0]?.id) {
                    const bankId = updatedRows[0].id;
                    newBalance = parseInt(updatedRows[0].balance_sp, 10) || 0;

                    // Record transaction in skill_point_transactions
                    await this.dataSource.query(
                        `INSERT INTO skill_point_transactions (
                            id, skill_bank_id, source_type, source_id, amount_sp, balance_after_sp, note, created_at
                        ) VALUES (
                            gen_random_uuid(), $1, 'quiz_attempt', $2, $3, $4, 'Live Quiz Reward', NOW()
                        );`,
                        [bankId, dto.quizId, spEarned, newBalance],
                    );
                }
            } else {
                // Fetch current balance
                const bank = await this.dataSource.query(
                    `SELECT balance_sp FROM skill_bank_accounts WHERE user_id = $1;`,
                    [targetUserId],
                );
                if (bank && bank.length > 0) {
                    newBalance = parseInt(bank[0].balance_sp, 10);
                }
            }

            return {
                status: true,
                message: 'Quiz attempt saved and SP credited to wallet successfully.',
                data: {
                    attemptId,
                    spEarned,
                    newBalance,
                    correctCount,
                    score,
                },
            };
        } catch (error) {
            console.error('SourceError QuizCommand:- submitQuizAttempt', error);
            return { status: false, message: error?.message || 'Failed to submit quiz attempt.' };
        }
    }

    async getUserQuizStatus(userId: string) {
        try {
            if (!userId) return { status: false, message: 'User ID is required.' };

            const targetUserId = await this.resolveUserId(userId);
            if (!targetUserId) {
                return {
                    status: true,
                    data: {
                        attempts: {},
                        dayQuizAttempted: false,
                        nightQuizAttempted: false,
                        attemptsList: [],
                    },
                };
            }

            await this.ensureAttemptsConstraint();

            // Fetch only attempts made TODAY (in IST) so previous days' quizzes reset automatically on day change
            const attempts = await this.dataSource.query(
                `SELECT 
                    qa.id AS attempt_id,
                    qa.quiz_id,
                    qa.score,
                    qa.total_sp_earned,
                    qa.correct_count,
                    qa.wrong_count,
                    qa.unanswered_count,
                    qa.submitted_at,
                    q.title AS quiz_title,
                    q.quiz_type
                 FROM quiz_attempts qa
                 JOIN quizzes q ON q.id = qa.quiz_id
                 WHERE qa.user_id = $1
                   AND (qa.submitted_at AT TIME ZONE 'Asia/Kolkata')::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date
                 ORDER BY qa.submitted_at DESC;`,
                [targetUserId],
            );

            const attemptsMap: Record<string, any> = {};
            let dayQuizAttempted = false;
            let nightQuizAttempted = false;

            if (Array.isArray(attempts)) {
                for (const att of attempts) {
                    const qId = att.quiz_id;
                    attemptsMap[qId] = {
                        attemptId: att.attempt_id,
                        quizId: att.quiz_id,
                        quizTitle: att.quiz_title,
                        score: att.score,
                        spEarned: att.total_sp_earned,
                        correctCount: att.correct_count,
                        wrongCount: att.wrong_count,
                        submittedAt: att.submitted_at,
                    };

                    const title = (att.quiz_title || '').toLowerCase();
                    const qType = (att.quiz_type || '').toLowerCase();
                    if (title.includes('morning') || title.includes('day') || qType.includes('morning') || qType.includes('day')) {
                        dayQuizAttempted = true;
                    } else if (title.includes('evening') || title.includes('night') || qType.includes('evening') || qType.includes('night')) {
                        nightQuizAttempted = true;
                    }
                }
            }

            return {
                status: true,
                data: {
                    attempts: attemptsMap,
                    dayQuizAttempted,
                    nightQuizAttempted,
                    attemptsList: attempts || [],
                },
            };
        } catch (error) {
            console.error('SourceError QuizCommand:- getUserQuizStatus', error);
            return { status: false, message: error?.message || 'Failed to fetch user quiz status.' };
        }
    }
}
