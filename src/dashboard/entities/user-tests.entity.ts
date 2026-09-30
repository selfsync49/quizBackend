import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum UserTestStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

@Entity('user_tests')
export class UserTest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  test_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({
    type: 'enum',
    enum: UserTestStatus,
    enumName: 'user_test_status',
    default: UserTestStatus.IN_PROGRESS,
  })
  status: UserTestStatus;

  @Column({ type: 'int', nullable: true })
  score: number | null;

  @Column({ type: 'bigint', default: 0 })
  sp_earned: number;

  @Column({ type: 'int', nullable: true })
  time_taken_seconds: number | null;

  @Column({ type: 'int', default: 0 })
  total_questions_attempted: number;

  @Column({ type: 'int', default: 0 })
  correct_answers: number;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  started_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completed_at: Date | null;
}