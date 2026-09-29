import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TestType {
  FULL_LENGTH = 'full_length',
  SECTIONAL = 'sectional',
  PREVIOUS_YEAR = 'previous_year',
}

@Entity('subject_tests')
export class SubjectTest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  subject_id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: TestType,
    enumName: 'test_type',
    default: TestType.FULL_LENGTH,
  })
  test_type: TestType;

  @Column({ type: 'int' })
  time_minutes: number;

  @Column({ type: 'int' })
  total_questions: number;

  @Column({ type: 'numeric', precision: 2, scale: 1, nullable: true })
  rating: string | null; // numeric returns as string, same reasoning as amount_inr

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
