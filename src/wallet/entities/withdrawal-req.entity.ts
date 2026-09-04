import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

export enum WithdrawalStatus {
  // TODO: fill in actual values from your `withdrawal_status` Postgres enum
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REJECTED = 'rejected',
}

@Entity('withdrawal_requests')
export class WithdrawalRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'uuid' })
  skill_bank_id: string;

  @Column({
    type: 'bigint',
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseInt(value, 10),
    },
  })
  amount_sp: number;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  amount_inr: string; // 'numeric' returns as string by default to avoid float precision loss

  @Column({ type: 'varchar', nullable: true })
  bank_account_number: string | null;

  @Column({ type: 'varchar', nullable: true })
  ifsc_code: string | null;

  @Column({ type: 'varchar', unique: true, nullable: true })
  razorpay_payout_id: string | null;

  @Column({
    type: 'enum',
    enum: WithdrawalStatus,
    enumName: 'withdrawal_status',
  })
  status: WithdrawalStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  requested_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  processed_at: Date | null;

  @Column({ type: 'text', nullable: true })
  failure_reason: string | null;
}