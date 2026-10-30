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

            const testStats = await this.dashboardCommand.getUserTestStats(userId);

            return {
                status: true,
                data: {
                    userDetailsAndStreak,
                    userWallet,
                    testStats,
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

    async getExamTests(examId: string) {
        try {
            const cached = await this.redisService.get(`exam-tests-${examId}`);
            if (cached) {
                return {
                    status: true,
                    data: JSON.parse(cached),
                };
            }
            const tests = await this.dashboardRepository.getExamTests(examId);
            await this.redisService.set(`exam-tests-${examId}`, JSON.stringify(tests), 3600);
            return {
                status: true,
                data: tests,
            };
        } catch (error) {
            console.error('SourceError:- getExamTests', error);
            return {
                status: true,
                data: [],
            };
        }
    }

    async getSubjectTests(subjectId: string) {
        try {
            const cached = await this.redisService.get(`subject-tests-${subjectId}`);
            if (cached) {
                return {
                    status: true,
                    data: JSON.parse(cached),
                };
            }
            const tests = await this.dashboardRepository.getSubjectTests(subjectId);
            await this.redisService.set(`subject-tests-${subjectId}`, JSON.stringify(tests), 3600);
            return {
                status: true,
                data: tests,
            };
        } catch (error) {
            console.error('SourceError:- getSubjectTests', error);
            return {
                status: true,
                data: [],
            };
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

    async startTest(userId: string, testId: string, restart: boolean = false) {
        try {
            if (!userId || !testId) throw 'userId and testId are required.';

            const userTest = await this.dashboardCommand.createUserTest(userId, testId, restart);
            if (!userTest) throw 'Could not start the test. Please try again.';

            return {
                status: true,
                data: userTest,
            };
        } catch (error) {
            console.error('SourceError:- startTest', error, 'userId', userId, 'testId', testId);
            return {
                status: false,
                message: error || 'Something went wrong while starting the test.',
            };
        }
    }

    async submitAnswer(userTestId: string, questionId: string, selectedOptionId: string) {
        try {
            if (!userTestId || !questionId || !selectedOptionId) {
                throw 'userTestId, questionId and selectedOptionId are required.';
            }

            // Resolve whether the selected option is correct
            const isCorrect = await this.dashboardRepository.checkIsCorrectOption(selectedOptionId);

            const saved = await this.dashboardCommand.upsertAnswer(userTestId, questionId, selectedOptionId, isCorrect);
            if (!saved) throw 'Could not save the answer. Please try again.';

            return {
                status: true,
                data: { isCorrect },
                message: 'Answer saved.',
            };
        } catch (error) {
            console.error('SourceError:- submitAnswer', error, 'userTestId', userTestId, 'questionId', questionId);
            return {
                status: false,
                message: error || 'Something went wrong while saving the answer.',
            };
        }
    }

    async submitTest(userTestId: string) {
        try {
            if (!userTestId) throw 'userTestId is required.';

            const result = await this.dashboardCommand.submitTest(userTestId);
            if (!result) throw 'Could not submit the test. Please try again.';

            return {
                status: true,
                data: typeof result === 'object' ? result : { userTestId },
                message: 'Test submitted successfully.',
            };
        } catch (error) {
            console.error('SourceError:- submitTest', error, 'userTestId', userTestId);
            return {
                status: false,
                message: error || 'Something went wrong while submitting the test.',
            };
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

    async flagQuestion(userId: string, testId: string, questionId: string, description?: string) {
        try {
            if (!userId || !testId || !questionId) throw 'userId, testId and questionId are required.';

            const saved = await this.dashboardCommand.flagQuestion(userId, testId, questionId, description);
            if (!saved) throw 'Could not submit the report. Please try again.';

            return { status: true, message: 'Question reported successfully.' };
        } catch (error) {
            console.error('SourceError:- flagQuestion', error, 'userId', userId, 'questionId', questionId);
            return { status: false, message: error || 'Something went wrong while reporting the question.' };
        }
    }
}
