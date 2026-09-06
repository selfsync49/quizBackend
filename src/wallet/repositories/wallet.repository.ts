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
        const rows = await this.bankRepo.query(
            `
            SELECT
            w.user_id,
            w.balance_sp,
            w.total_earned_sp,
            w.total_withdrawn_sp,
            t.id AS trnx_id,
            t.source_type,
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
            [userId, limit, page * limit],
        );
        return rows;
    }
}