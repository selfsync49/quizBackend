// test-question.entity.ts
import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('test_questions')
export class TestQuestion {
  @PrimaryColumn({ type: 'uuid' })
  test_id: string;

  @PrimaryColumn({ type: 'uuid' })
  question_id: string;

  @Column({ type: 'smallint' })
  order_index: number;
}