import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    Unique,
    Index,
} from 'typeorm';

@Entity('streak_activity_logs')
@Unique(['user_id', 'activity_date'])
@Index(['user_id', 'activity_date'])
export class StreakActivityLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    user_id: string;

    @Column({ type: 'date' })
    activity_date: Date;

    @Column({ type: 'smallint', default: 0 })
    sp_earned: number;

    @Column({ type: 'int', nullable: true })
    streak_day_number: number | null;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;
}