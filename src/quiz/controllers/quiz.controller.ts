import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { QuizService } from '../services/quiz.service';
import { SubmitQuizAttemptDto } from '../dtos/quiz.dtos';

@Controller('quiz')
export class QuizController {
    constructor(
        private readonly quizService: QuizService
    ) { }

    // GET /quiz/today
    // Returns all published quizzes scheduled for today
    @Get('today')
    async getTodaysQuizzes() {
        return await this.quizService.getTodaysQuizzes();
    }

    // GET /quiz/user-status/:userId
    // Returns user's completed quizzes for today so they cannot re-play
    @Get('user-status/:userId')
    async getUserQuizStatus(@Param('userId') userId: string) {
        return await this.quizService.getUserQuizStatus(userId);
    }

    // GET /quiz/:quizId/questions
    // Returns a quiz along with its ordered questions
    @Get(':quizId/questions')
    async getQuizWithQuestions(@Param('quizId') quizId: string) {
        return await this.quizService.getQuizWithQuestions(quizId);
    }

    // POST /quiz/submit
    // Submits quiz results, prevents re-attempts, and credits SP to wallet
    @Post('submit')
    async submitQuizAttempt(@Body() dto: SubmitQuizAttemptDto) {
        return await this.quizService.submitQuizAttempt(dto);
    }
}
