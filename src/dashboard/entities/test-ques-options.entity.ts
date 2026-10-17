import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('test_question_options')
export class TestQuestionOption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  question_id: string;

  @Column({ type: 'smallint' })
  order_index: number;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'boolean' })
  is_correct: boolean;
}