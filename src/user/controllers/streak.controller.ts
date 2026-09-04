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
    async createUserStreak(@Body() body: { userId: string; streakId: string; date: string }) {
        return this.streakService.createUserStreak(body.userId, body.streakId, body.date);
    }
}