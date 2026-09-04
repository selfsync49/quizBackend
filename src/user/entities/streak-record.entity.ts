import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('streak_records')
export class StreakRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  user_id: string;

  @Column({ type: 'int', default: 0 })
  current_streak_days: number;

  @Column({ type: 'int', default: 0 })
  longest_streak_days: number;

  @Column({ type: 'date', nullable: true })
  last_active_date: Date | null;

  @Column({ type: 'smallint' })
  daily_bonus_sp: number;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}