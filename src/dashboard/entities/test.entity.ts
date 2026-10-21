// test.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum TestScope {
  EXAM = 'exam',
  SUBJECT = 'subject',
  TOPIC = 'topic',
}

@Entity('tests')
export class Test {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: TestScope, enumName: 'test_scope' })
  scope: TestScope;

  @Column({ type: 'uuid' })
  exam_id: string;

  @Column({ type: 'uuid', nullable: true })
  subject_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  topic_id: string | null;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'int' })
  time_minutes: number;

  @Column({ type: 'int' })
  total_questions: number;

  @Column({ type: 'numeric', precision: 2, scale: 1, nullable: true })
  rating: string | null; // numeric comes back from pg as a string

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
