import { Controller, Get, Param } from '@nestjs/common';
import { DashboardService } from '../services/dashboard.services';

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
}