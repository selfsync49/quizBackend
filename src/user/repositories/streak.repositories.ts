import { InjectRepository } from "@nestjs/typeorm";
import { StreakRecord, StreakActivityLog } from "../entities";
import { Repository } from "typeorm";

export class StreakRepository {
    constructor(
        @InjectRepository(StreakRecord) private readonly streakRecordRepo: Repository<StreakRecord>,
        @InjectRepository(StreakActivityLog) private readonly streakActivityRepo: Repository<StreakActivityLog>,) { }

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

    async getUserStreakwithLogs(userId: string) {
        try {
            if (!userId) throw 'User id is required.';
            const streakRecord = await this.streakRecordRepo
                .createQueryBuilder('sr')
                .leftJoinAndSelect(
                    'streak_activity_logs',
                    'sal',
                    'sal.user_id = sr.user_id'
                )
                .where('sr.user_id = :userId', { userId })
                .orderBy('sal.activity_date', 'DESC')
                .getRawMany();
            if (streakRecord.length === 0) return [];
            return streakRecord;
        } catch (error) {
            console.error('SourceError:- getUserStreakwithLogs', error, 'userId', userId);
            return [];
        }
    }

    async getValidateStreakRecord(userId: string) {
        try {
            if (!userId) throw 'User id and streak id are required.';
            const streakRecord = await this.streakRecordRepo.find(
                {
                    where: {
                        user_id: userId,
                    }
                }
            )
            if (streakRecord.length === 0) return [];
            return streakRecord;

        } catch (error) {
            console.error('SourceError:- getValidateStreakRecord', error, 'userId', userId);
            return [];
        }
    }
}