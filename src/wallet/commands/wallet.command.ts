import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { SkillBankAccount, SkillPointTransaction } from "../entities";
import { Repository } from "typeorm";
import { WalletRepository } from "../repositories";

@Injectable()
export class WalletCommand {
    constructor(
        @InjectRepository(SkillBankAccount) private readonly skillBankRepo: Repository<SkillBankAccount>,
        @InjectRepository(SkillPointTransaction) private readonly skillBankTxnRepo: Repository<SkillPointTransaction>,
        private readonly walletRepo: WalletRepository
    ) { }

    async createUserBankAccount(userId: string, amount: number) {
        try {
            if (!userId || amount < 0 || !amount) throw 'UserId and amount is required';

            const newBankAccount = this.skillBankRepo.create({
                user_id: userId,
                balance_sp: amount,
                total_earned_sp: amount,
                total_withdrawn_sp: 0,
            });

            const savedAccount = await this.skillBankRepo.save(newBankAccount);
            return savedAccount;

        } catch (error) {
            console.error('SourceError:- createUserBankAccount', error, 'userId', userId);
            return null;
        }
    }
    async addFundsToSkillBank(userId: string, amount: number) {
        try {
            if (!userId || amount < 0 || !amount) throw 'UserId and amount is required';
            const result = await this.skillBankRepo
                .createQueryBuilder()
                .update(SkillBankAccount)
                .set({
                    balance_sp: () => `balance_sp + ${amount}`,
                    total_earned_sp: () => `total_earned_sp + ${amount}`,
                })
                .where('user_id = :userId', { userId })
                .execute();

            if (result.affected == 0) throw `No account found for userId:${userId}`;
            // fetch the updated account
            return result;
        } catch (error) {
            console.log('SourceError WalletCommand:- addFundsToSkillBank', error, 'userId', userId, 'amount', amount);
            return null;
        }
    }

    async addTxnToSkillBank(
        amount: number,
        skillBankId: string,
        sourceType: string,
        balanceAfterSp: number,
        note?: string,
        sourceId?: string,
    ) {
        try {
            if (!skillBankId || !amount || !sourceType || balanceAfterSp === undefined || balanceAfterSp === null) {
                throw 'Required fields are missing.';
            }

            const newTxn = this.skillBankTxnRepo.create({
                skill_bank_id: skillBankId,
                source_type: sourceType as any, // create enum for this as well check entitty
                source_id: sourceId ?? null,
                amount_sp: amount,
                balance_after_sp: balanceAfterSp,
                note: note ?? null,
            });

            const savedTxn = await this.skillBankTxnRepo.save(newTxn);
            return savedTxn;

        } catch (error) {
            console.error('SourceError:- addTxnToSkillBank', error, 'skillBankId', skillBankId);
            return null;
        }
    }

    async updateUserBankBalance(userId: string, amount: number, sourceType: string) {
        try {
            const checkUserBankValidation = await this.walletRepo.getUserWalletInfoByUserid(userId);
            if (checkUserBankValidation.length == 0) {
                await this.createUserBankAccount(userId, amount);
            } else {
                await this.addFundsToSkillBank(userId, amount);
            }
            const updatedAccount = await this.skillBankRepo.findOneBy({ user_id: userId });
            if (!updatedAccount) throw 'Unable to fetch user bank account';

            await this.addTxnToSkillBank(
                amount,
                updatedAccount.id,
                sourceType,
                updatedAccount.balance_sp,
                'Skill Bank Wallet Addition',
                userId,
            );
            return updatedAccount;
        } catch (error) {
            console.log('SourceError WalletCommand:- updateUserBankBalance', error, 'userId', userId, 'amount', amount);
            return null;
        }
    }
}
