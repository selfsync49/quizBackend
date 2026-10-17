import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('user_test_answers')
export class UserTestAnswer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_test_id: string;

  @Column({ type: 'uuid' })
  question_id: string;

  @Column({ type: 'uuid', nullable: true })
  selected_option_id: string | null;

  @Column({ type: 'boolean', default: false })
  is_correct: boolean;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  answered_at: Date;
}