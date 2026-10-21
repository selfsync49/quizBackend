// quiz.entity.ts
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    OneToMany,
} from 'typeorm';
import { Question } from './question.entity';

export enum QuizType {
    DAILY = 'daily',
    WEEKLY = 'weekly',
    SPECIAL = 'special',
}

@Entity('quizzes')
export class Quiz {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        type: 'enum',
        enum: QuizType,
        enumName: 'quiz_type',
        nullable: true,
    })
    quiz_type: QuizType | null;

    @Column({ type: 'varchar', length: 255 })
    title: string;

    @Column({ type: 'text', nullable: true })
    subject: string | null;

    @Column({ type: 'timestamptz', nullable: true })
    scheduled_at: Date | null;

    @Column({ type: 'int', default: 600 })
    duration_seconds: number;

    @Column({ type: 'boolean', default: false })
    risk_boost_available: boolean;

    @Column({ type: 'boolean', default: false })
    is_published: boolean;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;

    // Relations
    @OneToMany(() => Question, (question) => question.quiz)
    questions: Question[];
}
