import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UserTest, UserTestAnswer, UserTestStatus } from '../entities';

@Injectable()
export class DashboardCommand {
    constructor(
        @InjectRepository(UserTest) private readonly userTestRepo: Repository<UserTest>,
        private readonly dataSource: DataSource,
    ) { }

    // Resolves incoming userId (UUID, email, or username) into a valid user UUID from users table
    private async resolveUserUuid(userId: string): Promise<string | null> {
        if (!userId) return null;
        const clean = userId.trim();
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean);
        if (isUuid) return clean;

        try {
            const rows: { id: string }[] = await this.dataSource.query(
                `SELECT id FROM users WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1) LIMIT 1`,
                [clean],
            );
            if (rows.length > 0) return rows[0].id;

            // If not found and input looks like an email, find or create the user record
            if (clean.includes('@')) {
                const inserted: { id: string }[] = await this.dataSource.query(
                    `INSERT INTO users (email, full_name) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email RETURNING id`,
                    [clean, clean.split('@')[0]],
                );
                if (inserted.length > 0) return inserted[0].id;
            }
        } catch (error) {
            console.error('SourceError:- resolveUserUuid', error, 'userId', userId);
        }
        return null;
    }

    // Creates a new in_progress user_test record when a user starts a test.
    // Guards against duplicate open attempts (unique_open_attempt partial index).
    // If restart is true, existing answers and counters are reset.
    // If existing in-progress attempt is found and restart is false, returns existing attempt with saved answers.
    async createUserTest(userId: string, testId: string, restart: boolean = false) {
        try {
            const resolvedUserId = await this.resolveUserUuid(userId);
            if (!resolvedUserId) {
                console.error('Could not resolve user UUID for userId:', userId);
                return null;
            }

            const existing = await this.userTestRepo.findOne({
                where: { user_id: resolvedUserId, test_id: testId, status: UserTestStatus.IN_PROGRESS },
            });
            if (existing) {
                if (restart) {
                    await this.dataSource.getRepository(UserTestAnswer).delete({ user_test_id: existing.id });
                    existing.started_at = new Date();
                    existing.questions_attempted = 0;
                    existing.correct_answers = 0;
                    existing.score = null;
                    existing.time_taken_seconds = null;
                    const saved = await this.userTestRepo.save(existing);
                    return {
                        ...saved,
                        is_resume: false,
                        answers: [],
                    };
                }

                // If not restart, check if user had previous answers
                const answers = await this.dataSource.getRepository(UserTestAnswer).find({
                    where: { user_test_id: existing.id },
                });
                return {
                    ...existing,
                    is_resume: answers.length > 0,
                    answers: answers.map((a) => ({
                        question_id: a.question_id,
                        selected_option_id: a.selected_option_id,
                    })),
                };
            }

            const record = this.userTestRepo.create({
                user_id: resolvedUserId,
                test_id: testId,
                status: UserTestStatus.IN_PROGRESS,
            });
            const saved = await this.userTestRepo.save(record);
            return {
                ...saved,
                is_resume: false,
                answers: [],
            };
        } catch (error) {
            console.error('SourceError:- createUserTest', error, 'userId', userId, 'testId', testId);
            return null;
        }
    }

    // Upsert a question answer within a test attempt.
    // On first answer  → inserts row + increments questions_attempted on the parent user_test.
    // On re-answer     → updates selected_option_id & is_correct in-place (no counter bump).
    // Uses a transaction to keep both tables consistent.
    async upsertAnswer(userTestId: string, questionId: string, selectedOptionId: string, isCorrect: boolean) {
        try {
            await this.dataSource.transaction(async (manager) => {
                const existing = await manager.findOne(UserTestAnswer, {
                    where: { user_test_id: userTestId, question_id: questionId },
                });

                if (existing) {
                    // Re-answer: update the chosen option and correctness flag
                    await manager.update(
                        UserTestAnswer,
                        { user_test_id: userTestId, question_id: questionId },
                        { selected_option_id: selectedOptionId, is_correct: isCorrect, answered_at: new Date() },
                    );
                } else {
                    // First answer: insert row and bump attempted counter
                    const answer = manager.create(UserTestAnswer, {
                        user_test_id: userTestId,
                        question_id: questionId,
                        selected_option_id: selectedOptionId,
                        is_correct: isCorrect,
                    });
                    await manager.save(answer);

                    await manager
                        .createQueryBuilder()
                        .update(UserTest)
                        .set({
                            questions_attempted: () => 'questions_attempted + 1',
                            correct_answers: () => isCorrect ? 'correct_answers + 1' : 'correct_answers',
                        })
                        .where('id = :userTestId', { userTestId })
                        .execute();
                }
            });
            return true;
        } catch (error) {
            console.error('SourceError:- upsertAnswer', error, 'userTestId', userTestId, 'questionId', questionId);
            return false;
        }
    }

    // Finalises a test attempt on user submit:
    //   - Reads started_at to compute time_taken_seconds
    //   - Counts correct_answers and questions_attempted from user_test_answers
    //   - Calculates sp_earned based on correct_answers and MOCK_TEST_SP_REWARD_PER_QUESTION
    //   - Credits SP to user wallet (skill_bank_accounts) and logs transaction
    //   - Sets status → COMPLETED, sp_earned = spEarned
    async submitTest(userTestId: string) {
        try {
            const attempt = await this.userTestRepo.findOne({ where: { id: userTestId } });
            if (!attempt) throw new Error(`UserTest ${userTestId} not found.`);

            // If already completed, return existing details gracefully
            if (attempt.status === UserTestStatus.COMPLETED) {
                let currentBalance = 0;
                if (attempt.user_id) {
                    const bank = await this.dataSource.query(
                        `SELECT balance_sp FROM skill_bank_accounts WHERE user_id = $1 LIMIT 1;`,
                        [attempt.user_id],
                    );
                    if (bank && bank.length > 0) {
                        currentBalance = parseInt(bank[0].balance_sp, 10) || 0;
                    }
                }
                return {
                    id: userTestId,
                    user_id: attempt.user_id,
                    test_id: attempt.test_id,
                    status: attempt.status,
                    completed_at: attempt.completed_at,
                    time_taken_seconds: attempt.time_taken_seconds,
                    correct_answers: attempt.correct_answers || 0,
                    questions_attempted: attempt.questions_attempted || 0,
                    sp_earned: Number(attempt.sp_earned) || 0,
                    balance_sp: currentBalance,
                };
            }

            const completedAt = new Date();
            const timeTakenSeconds = Math.round(
                (completedAt.getTime() - new Date(attempt.started_at).getTime()) / 1000,
            );

            // Aggregate from answers in a single query
            const [agg]: { correct: string; attempted: string }[] = await this.userTestRepo.query(
                `SELECT
                    COUNT(*) FILTER (WHERE is_correct = true)  AS correct,
                    COUNT(*)                                    AS attempted
                 FROM user_test_answers
                 WHERE user_test_id = $1`,
                [userTestId],
            );

            const correctAnswers = parseInt(agg?.correct, 10) || 0;
            const questionsAttempted = parseInt(agg?.attempted, 10) || 0;

            const rewardPerQuestion = Math.max(1, parseInt(process.env.MOCK_TEST_SP_REWARD_PER_QUESTION || '1', 10));
            const spEarned = correctAnswers * rewardPerQuestion;

            await this.userTestRepo.update(
                { id: userTestId },
                {
                    status: UserTestStatus.COMPLETED,
                    completed_at: completedAt,
                    time_taken_seconds: timeTakenSeconds,
                    correct_answers: correctAnswers,
                    questions_attempted: questionsAttempted,
                    sp_earned: spEarned,
                },
            );

            // Credit SP points to user wallet
            let newBalance = 0;
            if (spEarned > 0 && attempt.user_id) {
                // Ensure user skill bank account exists
                await this.dataSource.query(
                    `INSERT INTO skill_bank_accounts (
                        id, user_id, balance_sp, total_earned_sp, total_withdrawn_sp, created_at, updated_at
                    ) VALUES (
                        gen_random_uuid(), $1, 0, 0, 0, NOW(), NOW()
                    ) ON CONFLICT (user_id) DO NOTHING;`,
                    [attempt.user_id],
                );

                // Add funds to skill bank
                const updateRes = await this.dataSource.query(
                    `UPDATE skill_bank_accounts
                     SET balance_sp = balance_sp + $1,
                         total_earned_sp = total_earned_sp + $1,
                         updated_at = NOW()
                     WHERE user_id = $2
                     RETURNING id, balance_sp;`,
                    [spEarned, attempt.user_id],
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
                            gen_random_uuid(), $1, 'mock_test_reward', $2, $3, $4, 'Mock Test Reward', NOW()
                        );`,
                        [bankId, attempt.test_id, spEarned, newBalance],
                    );
                }
            } else if (attempt.user_id) {
                const bank = await this.dataSource.query(
                    `SELECT balance_sp FROM skill_bank_accounts WHERE user_id = $1 LIMIT 1;`,
                    [attempt.user_id],
                );
                if (bank && bank.length > 0) {
                    newBalance = parseInt(bank[0].balance_sp, 10) || 0;
                }
            }

            return {
                id: userTestId,
                user_id: attempt.user_id,
                test_id: attempt.test_id,
                status: UserTestStatus.COMPLETED,
                completed_at: completedAt,
                time_taken_seconds: timeTakenSeconds,
                correct_answers: correctAnswers,
                questions_attempted: questionsAttempted,
                sp_earned: spEarned,
                balance_sp: newBalance,
            };
        } catch (error) {
            console.error('SourceError:- submitTest', error, 'userTestId', userTestId);
            return false;
        }
    }

    async getUserTestStats(userId: string): Promise<{ testsAttempted: number; accuracy: number }> {
        try {
            const resolvedUserId = await this.resolveUserUuid(userId);
            if (!resolvedUserId) {
                return { testsAttempted: 0, accuracy: 0 };
            }

            const rows: any[] = await this.dataSource.query(
                `SELECT 
                    COUNT(*)::int AS tests_attempted,
                    COALESCE(SUM(questions_attempted), 0)::int AS total_attempted,
                    COALESCE(SUM(correct_answers), 0)::int AS total_correct
                 FROM user_tests 
                 WHERE user_id = $1 AND (status = 'completed' OR questions_attempted > 0)`,
                [resolvedUserId],
            );

            const row = rows && rows[0];
            const testsAttempted = parseInt(row?.tests_attempted, 10) || 0;
            const totalAttempted = parseInt(row?.total_attempted, 10) || 0;
            const totalCorrect = parseInt(row?.total_correct, 10) || 0;
            const accuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

            return {
                testsAttempted,
                accuracy,
            };
        } catch (error) {
            console.error('SourceError:- getUserTestStats', error, 'userId', userId);
            return { testsAttempted: 0, accuracy: 0 };
        }
    }
}
