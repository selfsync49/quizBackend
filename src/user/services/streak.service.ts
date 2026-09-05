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

    async createUserStreak(userId: string) {
        try {
            if (!userId) return null;

            const userStreakRecord = await this.streakRepository.getValidateStreakRecord(userId);
            const toDateOnly = (d: Date | string): string => new Date(d).toISOString().split('T')[0];

            if (userStreakRecord && userStreakRecord.length > 0) {
                const record = userStreakRecord[0];
                const streakId = record.id;

                const lastActiveDayStr = record.last_active_date ? toDateOnly(record.last_active_date) : null;
                const now = new Date();
                const todayStr = toDateOnly(now);
                const yesterdayStr = toDateOnly(new Date(now.getTime() - 86_400_000));

                const isToday = lastActiveDayStr === todayStr;
                const isYesterday = lastActiveDayStr === yesterdayStr;

                if (isToday) {
                    // already checked in today — no-op
                    return { message: 'Streak already recorded for today.' };
                }

                let currentStreak: number;
                let newLongest: number;

                if (isYesterday) {
                    currentStreak = record.current_streak_days + 1;
                    newLongest = Math.max(currentStreak, record.longest_streak_days);
                } else {
                    // streak broken — older than yesterday, or never active
                    currentStreak = 1;
                    newLongest = record.longest_streak_days;
                }

                const streakIncrement = this.streakUtils.calculateUserPointsForStreak(currentStreak);

                await this.streakCommand.updateStreak(streakId, {
                    current_streak_days: currentStreak,
                    longest_streak_days: newLongest,
                    last_active_date: new Date(todayStr),
                    daily_bonus_sp: streakIncrement,
                });

                if (streakIncrement) {
                    const updateStreakAmount = await this.walletCommand.updateUserBankBalance(
                        userId,
                        streakIncrement,
                        'streak_bonus',
                    );
                    if (!updateStreakAmount) throw 'Could not update user wallet amount';
                }

            } else {
                await this.streakCommand.createUserStreak(userId, 1, 1, new Date().toISOString().split('T')[0], 1);
                await this.walletCommand.updateUserBankBalance(userId, 1, 'streak_bonus');
            }

            return { message: 'Streak record processed successfully.' };

        } catch (error) {
            console.error('SourceError:- createUserStreak', error, 'userId', userId);
            return null;
        }
    }
}
