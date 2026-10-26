import { Injectable } from '@nestjs/common';
import { UserService } from 'src/user/services';
import { WalletService } from 'src/wallet/services';
import { DashboardRepository } from '../repositories/dashboard.repositories';
import { RedisService } from 'src/shared-svc';
import { DashboardCommand } from '../command';
import { UserSbumittedTestRecordDto, UserTestRecordDto } from '../dtos';
@Injectable()
export class DashboardService {
    constructor(
        private readonly walletService: WalletService,
        private readonly dashboardRepository: DashboardRepository,
        private readonly dashboardCommand: DashboardCommand,
        private readonly userSerivce: UserService,
        private readonly redisService: RedisService
    ) { }
    async getUserDashboardInfo(userId: string) {
        try {
            let userDetailsAndStreak = await this.userSerivce.getUserDetailsForDashboard(userId);
            if (!userDetailsAndStreak.length) userDetailsAndStreak = [];

            let userWallet = await this.walletService.getUserWalletInfoByUserid(userId);
            if (!userWallet.length) userWallet = [];

            return {
                status: true,
                data: {
                    userDetailsAndStreak,
                    userWallet
                }
            }
        } catch (e) {
            console.log('SourceError:- getUserDashboardInfo', e, 'userId', userId);
            return {
                status: false,
                message: e || 'Something went wrong while fetching dashboard data.'
            }
        }
    }

    async getExams() {
        try {
            const cachedExamsList = await this.redisService.get('exams-list');
            if (cachedExamsList) {
                return {
                    status: true,
                    data: JSON.parse(cachedExamsList)
                }
            }
            const mockTests = await this.dashboardRepository.getMockExamsList();
            if (!mockTests.length) throw 'No subjects found.';
            await this.redisService.set('exams-list', JSON.stringify(mockTests), 3600);
            return {
                status: true,
                data: mockTests
            }
        } catch (error) {
            console.error('SourceError:- getMockTests', error);
            return {
                status: false,
                message: error || 'Something went wrong while fetching mock tests.'
            }
        }
    }

    async getExamSubjects(examId: string) {
        try {
            const cachedExamsSubjectList = await this.redisService.get(`exam-subject-:${examId}`);
            if (cachedExamsSubjectList) {
                return {
                    status: true,
                    data: JSON.parse(cachedExamsSubjectList)
                }
            }

            const examSubjects = await this.dashboardRepository.getExamsSubjects(examId)
            if (!examSubjects.length) throw 'No subjects found.';

            await this.redisService.set(`exam-subject-:${examId}`, JSON.stringify(examSubjects), 3600);
            return {
                status: true,
                data: examSubjects
            }
        } catch (error) {
            console.error('SourceError:- getExamSubjects', error);
            return {
                status: false,
                message: error || 'Something went wrong while fetching subjects.'
            }
        }
    }

    async getSubjectsTopic(subjectId: string) {
        try {
            const cachedSubjectTopics = await this.redisService.get(`subject-topic-:${subjectId}`);
            if (cachedSubjectTopics) {
                return {
                    status: true,
                    data: JSON.parse(cachedSubjectTopics)
                }
            }
            const subjectTopic = await this.dashboardRepository.getSubjectTopic(subjectId);
            if (!subjectTopic.length) throw 'No topics found.';

            await this.redisService.set(`subject-topic-:${subjectId}`, JSON.stringify(subjectTopic), 3600);
            return {
                status: true,
                data: subjectTopic
            }
        } catch (error) {
            console.error('SourceError:- getSubjectsTopic', error);
            return {
                status: false,
                message: error || 'Something went wrong while fetching topics.'
            }
        }
    }

    async getTopicTests(topicId: string) {
        try {
            const cachedTopicTests = await this.redisService.get(`topic-tests-${topicId}`);
            if (cachedTopicTests) {
                return {
                    status: true,
                    data: JSON.parse(cachedTopicTests)
                }
            }
            const topicTests = await this.dashboardRepository.getTopicTests(topicId);
            if (!topicTests) throw 'No tests found for this topic';
            await this.redisService.set(`topic-tests-${topicId}`, JSON.stringify(topicTests), 3600);
            return {
                status: true,
                data: topicTests
            }

        } catch (error) {
            console.error('SourceError:- getTopicTests', error);
            return {
                status: false,
                message: error || 'Something went wrong while fetching topics.'
            }
        }
    }

    async getTestDetails(testId: string) {
        try {
            const cachedTestDetails = await this.redisService.get(`test-${testId}`);
            if(cachedTestDetails) {
                return {
                    status: true,
                    data: typeof cachedTestDetails === 'string' ? JSON.parse(cachedTestDetails) : cachedTestDetails,
                }
            }
            const testDetails = await this.dashboardRepository.getTestDetails(testId);
            if (!testDetails) throw 'No Test found';

            await this.redisService.set(`test-${testId}`, JSON.stringify(testDetails), 3600);

            return {
                status: true,
                data: testDetails
            }

        } catch (error) {
            console.error('SourceError:- getTestDetails', error);
            return {
                status: false,
                message: error || 'Something went wrong while fetching topics.'
            }
        }
    }

    // async submitUserTest(testId: string, body: UserSbumittedTestRecordDto) {
    //     try {
    //         const userTestAnswersReport = await this.dashboardRepository.getUserTestAnswers(body.userId, body.userTestId);

    //         if (!userTestAnswersReport) throw 'Test Record not found. Please try again with correct details.';
    //         if (userTestAnswersReport.is_submitted) throw 'Test has already been submitted.'

    //         const mockTestRewardPerQuestion = parseInt(process.env.MOCK_TEST_SP_REWARD_PER_QUESTION || '5');
    //         const totalSPToReward = userTestAnswersReport?.correct_answers * mockTestRewardPerQuestion;
    //         const scoreAccuracy = userTestAnswersReport?.correct_answers > 0 ?
    //             (userTestAnswersReport?.correct_answers / userTestAnswersReport?.total_questions_attempted) * 100
    //             : 0;
    //         const completedAt = new Date();
    //         const startedAt = new Date(userTestAnswersReport.started_at);
    //         const timeTakenMin = Math.floor(Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000)) / 60;

    //         const updateResult = await this.dashboardCommand.submitUserTest(
    //             testId, body.userId, body.userTestId, totalSPToReward, scoreAccuracy, timeTakenMin, completedAt
    //         )
    //         if (!updateResult) {
    //             throw 'Something went wrong while submitting test. Please try again later.';
    //         }

    //         const walletUpdateResult = await this.walletService.updateUserWallet(body.userId, totalSPToReward, 'mock_test_reward');
    //         if (!walletUpdateResult.status) {
    //             throw 'Something went wrong while updating user wallet. Please contact us.';
    //         }

    //         return {
    //             status: true,
    //             message: 'Test submitted successfully.'
    //         }
    //     } catch (error) {
    //         console.error('SourceError:- submitUserTest', error, 'testId', testId, 'body', body);
    //         throw error;
    //     }
    // }
}
