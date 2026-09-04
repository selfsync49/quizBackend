import { Injectable } from '@nestjs/common';
import { WalletRepository } from '../repositories';
import { walletInfoResponseType, SkillBankAccount, SkillPointTransaction, userTransactions, walletResponse } from '../interface';

@Injectable()
export class WalletService {
    constructor(
        private readonly walletRepository: WalletRepository,
    ) { }
    async getUserWalletInfo(userId: string, limit: number, page: number): Promise<walletInfoResponseType> {
        try {
            if (!userId) return { status: false, message: 'User id is required.' };
            if (!limit) limit = 4;
            if (!page) page = 0;

            const userWalletInfoandTransaction = await this.walletRepository.getUserWalletWithTransactions(userId, limit, page);

            if (userWalletInfoandTransaction.length == 0) throw 'No Skll Bank account details found.';

            const walletInfo: SkillBankAccount[] = [{
                user_id: userWalletInfoandTransaction[0].user_id,
                balance_sp: userWalletInfoandTransaction[0].balance_sp,
                total_earned_sp: userWalletInfoandTransaction[0].total_earned_sp,
                total_withdrawn_sp: userWalletInfoandTransaction[0].total_withdrawn_sp,
                created_at: userWalletInfoandTransaction[0].wallet_created_at,
            }];
            const transactions: SkillPointTransaction[] = userWalletInfoandTransaction
                .filter((r) => r.trnx_id !== null)
                .map((r: SkillPointTransaction) => ({
                    source_type: r.source_type,
                    source_id: r.source_id,
                    amount_sp: r.amount_sp,
                    balance_after_sp: r.balance_after_sp,
                    note: r.note,
                    created_at: r.created_at,
                }));
            return {
                status: true,
                data:
                {
                    walletInfo,
                    transactions
                }

            }
        } catch (error) {
            console.error('SourceError:- getUserWalletInfo', error, 'userId', userId);
            return { status: false, message: error || 'Something went wrong while performing operation.' }

        }
    }

    async getUserTransactions(bankId: string, limit: number, page: number): Promise<userTransactions> {
        try {
            if (!bankId) return { status: false, message: 'bank id is required.' };
            if (!limit || limit == 0) limit = 4;
            if (!page || page == 0) page = 1;

            const userTransactions = await this.walletRepository.getUserTrnxByBankId(bankId, limit, page);

            if (userTransactions.length == 0) throw 'No Transaction history found.'

            return {
                status: true,
                data:
                {
                    transactions: userTransactions,
                    pagination: {
                        limit: limit,
                        page: page,
                        total: userTransactions.length
                    }
                }

            }

        } catch (error) {
            console.error('SourceError:- getUserTransactions', error, 'bankId', bankId);
            return { status: false, message: error || 'Something went wrong while performing operation.' }
        }
    }

    async getUserWalletInfoByUserid(userId: string): Promise<SkillBankAccount[]> {
        try {
            if (!userId) throw 'User id is required.';
            const walletInfo = await this.walletRepository.getUserWalletInfoByUserid(userId);
            if (!walletInfo.length) throw 'Wallet info not found.';
            return walletInfo;

        } catch (error) {
            console.error('SourceError:- getUserWalletInfoByUserid', error, 'userId', userId);
            return [];
        }

    }
}
