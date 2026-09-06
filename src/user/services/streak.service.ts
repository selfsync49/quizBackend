import { Injectable } from '@nestjs/common';
import { StreakRepository } from '../repositories/streak.repositories';
import { StreakCommand } from '../commands';
import { StreakUtils } from '../utils';
import { WalletCommand } from 'src/wallet/commands';
@Injectable()
export class StreakService {
    constructor(
        private readonly streakRepository: StreakRepository,
        private readonly streakCommand: StreakCommand,
        private readonly streakUtils: StreakUtils,
        private readonly walletCommand: WalletCommand
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


    async getUserStreakWithLogs(userId: string) {
        try {
            if (!userId) return [];
            const streakDetailsWithLogs = await this.streakRepository.getUserStreakwithLogs(userId);
            if (!streakDetailsWithLogs || streakDetailsWithLogs.length === 0) return [];
            const response = {};
            const streakDetails = {
                "user_id":streakDetailsWithLogs[0].sr_user_id,
                "current_streak_days":streakDetailsWithLogs[0].sr_current_streak_days,
                "longest_streak_days":streakDetailsWithLogs[0].sr_longest_streak_days,
                "last_active_date":streakDetailsWithLogs[0].sr_last_active_date
            }

            const activityLogs = streakDetailsWithLogs.map(log => {
                return {
                    "activity_date": log.sal_activity_date,
                    "sp_earned": log.sal_sp_earned,
                    "streak_day_number": log.sal_streak_day_number
                }
            })

            return {
                "streakDetails": streakDetails,
                "activityLogs": activityLogs
            };
        } catch (error) {
            console.error('SourceError:- getUserStreakWithLogs', error, 'userId', userId);
            return [];
        }
    }

    async createUserStreak(userId: string) {
        try {
            if (!userId) return null;

            const toDateOnly = (d: Date | string): string => new Date(d).toISOString().slice(0, 10);
            const today = new Date();
            const todayStr = toDateOnly(today);
            const yesterdayStr = toDateOnly(new Date(today.getTime() - 86_400_000));

            const userStreakRecord = await this.streakRepository.getValidateStreakRecord(userId);
            const record = userStreakRecord?.[0];

            if (!record) {
                await this.streakCommand.createUserStreak(userId, 1, 1, todayStr, 1);
                await this.walletCommand.updateUserBankBalance(userId, 1, 'streak_bonus');
                return { message: 'Streak record processed successfully.' };
            }

            const lastActiveDayStr = record.last_active_date ? toDateOnly(record.last_active_date) : null;

            if (lastActiveDayStr === todayStr) {
                return { message: 'Streak already recorded for today.' };
            }

            const isYesterday = lastActiveDayStr === yesterdayStr;
            const currentStreakDays = isYesterday ? record.current_streak_days + 1 : 1;
            const longestStreakDays = isYesterday
                ? Math.max(currentStreakDays, record.longest_streak_days)
                : record.longest_streak_days;
            const streakIncrement = this.streakUtils.calculateUserPointsForStreak(currentStreakDays);

            const updatedStreak = await this.streakCommand.updateStreak(record.id, {
                current_streak_days: currentStreakDays,
                longest_streak_days: longestStreakDays,
                last_active_date: new Date(todayStr),
                daily_bonus_sp: streakIncrement,
            });

            if (!updatedStreak) return null;

            if (streakIncrement > 0) {
                const updatedWallet = await this.walletCommand.updateUserBankBalance(
                    userId,
                    streakIncrement,
                    'streak_bonus',
                );

                if (!updatedWallet) throw new Error('Could not update user wallet amount');
            }

            return { message: 'Streak record processed successfully.' };
        } catch (error) {
            console.error('SourceError:- createUserStreak', error, 'userId', userId);
            return null;
        }
    }
}
