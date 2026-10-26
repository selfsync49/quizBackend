// question.entity.ts
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Unique,
} from 'typeorm';
import { Quiz } from './quiz.entity';

@Entity('questions')
@Unique('questions_quiz_id_order_index_key', ['quiz_id', 'order_index'])
export class Question {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    quiz_id: string;

    @Column({ type: 'smallint', nullable: true })
    order_index: number | null;

    @Column({ type: 'text' })
    body: string;

    @Column({ type: 'text', nullable: true })
    question_type: string | null;

    // Positive SP rewarded for a correct answer (enforced > 0 in DB)
    @Column({ type: 'int' })
    sp_correct: number;

    // Negative SP penalty for a wrong answer (enforced <= 0 in DB)
    @Column({ type: 'int' })
    sp_wrong: number;

    @Column({ type: 'text', nullable: true })
    explanation: string | null;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;

    // Relations
    @ManyToOne(() => Quiz, (quiz) => quiz.questions, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'quiz_id' })
    quiz: Quiz;
}
