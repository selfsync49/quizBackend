import { Repository } from "typeorm";
import { StreakActivityLog, StreakRecord } from "../entities";
import { InjectRepository } from "@nestjs/typeorm";

export class StreakCommand {
    constructor(
        @InjectRepository(StreakRecord) private readonly streakRecordRepo: Repository<StreakRecord>,
        @InjectRepository(StreakActivityLog) private readonly streakActivityLogRepo: Repository<StreakActivityLog>,
    ) { }
    async createUserStreak(userId: string, currentStreakDays: number, longestStreakDays: number, lastActiveDate: string, dailyBonusSp: number) {
        try {
            if (!userId) throw 'User id is required.';

            const newStreak = this.streakRecordRepo.create({
                user_id: userId,
                current_streak_days: currentStreakDays,
                longest_streak_days: longestStreakDays,
                last_active_date: new Date(lastActiveDate),
                daily_bonus_sp: dailyBonusSp,
            });

            const savedStreak = await this.streakRecordRepo.save(newStreak);
            if (!savedStreak) throw 'Could not save streak record.';

            // create entry into activity log
            const log = await this.updateStreakActivityLogs(
                userId,
                new Date(lastActiveDate).toISOString(),
                dailyBonusSp,
                currentStreakDays,
            );

            if (!log) throw 'Could not save streak activity log.';
            // Using wallet service here update the user balance for skill point by 1 here.
            return savedStreak;
        } catch (error) {
            console.error('SourceError:- createUserStreak', error, 'userId', userId);
            return null;
        }
    }

    async updateStreak(
        streakId: string,
        updates: Partial<Pick<StreakRecord, 'current_streak_days' | 'longest_streak_days' | 'last_active_date' | 'daily_bonus_sp'>>,
    ) {
        try {
            if (!streakId) throw 'Streak id is required.';

            const result = await this.streakRecordRepo.update(
                { id: streakId },
                updates,
            );

            if (result.affected === 0) {
                throw 'No streak record found for id: ' + streakId;
            }

            const updatedRecord = await this.streakRecordRepo.findOneBy({ id: streakId });
            if (!updatedRecord) {
                throw 'Could not update user streak.' + streakId;
            }

            // create entry into activity log
            await this.updateStreakActivityLogs(
                updatedRecord.user_id,
                updatedRecord.last_active_date ? new Date(updatedRecord.last_active_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                updates.daily_bonus_sp ?? 0,
                updates.current_streak_days ?? null,
            );

            return updatedRecord;

        } catch (error) {
            console.error('SourceError:- updateStreak', error, 'streakId', streakId);
            return null;
        }
    }

    async updateStreakActivityLogs(
        userId: string,
        activityDate: string,
        spEarned: number,
        streakDayNumber: number | null = null,
    ) {
        try {
            if (!userId || !activityDate) throw 'User id and activity date are required.';

            const result = await this.streakActivityLogRepo.insert(
                {
                    user_id: userId,
                    activity_date: new Date(activityDate),
                    sp_earned: spEarned,
                    streak_day_number: streakDayNumber,
                },
                // conflict target
            );

            return result;

        } catch (error) {
            console.error('SourceError:- updateStreakActivityLogs', error, 'userId', userId, 'activityDate', activityDate);
            return null;
        }
    }
}