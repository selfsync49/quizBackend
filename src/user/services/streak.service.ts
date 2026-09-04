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
            if (userStreakRecord.length) {
                const lastActiveDay = userStreakRecord[0].last_active_date;
                const currentDate = new Date();
                const yesterday = new Date(currentDate.getTime() - 86_400_000);
                const isYesterday =
                    lastActiveDay instanceof Date &&
                    lastActiveDay.toDateString() === yesterday.toDateString();
                if (isYesterday) {
                    return;
                }

            }

        } catch (error) {
            console.error('SourceError:- createUserStreak', error, 'userId', userId);
            return [];
        }
    }
}

// Check if user has already an ongoing streak 

// For checking query the streak Record repo 

// if already present check the last active date if it's yesterday date then increment the counter for streak

// then create a record on streak activity log 

// if not then create a new record for streak activity then create or replace record on streaRecords 

// now after all this just increae the wallet amount by amount since the user logged in 

