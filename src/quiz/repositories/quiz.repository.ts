import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quiz } from '../entities/quiz.entity';
import { Question } from '../entities/question.entity';

@Injectable()
export class QuizRepository {
    constructor(
        @InjectRepository(Quiz) private readonly quizRepo: Repository<Quiz>,
        @InjectRepository(Question) private readonly questionRepo: Repository<Question>,
    ) { }

    // Returns today's published quizzes (scheduled_at falls within today UTC)
    async getTodaysQuizzes() {
        try {
            const startOfDay = new Date();
            startOfDay.setUTCHours(0, 0, 0, 0);

            const endOfDay = new Date();
            endOfDay.setUTCHours(23, 59, 59, 999);

            const quizzes = await this.quizRepo
                .createQueryBuilder('quiz')
                .where('quiz.is_published = true')
                .andWhere('quiz.scheduled_at >= :startOfDay', { startOfDay })
                .andWhere('quiz.scheduled_at <= :endOfDay', { endOfDay })
                .orderBy('quiz.scheduled_at', 'ASC')
                .getMany();

            return quizzes;
        } catch (error) {
            console.error('SourceError:- getTodaysQuizzes', error);
            return [];
        }
    }

    // Returns a single quiz by id
    async getQuizById(quizId: string) {
        try {
            return await this.quizRepo.findOne({ where: { id: quizId } });
        } catch (error) {
            console.error('SourceError:- getQuizById', error, 'quizId', quizId);
            return null;
        }
    }

    // Returns all questions for a quiz, ordered by order_index
    async getQuizQuestions(quizId: string) {
        try {
            return await this.questionRepo.find({
                where: { quiz_id: quizId },
                order: { order_index: 'ASC' },
            });
        } catch (error) {
            console.error('SourceError:- getQuizQuestions', error, 'quizId', quizId);
            return [];
        }
    }
}
