import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UserTest, UserTestAnswer, TestQuestionOption, UserTestStatus } from '../entities';
import { DashboardRepository } from '../repositories/dashboard.repositories';

@Injectable()
export class DashboardCommand {
    constructor(
        @InjectRepository(UserTest) private readonly userTestRepo: Repository<UserTest>,
        @InjectRepository(UserTestAnswer) private readonly userTestAnswerRepo: Repository<UserTestAnswer>,
        @InjectRepository(TestQuestionOption) private readonly testQuestionOptionRepo: Repository<TestQuestionOption>,
        private readonly dashboardRepository: DashboardRepository,
        private readonly dataSource: DataSource,
    ) { }

    async createUserTestRecord(testId: string, userId: string) {
        try {
            const result = this.userTestRepo.create({
                test_id: testId,
                user_id: userId,
                status: UserTestStatus.IN_PROGRESS,
            });
            await this.userTestRepo.save(result);
            return true;
        } catch (error) {
            console.error('SourceError:- createUserTestRecord', error, 'testId', testId, 'userId', userId);
            return false;
        }
    }

    async updateUserTestRecord(testId: string, userId: string, userTestId: string, questionId: string, selectedOptionId: string) {
        try {
            const isQuestionAlreadyAnswered = await this.dashboardRepository.checkIsQuestionAlreadyAnswered(userTestId, questionId);
            const isCorrectAns = await this.dashboardRepository.checkCorrectAnswerByQuestionId(questionId, selectedOptionId);
            if (!isQuestionAlreadyAnswered) {
                await this.dataSource.transaction(async (manager) => {
                    const userTestAnswer = manager.create(UserTestAnswer, {
                        user_test_id: userTestId,
                        question_id: questionId,
                        selected_option_id: selectedOptionId,
                        is_correct: isCorrectAns,
                    });
                    await manager.save(userTestAnswer);

                    await manager
                        .createQueryBuilder()
                        .update(UserTest)
                        .set({
                            total_questions_attempted: () => 'total_questions_attempted + 1',
                            correct_answers: () => isCorrectAns ? 'correct_answers + 1' : 'correct_answers',
                        })
                        .where('id = :userTestId', { userTestId })
                        .execute();
                });
            } else {
                await this.dataSource.transaction(async (manager) => {
                    const updateResult = await manager.
                        createQueryBuilder()
                        .update(UserTestAnswer)
                        .set({
                            selected_option_id: selectedOptionId,
                            is_correct: isCorrectAns,
                        })
                        .where('user_test_id = :userTestId AND question_id = :questionId', { userTestId, questionId })
                        .execute();
                })
            }
            return true;

        } catch (error) {
            console.error('SourceError:- updateUserTestRecord', error, 'testId', testId, 'userId', userId, 'userTestId', userTestId, 'questionId', questionId, 'selectedOptionId', selectedOptionId);
            return false;
        }
    }

    async submitUserTest(
        testId: string,
        userId: string,
        userTestId: string,
        totalSPToReward: number,
        scoreAccuracy: number,
        timeTakenMin: number,
        completedAt: Date,
        isSubmitted: boolean = true) {
        try {
            const updateResult = await this.userTestRepo.update(
                { id: userTestId },
                {
                    status: UserTestStatus.COMPLETED,
                    completed_at: completedAt,
                    time_taken_seconds: Math.round(timeTakenMin),
                    score: Math.floor(scoreAccuracy),
                    sp_earned: totalSPToReward,
                    is_submitted: isSubmitted,
                },
            );
            return true;
        } catch (error) {
            console.error('SourceError:- submitUserTest', error, 'testId', testId, 'userId', userId, 'userTestId', userTestId);
            throw error;
        }
    }
}
