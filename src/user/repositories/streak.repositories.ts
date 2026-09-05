import { InjectRepository } from "@nestjs/typeorm";
import { StreakRecord, StreakActivityLog } from "../entities";
import { Repository } from "typeorm";

export class StreakRepository {
    constructor(
        @InjectRepository(StreakRecord) private readonly streakRecordRepo: Repository<StreakRecord>,
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