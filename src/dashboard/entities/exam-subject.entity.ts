// exam-subject.entity.ts
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('exam_subjects')
export class ExamSubject {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  exam_id: string;

  @Column({ type: 'uuid' })
  subject_id: string;

  @Column({ type: 'smallint', nullable: true })
  display_order: number | null;
}