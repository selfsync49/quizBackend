import { Controller, Get, Param } from '@nestjs/common';
import { QuizService } from '../services/quiz.service';

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

    // GET /quiz/:quizId/questions
    // Returns a quiz along with its ordered questions
    @Get(':quizId/questions')
    async getQuizWithQuestions(@Param('quizId') quizId: string) {
        return await this.quizService.getQuizWithQuestions(quizId);
    }
}
