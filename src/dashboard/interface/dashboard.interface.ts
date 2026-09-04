import { userDetailsAndStreak } from "../../user/interface";
import { walletResponse } from "../../wallet/interface";

export type dashboardResponseType = {
    status: boolean,
    data?: {
        userDetailsAndStreak: userDetailsAndStreak,
        userWallet: walletResponse,
    },
    message?: string
}