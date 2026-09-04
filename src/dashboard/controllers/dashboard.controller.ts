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
}
