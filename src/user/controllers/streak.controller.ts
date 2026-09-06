import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { StreakService } from "../services/streak.service";

@Controller('streak')
export class StreakController {
    constructor(
        private readonly streakService: StreakService
    ) { }

    @Get(':userId')
    async getUserStreak(@Param('userId') userId: string) {
        return this.streakService.getUserStreak(userId);
    }

    @Post()
    async createUserStreak(@Body() body: { userId: string; }) {
        return this.streakService.createUserStreak(body.userId);
    }

    @Get('logs/:userId')
    async getUserStreakWithLogs(@Param('userId') userId: string) {
        return this.streakService.getUserStreakWithLogs(userId);
    }
}