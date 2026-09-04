import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('skill_bank_accounts')
export class SkillBankAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  user_id: string;

  @Column({ type: 'bigint', default: 0 })
  balance_sp: number;

  @Column({ type: 'bigint', default: 0 })
  total_earned_sp: number;

  @Column({ type: 'bigint', default: 0 })
  total_withdrawn_sp: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}