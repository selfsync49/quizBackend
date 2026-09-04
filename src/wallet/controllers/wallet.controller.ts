import { Controller, Get, Param, Query } from '@nestjs/common';
import { WalletService } from '../services';

@Controller('wallet')
export class WalletController {
    constructor(
        private readonly walletService: WalletService,
    ) { }

    @Get('info/:userId')
    async getUserWalletInfo(
        @Query('limit') limit: number,
        @Query('page') page: number,
        @Param('userId') userId: string) {
        return this.walletService.getUserWalletInfo(userId, limit, page);
    }

    @Get('transactions/:bankId')
    async getUserTransactions(
        @Param('bankId') bankId: string,
        @Query('limit') limit: number,
        @Query('page') page: number,
    ) {
        return this.walletService.getUserTransactions(bankId, limit, page);
    }
}
