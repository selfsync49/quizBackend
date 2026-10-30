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

    // Returns today's published quizzes (or all published daily quizzes)
    async getTodaysQuizzes() {
        try {
            const startOfDay = new Date();
            startOfDay.setUTCHours(0, 0, 0, 0);

            const endOfDay = new Date();
            endOfDay.setUTCHours(23, 59, 59, 999);

            let quizzes = await this.quizRepo
                .createQueryBuilder('quiz')
                .where('quiz.is_published = true')
                .andWhere('quiz.scheduled_at >= :startOfDay', { startOfDay })
                .andWhere('quiz.scheduled_at <= :endOfDay', { endOfDay })
                .orderBy('quiz.scheduled_at', 'ASC')
                .getMany();

            if (!quizzes.length) {
                // If none specifically scheduled for today, return all published quizzes
                quizzes = await this.quizRepo
                    .createQueryBuilder('quiz')
                    .where('quiz.is_published = true')
                    .orderBy('quiz.created_at', 'ASC')
                    .getMany();
            }

            return quizzes;
        } catch (error) {
            console.error('SourceError:- getTodaysQuizzes', error);
            return [];
        }
    }

    // Returns a single quiz by id
    async getQuizById(quizId: string) {
        try {
            const quiz = await this.quizRepo.findOne({ where: { id: quizId } });
            if (quiz) return quiz;
            // Fallback: return first available published quiz
            return await this.quizRepo.findOne({ where: { is_published: true } });
        } catch (error) {
            console.error('SourceError:- getQuizById', error, 'quizId', quizId);
            return null;
        }
    }

    // Returns all questions for a quiz with their options, ordered by order_index
    async getQuizQuestions(quizId: string) {
        try {
            let questions = await this.questionRepo.query(`
                SELECT 
                    q.id,
                    q.quiz_id,
                    q.order_index,
                    q.body,
                    q.question_type,
                    q.sp_correct,
                    q.sp_wrong,
                    q.explanation,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'id', qo.id,
                                'body', qo.body,
                                'order_index', qo.order_index,
                                'is_correct', qo.is_correct
                            ) ORDER BY qo.order_index ASC
                        ) FILTER (WHERE qo.id IS NOT NULL), '[]'
                    ) AS options
                FROM questions q
                LEFT JOIN question_options qo ON qo.question_id = q.id
                WHERE q.quiz_id = $1
                GROUP BY q.id, q.quiz_id, q.order_index, q.body, q.question_type, q.sp_correct, q.sp_wrong, q.explanation
                ORDER BY q.order_index ASC NULLS LAST;
            `, [quizId]);

            if (!questions || !questions.length) {
                // Fallback to all available questions with options in database
                questions = await this.questionRepo.query(`
                    SELECT 
                        q.id,
                        q.quiz_id,
                        q.order_index,
                        q.body,
                        q.question_type,
                        q.sp_correct,
                        q.sp_wrong,
                        q.explanation,
                        COALESCE(
                            json_agg(
                                json_build_object(
                                    'id', qo.id,
                                    'body', qo.body,
                                    'order_index', qo.order_index,
                                    'is_correct', qo.is_correct
                                ) ORDER BY qo.order_index ASC
                            ) FILTER (WHERE qo.id IS NOT NULL), '[]'
                        ) AS options
                    FROM questions q
                    LEFT JOIN question_options qo ON qo.question_id = q.id
                    GROUP BY q.id, q.quiz_id, q.order_index, q.body, q.question_type, q.sp_correct, q.sp_wrong, q.explanation
                    ORDER BY q.order_index ASC NULLS LAST
                    LIMIT 10;
                `);
            }

            return questions;
        } catch (error) {
            console.error('SourceError:- getQuizQuestions', error, 'quizId', quizId);
            return [];
        }
    }
}
