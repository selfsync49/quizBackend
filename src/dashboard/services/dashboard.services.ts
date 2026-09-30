import { Injectable } from '@nestjs/common';
import { UserService } from 'src/user/services';
import { WalletService } from 'src/wallet/services';
import { DashboardRepository } from '../repositories/dashboard.repositories';
import { RedisService } from 'src/shared-svc';
import { DashboardCommand } from '../command';
import { UserTestRecordDto } from '../dtos';
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

    async getMockTestCategories() {
        try {
            const cachedMockTestCategories = await this.redisService.get('mock-test-categories');
            if (cachedMockTestCategories) {
                return {
                    status: true,
                    data: JSON.parse(cachedMockTestCategories)
                }
            }
            const mockTests = await this.dashboardRepository.getMockTestCategories();
            if (!mockTests.length) throw 'No mock tests found.';
            await this.redisService.set('mock-test-categories', JSON.stringify(mockTests), 3600);
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

    async getMockTestSubjects(categoryId: string) {
        try {
            const cachedMockTestSubjects = await this.redisService.get(`mock-test-subjects:${categoryId}`);
            if (cachedMockTestSubjects) {
                return {
                    status: true,
                    data: JSON.parse(cachedMockTestSubjects)
                }
            }

            const mockTestSubjects = await this.dashboardRepository.getMockTestSubjectsByCategoryId(categoryId);

            if (!mockTestSubjects.length) throw 'No mock test subjects found.';

            await this.redisService.set(`mock-test-subjects:${categoryId}`, JSON.stringify(mockTestSubjects), 3600);

            return {
                status: true,
                data: mockTestSubjects
            }
        } catch (error) {
            console.error('SourceError:- getMockTestSubjects', error, 'categoryId', categoryId);
            return {
                status: false,
                message: error || 'Something went wrong while fetching mock test subjects.'
            }
        }
    }

    async getSubjectTests(subjectId: string) {
        try {
            const cachedSubjectTests = await this.redisService.get(`subject-tests:${subjectId}`);
            if (cachedSubjectTests) {
                return {
                    status: true,
                    data: JSON.parse(cachedSubjectTests)
                }
            }
            const subjectTests = await this.dashboardRepository.getSubjectTestsBySubjectId(subjectId);
            if (!subjectTests.length) throw 'No subject tests found.';
            await this.redisService.set(`subject-tests:${subjectId}`, JSON.stringify(subjectTests), 3600);
            return {
                status: true,
                data: subjectTests
            }
        } catch (error) {
            console.error('SourceError:- getSubjectTests', error, 'subjectId', subjectId);
            return {
                status: false,
                message: error || 'Something went wrong while fetching subject tests.'
            }
        }
    }

    async getTestQuestions(testId: string) {
        try {
            const cachedTestQuestions = await this.redisService.get(`test-questions:${testId}`);
            if (cachedTestQuestions) {
                return {
                    status: true,
                    data: JSON.parse(cachedTestQuestions)
                }
            }
            const testQuestions = await this.dashboardRepository.getTestQuestionsByTestId(testId);
            if (!testQuestions.length) throw 'No test questions found.';
            await this.redisService.set(`test-questions:${testId}`, JSON.stringify(testQuestions), 3600);
            return {
                status: true,
                data: testQuestions
            }
        } catch (error) {
            console.error('SourceError:- getTestQuestions', error, 'testId', testId);
            return {
                status: false,
                message: error || 'Something went wrong while fetching test questions.'
            }
        }
    }

    async createUserTestRecord(testId: string, userId: string) {
        try {
            const result = await this.dashboardCommand.createUserTestRecord(testId, userId);
            if (!result) throw 'Something went wrong while starting test. Please try again later.';
        } catch (error) {
            console.error('SourceError:- createUserTestRecord', error, 'testId', testId, 'userId', userId);
            throw error;
        }
    }

    async updateUserTestRecord(testId: string, body: UserTestRecordDto) {
        try{
            const {userId, userTestId, questionId, selectedOptionId} = body;
            const result = await this.dashboardCommand.updateUserTestRecord(testId, userId, userTestId, questionId, selectedOptionId);
            if (!result) throw 'Something went wrong while updating test record. Please try again later.';
        } catch (error) {
            console.error('SourceError:- updateUserTestRecord', error, 'testId', testId, 'body', body);
            throw error;
        }
    }
}
