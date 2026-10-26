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

    // Creates a new in_progress user_test record when a user starts a test.
    // Guards against duplicate open attempts (unique_open_attempt partial index).
    async createUserTest(userId: string, testId: string) {
        try {
            const existing = await this.userTestRepo.findOne({
                where: { user_id: userId, test_id: testId, status: UserTestStatus.IN_PROGRESS },
            });
            if (existing) return existing;

            const record = this.userTestRepo.create({
                user_id: userId,
                test_id: testId,
                status: UserTestStatus.IN_PROGRESS,
            });
            return await this.userTestRepo.save(record);
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
    //   - Sets status → COMPLETED, sp_earned = 0 (to be updated later)
    async submitTest(userTestId: string) {
        try {
            const attempt = await this.userTestRepo.findOne({ where: { id: userTestId } });
            if (!attempt) throw new Error(`UserTest ${userTestId} not found.`);
            if (attempt.status === UserTestStatus.COMPLETED) throw new Error('Test already submitted.');

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

            await this.userTestRepo.update(
                { id: userTestId },
                {
                    status: UserTestStatus.COMPLETED,
                    completed_at: completedAt,
                    time_taken_seconds: timeTakenSeconds,
                    correct_answers: parseInt(agg.correct, 10),
                    questions_attempted: parseInt(agg.attempted, 10),
                    sp_earned: 0,
                },
            );
            return true;
        } catch (error) {
            console.error('SourceError:- submitTest', error, 'userTestId', userTestId);
            return false;
        }
    }
}
