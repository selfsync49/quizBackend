import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

export enum SpSourceType {
  // TODO: fill in actual values from your `sp_source_type` Postgres enum
  QUIZ_COMPLETION = 'quiz_completion',
  REFERRAL = 'referral',
  WITHDRAWAL = 'withdrawal',
  ADMIN_ADJUSTMENT = 'admin_adjustment',
}

@Entity('skill_point_transactions')
export class SkillPointTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  skill_bank_id: string;

  @Column({
    type: 'enum',
    enum: SpSourceType,
    enumName: 'sp_source_type', // must match the actual Postgres enum type name
  })
  source_type: SpSourceType;

  @Column({ type: 'uuid', nullable: true })
  source_id: string | null;

  @Column({
    type: 'bigint',
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseInt(value, 10),
    },
  })
  amount_sp: number;

  @Column({
    type: 'bigint',
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseInt(value, 10),
    },
  })
  balance_after_sp: number;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}