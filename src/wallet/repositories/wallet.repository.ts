import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SkillBankAccount, SkillPointTransaction, WithdrawalRequest } from "../entities";

export class WalletRepository {
    constructor(
        @InjectRepository(SkillBankAccount) private readonly bankRepo: Repository<SkillBankAccount>,
        @InjectRepository(SkillPointTransaction) private readonly trnxRepo: Repository<SkillPointTransaction>,
        @InjectRepository(WithdrawalRequest) private readonly withdrawalRepo: Repository<WithdrawalRequest>,
    ) { }

    async getAllTrnx() {
        return 'Working on';
    }

    async getUserWalletInfoByUserid(userId: string): Promise<SkillBankAccount[]> {
        try {
            const userWalletInfo: SkillBankAccount[] = await this.bankRepo.find(
                {
                    where:
                    {
                        user_id: userId
                    }
                }
            )

            return userWalletInfo
        } catch (error) {
            console.log('SourceError WalletRepo:- getUserWalletInfoByUserid', error, 'userId', userId);
            return []
        }
    }

    async getUserTrnxByBankId(bankId: string, limit: number, page: number): Promise<SkillPointTransaction[]> {
        try {
            const userTrxn: SkillPointTransaction[] = await this.trnxRepo.find(
                {
                    where:
                    {
                        skill_bank_id: bankId
                    },
                    skip: (page - 1) * limit,
                    take: limit,
                    order: {
                        created_at: 'DESC'
                    }
                }
            )

            return userTrxn;
        } catch (error) {
            console.log('SourceError WalletRepo:- getUserTrnxByBankId', error, 'bankId', bankId);
            return []
        }
    }

    async getUserWalletWithTransactions(userId: string, limit: number, page: number) {
        try {
            const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            let targetUserId = userId;

            if (!UUID_REGEX.test(userId)) {
                // If not a UUID, check if it's an email or username in users table
                const users = await this.bankRepo.query(
                    `SELECT id FROM users WHERE LOWER(email) = LOWER($1) OR username = $1 LIMIT 1;`,
                    [userId],
                );
                if (users && users.length > 0) {
                    targetUserId = users[0].id;
                } else {
                    return [];
                }
            }

            const rows = await this.bankRepo.query(
                `
                SELECT
                w.id,
                w.user_id,
                w.balance_sp,
                w.total_earned_sp,
                w.total_withdrawn_sp,
                w.created_at AS wallet_created_at,
                t.id AS trnx_id,
                t.source_type,
                t.source_id,
                t.amount_sp,
                t.balance_after_sp,
                t.note,
                t.created_at AS trnx_created_at
                FROM skill_bank_accounts w
                LEFT JOIN skill_point_transactions t ON t.skill_bank_id = w.id
                WHERE w.user_id = $1
                ORDER BY t.created_at DESC
                LIMIT $2 OFFSET $3
                `,
                [targetUserId, limit, page * limit],
            );
            return rows;
        } catch (error) {
            console.error('SourceError WalletRepo:- getUserWalletWithTransactions', error, 'userId', userId);
            return [];
        }
    }
}