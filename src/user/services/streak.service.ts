import { Injectable } from '@nestjs/common';
import { UserRepository } from '../repositories/user.repositories';
import { StreakRepository } from '../repositories/streak.repositories';

@Injectable()
export class StreakService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly streakRepository: StreakRepository,
    ) { }
    async getUserStreak(userId: string) {
        try {
            if (!userId) return [];
            const streakRecord = await this.streakRepository.getUserStreak(userId);
            if (streakRecord.length === 0) return [];
            return streakRecord[0];
        } catch (error) {
            console.error('SourceError:- getUserStreak', error, 'userId', userId);
            return [];
        }
    }

    async createUserStreak(userId: string, streakId: string, date: string) {
        try {
            if (!userId || !streakId || !date) return null;
            const userStreakRecord = await this.streakRepository.getValidateStreakRecord(userId, streakId);

            if (userStreakRecord.length > 0) {
                const record = userStreakRecord[0];
                const lastActiveDay = record.last_active_date ? new Date(record.last_active_date) : null;

                const currentDate = new Date();
                const today = new Date(currentDate.toDateString());
                const yesterday = new Date(today.getTime() - 86_400_000);

                const isToday = lastActiveDay && lastActiveDay.toDateString() === today.toDateString();
                const isYesterday = lastActiveDay && lastActiveDay.toDateString() === yesterday.toDateString();
                if (isYesterday) {
                    const newStreak = record.current_streak_days + 1;
                    const newLongest = Math.max(newStreak, record.longest_streak_days);
                    await this.streakRepository.updateStreak(streakId, {
                        current_streak_days: newStreak,
                        longest_streak_days: newLongest,
                        last_active_date: today,
                    });
                } else if (!isToday) {
                    // covers both "older than yesterday" and "lastActiveDay is null"
                    await this.streakRepository.updateStreak(streakId, {
                        current_streak_days: 1,
                        longest_streak_days: record.longest_streak_days,
                        last_active_date: today,
                    });
                }

            } else {
                await this.streakRepository.createUserStreak(userId, 1, 1, new Date().toISOString().split('T')[0], 0);
            }

            return { message: 'Streak record processed successfully.' };

        } catch (error) {
            console.error('SourceError:- createUserStreak', error, 'userId', userId);
            return null;
        }
    }
}

// Check if user has already an ongoing streak 

// For checking query the streak Record repo 

// if already present check the last active date if it's yesterday date then increment the counter for streak

// then create a record on streak activity log 

// if not then create a new record for streak activity then create or replace record on streaRecords 

// now after all this just increae the wallet amount by amount since the user logged in 

