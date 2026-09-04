import { InjectRepository } from "@nestjs/typeorm";
import { StreakRecord, StreakActivityLog } from "../entities";
import { Repository } from "typeorm";

export class StreakRepository {
    constructor(
        @InjectRepository(StreakRecord) private readonly streakRecordRepo: Repository<StreakRecord>,
        @InjectRepository(StreakActivityLog) private readonly streakActivityLogRepo: Repository<StreakActivityLog>,
    ) { }

    async getUserStreak(userId: string) {
        try {
            if (!userId) throw 'User id is required.';
            const streakRecord = await this.streakRecordRepo.find(
                {
                    where: {
                        user_id: userId
                    }
                }
            )
            if (streakRecord.length === 0) return [];
            return streakRecord;

        } catch (error) {
            console.error('SourceError:- getUserStreak', error, 'userId', userId);
            return [];
        }

    }

    async getValidateStreakRecord(userId: string, streakId: string) {
        try {
            if (!userId || !streakId) throw 'User id and streak id are required.';
            const streakRecord = await this.streakRecordRepo.find(
                {
                    where: {
                        user_id: userId,
                        id: streakId,
                    }
                }
            )
            if (streakRecord.length === 0) return [];
            return streakRecord;

        } catch (error) {
            console.error('SourceError:- getValidateStreakRecord', error, 'userId', userId, 'streakId', streakId);
            return [];
        }
    }

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
            await this.updateStreakActivityLogs(
                userId,
                new Date(lastActiveDate).toISOString(),
                dailyBonusSp,
                currentStreakDays,
            );
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
                updatedRecord.last_active_date?.toISOString().split('T')[0] ?? new Date().toISOString().split('T')[0],
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

            const result = await this.streakActivityLogRepo.upsert(
                {
                    user_id: userId,
                    activity_date: new Date(activityDate),
                    sp_earned: spEarned,
                    streak_day_number: streakDayNumber,
                },
                ['user_id', 'activity_date'], // conflict target
            );

            const log = await this.streakActivityLogRepo.findOneBy({
                user_id: userId,
                activity_date: new Date(activityDate),
            });

            return result;

        } catch (error) {
            console.error('SourceError:- updateStreakActivityLogs', error, 'userId', userId, 'activityDate', activityDate);
            return null;
        }
    }

}