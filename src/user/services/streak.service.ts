import { Injectable } from '@nestjs/common';
import { StreakRepository } from '../repositories/streak.repositories';
import { UserRepository } from '../repositories/user.repositories';
import { StreakCommand } from '../commands';
import { StreakUtils } from '../utils';
import { WalletCommand } from 'src/wallet/commands';

// Indian Standard Time (IST is UTC+05:30) helper functions
export function getIndianDateString(d: Date | string = new Date()): string {
    if (typeof d === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
        return new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(new Date(d));
    }
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(d);
}

export function getIndianYesterdayString(todayIstStr: string): string {
    const [year, month, day] = todayIstStr.split('-').map(Number);
    const todayDate = new Date(Date.UTC(year, month - 1, day));
    const yesterdayDate = new Date(todayDate.getTime() - 86_400_000);
    return yesterdayDate.toISOString().slice(0, 10);
}

@Injectable()
export class StreakService {
    constructor(
        private readonly streakRepository: StreakRepository,
        private readonly streakCommand: StreakCommand,
        private readonly streakUtils: StreakUtils,
        private readonly walletCommand: WalletCommand,
        private readonly userRepository: UserRepository,
    ) { }

    async resolveUserId(identifier: string): Promise<string | null> {
        if (!identifier) return null;

        // If it's a JWT token, decode payload
        if (identifier && identifier.split('.').length === 3) {
            try {
                const decoded: any = JSON.parse(Buffer.from(identifier.split('.')[1], 'base64').toString('utf8'));
                if (decoded && decoded.sub) {
                    return this.resolveUserId(decoded.sub);
                }
            } catch (_) {}
        }

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
        if (isUuid) {
            try {
                const existing = await this.userRepository.query(
                    `SELECT id FROM users WHERE id = $1 LIMIT 1;`,
                    [identifier]
                );
                if (existing && existing.length > 0) return existing[0].id;
            } catch (_) {}
            return identifier;
        }

        try {
            const found = await this.userRepository.query(
                `SELECT id FROM users WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1) LIMIT 1;`,
                [identifier]
            );
            if (found && found.length > 0) {
                return found[0].id;
            }

            if (identifier.includes('@')) {
                const cleanEmail = identifier.toLowerCase().trim();
                const username = cleanEmail.split('@')[0].replace(/[^a-z0-9_]/gi, '') || 'user';
                const created = await this.userRepository.query(
                    `INSERT INTO users (email, full_name, username) VALUES ($1, $2, $3) RETURNING id;`,
                    [cleanEmail, 'Gyaanzo User', username]
                );
                if (created && created.length > 0) return created[0].id;
            }

            // Fallback: If only 1 user exists or for single-user dev testing
            const latest = await this.userRepository.query(
                `SELECT id FROM users ORDER BY created_at DESC LIMIT 1;`
            );
            if (latest && latest.length > 0) {
                return latest[0].id;
            }
        } catch (e) {
            console.error('SourceError:- resolveUserId', e, identifier);
        }
        return null;
    }

    async getUserStreak(userId: string) {
        try {
            if (!userId) return null;
            const targetUserId = await this.resolveUserId(userId);
            if (!targetUserId) return null;

            const streakRecord = await this.streakRepository.getUserStreak(targetUserId);
            if (!streakRecord || streakRecord.length === 0) return null;

            const record = streakRecord[0];
            const todayStr = getIndianDateString();
            const yesterdayStr = getIndianYesterdayString(todayStr);
            const lastActiveDayStr = record.last_active_date ? getIndianDateString(record.last_active_date) : null;

            let isBroken = false;
            let displayStreakDays = record.current_streak_days;
            if (lastActiveDayStr && lastActiveDayStr !== todayStr && lastActiveDayStr !== yesterdayStr) {
                isBroken = true;
                displayStreakDays = 0;
            }

            return {
                ...record,
                current_streak_days: record.current_streak_days,
                display_streak_days: displayStreakDays,
                is_recorded_today: lastActiveDayStr === todayStr,
                is_broken: isBroken,
                last_active_date: lastActiveDayStr,
            };
        } catch (error) {
            console.error('SourceError:- getUserStreak', error, 'userId', userId);
            return null;
        }
    }

    async getUserStreakWithLogs(userId: string) {
        try {
            if (!userId) return { streakDetails: null, activityLogs: [] };
            const targetUserId = await this.resolveUserId(userId);
            if (!targetUserId) return { streakDetails: null, activityLogs: [] };

            const streakDetailsWithLogs = await this.streakRepository.getUserStreakwithLogs(targetUserId);
            if (!streakDetailsWithLogs || streakDetailsWithLogs.length === 0) {
                const basic = await this.streakRepository.getUserStreak(targetUserId);
                if (basic && basic.length > 0) {
                    const todayStr = getIndianDateString();
                    const lastActive = basic[0].last_active_date ? getIndianDateString(basic[0].last_active_date) : null;
                    return {
                        streakDetails: {
                            user_id: basic[0].user_id,
                            current_streak_days: basic[0].current_streak_days,
                            longest_streak_days: basic[0].longest_streak_days,
                            last_active_date: lastActive,
                            is_recorded_today: lastActive === todayStr,
                        },
                        activityLogs: [],
                    };
                }
                return { streakDetails: null, activityLogs: [] };
            }

            const todayStr = getIndianDateString();
            const rawLastActive = streakDetailsWithLogs[0].sr_last_active_date;
            const lastActiveDayStr = rawLastActive ? getIndianDateString(rawLastActive) : null;

            const streakDetails = {
                user_id: streakDetailsWithLogs[0].sr_user_id,
                current_streak_days: streakDetailsWithLogs[0].sr_current_streak_days,
                longest_streak_days: streakDetailsWithLogs[0].sr_longest_streak_days,
                last_active_date: lastActiveDayStr,
                is_recorded_today: lastActiveDayStr === todayStr,
            };

            const activityLogs = streakDetailsWithLogs
                .filter(log => log.sal_activity_date != null)
                .map(log => ({
                    activity_date: getIndianDateString(log.sal_activity_date),
                    sp_earned: log.sal_sp_earned,
                    streak_day_number: log.sal_streak_day_number,
                }));

            return {
                streakDetails,
                activityLogs,
            };
        } catch (error) {
            console.error('SourceError:- getUserStreakWithLogs', error, 'userId', userId);
            return { streakDetails: null, activityLogs: [] };
        }
    }

    async createUserStreak(userId: string) {
        try {
            if (!userId) return null;
            const targetUserId = await this.resolveUserId(userId);
            if (!targetUserId) {
                console.error('createUserStreak: Could not resolve target user for', userId);
                return null;
            }

            const todayStr = getIndianDateString();
            const yesterdayStr = getIndianYesterdayString(todayStr);

            const userStreakRecord = await this.streakRepository.getValidateStreakRecord(targetUserId);
            const record = userStreakRecord?.[0];

            if (!record) {
                await this.streakCommand.createUserStreak(targetUserId, 1, 1, todayStr, 1);
                await this.walletCommand.updateUserBankBalance(targetUserId, 1, 'streak_bonus');
                return {
                    message: 'Streak record processed successfully.',
                    current_streak_days: 1,
                    longest_streak_days: 1,
                    is_new_today: true,
                    daily_bonus_sp: 1,
                    last_active_date: todayStr,
                };
            }

            const lastActiveDayStr = record.last_active_date ? getIndianDateString(record.last_active_date) : null;

            if (lastActiveDayStr === todayStr) {
                return {
                    message: 'Streak already recorded for today.',
                    current_streak_days: record.current_streak_days,
                    longest_streak_days: record.longest_streak_days,
                    is_new_today: false,
                    daily_bonus_sp: 0,
                    last_active_date: lastActiveDayStr,
                };
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
                await this.walletCommand.updateUserBankBalance(
                    targetUserId,
                    streakIncrement,
                    'streak_bonus',
                );
            }

            return {
                message: 'Streak record processed successfully.',
                current_streak_days: currentStreakDays,
                longest_streak_days: longestStreakDays,
                is_new_today: true,
                daily_bonus_sp: streakIncrement,
                last_active_date: todayStr,
            };
        } catch (error) {
            console.error('SourceError:- createUserStreak', error, 'userId', userId);
            return null;
        }
    }
}
