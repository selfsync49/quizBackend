import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { DashboardService } from '../services/dashboard.services';
import type { UserTestRecordDto } from '../dtos/dashboard.dtos';
@Controller('dashboard')
export class DashboardController {
    constructor(
        private readonly dashboardService: DashboardService
    ) { }

    @Get(':userId')
    async getUserDashboardInfo(@Param('userId') userId: string) {
        return await this.dashboardService.getUserDashboardInfo(userId);
    }
    @Get('mock-tests/categories')
    async getMockTestCategories() {
        return await this.dashboardService.getMockTestCategories();
    }

    @Get('mock-tests/:categoryId')
    async getMockTestSubjects(@Param('categoryId') categoryId: string) {
        return await this.dashboardService.getMockTestSubjects(categoryId);
    }

    @Get('subject-tests/:subjectId')
    async getSubjectTests(@Param('subjectId') subjectId: string) {
        return await this.dashboardService.getSubjectTests(subjectId);
    }

    @Get('test-questions/:testId')
    async getTestQuestions(@Param('testId')TestId: string) {
        return await this.dashboardService.getTestQuestions(TestId);
    }

    @Post('create-test/:testId/user/:userId')
    async createUserTestRecord(@Param('testId') testId: string, @Param('userId') userId: string) {
        return await this.dashboardService.createUserTestRecord(testId, userId);
    }

    @Patch('update-test/:testId')
    async updateUserTestRecord(
        @Param('testId') testId: string, 
        @Body() body: UserTestRecordDto
    ) {
        return await this.dashboardService.updateUserTestRecord(testId, body);
    }
}