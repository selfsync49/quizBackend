import { Injectable } from '@nestjs/common';
import { QuizRepository } from '../repositories/quiz.repository';
import { QuizCommand } from '../commands/quiz.command';
import { RedisService } from 'src/shared-svc';
import { SubmitQuizAttemptDto } from '../dtos/quiz.dtos';

@Injectable()
export class QuizService {
    constructor(
        private readonly quizRepository: QuizRepository,
        private readonly quizCommand: QuizCommand,
        private readonly redisService: RedisService,
    ) { }

    async getTodaysQuizzes() {
        try {
            const cacheKey = `quizzes-today-${new Date().toISOString().slice(0, 10)}`;
            const cached = await this.redisService.get(cacheKey);
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        return { status: true, data: parsed };
                    }
                } catch (_) {}
            }

            const quizzes = await this.quizRepository.getTodaysQuizzes();
            if (!quizzes.length) throw 'No quizzes scheduled for today.';

            // Cache until end of day (~remaining seconds in the day)
            const now = new Date();
            const secondsUntilMidnight = (86400 - (now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds()));
            await this.redisService.set(cacheKey, JSON.stringify(quizzes), secondsUntilMidnight);

            return { status: true, data: quizzes };
        } catch (error) {
            console.error('SourceError:- getTodaysQuizzes', error);
            return { status: false, message: error || 'Something went wrong while fetching today\'s quizzes.' };
        }
    }

    async getQuizWithQuestions(quizId: string) {
        try {
            const cacheKey = `quiz-questions-${quizId}`;
            const cached = await this.redisService.get(cacheKey);
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    if (parsed?.questions?.length > 0 && parsed.questions[0].options?.length > 0) {
                        return { status: true, data: parsed };
                    }
                } catch (_) {}
            }

            const quiz = await this.quizRepository.getQuizById(quizId);
            if (!quiz) throw 'Quiz not found.';

            const questions = await this.quizRepository.getQuizQuestions(quizId);

            const data = { ...quiz, questions };
            await this.redisService.set(cacheKey, JSON.stringify(data), 3600);

            return { status: true, data };
        } catch (error) {
            console.error('SourceError:- getQuizWithQuestions', error, 'quizId', quizId);
            return { status: false, message: error || 'Something went wrong while fetching quiz details.' };
        }
    }

    async submitQuizAttempt(dto: SubmitQuizAttemptDto) {
        return await this.quizCommand.submitQuizAttempt(dto);
    }

    async getUserQuizStatus(userId: string) {
        return await this.quizCommand.getUserQuizStatus(userId);
    }
}
