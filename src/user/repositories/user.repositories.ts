import { InjectRepository } from "@nestjs/typeorm";
import { User } from "../entities";
import { Repository } from "typeorm";
import { userDetailsAndStreak } from "../interface";

export class UserRepository {
    constructor(
        @InjectRepository(User) private readonly userRepo: Repository<User>,
    ) { }
    async getAllUsers() {
        return this.userRepo.find();
    }

    async getUserDetailsAndStreak(userId: string): Promise<userDetailsAndStreak | []> {
        try {
            if (!userId) return [];

            const rows = this.userRepo.query(`
                SELECT
                u.id,
                u.full_name,
                u.email,
                sr.current_streak_days AS current_streak,
                sr.longest_streak_days AS longest_streak,
                sr.daily_bonus_sp,
                sr.last_active_date
                FROM users u
                LEFT JOIN streak_records sr ON u.id = sr.user_id
                WHERE u.id = $1;
        `, [userId])

            return rows ?? [];
        } catch (error) {
            console.error('SourceError:- getUserDetailsAndStreak', error, 'userId', userId);
            return [];
        }
    }
}