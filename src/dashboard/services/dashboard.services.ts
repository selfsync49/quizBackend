import { Injectable } from '@nestjs/common';
import { UserService } from 'src/user/services';
import { WalletService } from 'src/wallet/services';

@Injectable()
export class DashboardService {
    constructor(
        private readonly walletService: WalletService,
        private readonly userSerivce: UserService,
    ) { }
    async getUserDashboardInfo(userId: string) {
        try {
            let userDetailsAndStreak = await this.userSerivce.getUserDetailsForDashboard(userId);
            if (!userDetailsAndStreak.length) userDetailsAndStreak = [];

            let userWallet = await this.walletService.getUserWalletInfoByUserid(userId);
            if (!userWallet.length) userWallet = [];

            return {
                status: true,
                data: {
                    userDetailsAndStreak,
                    userWallet
                }
            }
        } catch (e) {
            console.log('SourceError:- getUserDashboardInfo', e, 'userId', userId);
            return {
                status: false,
                message: e || 'Something went wrong while fetching dashboard data.'
            }
        }
    }
}
