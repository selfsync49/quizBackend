export type walletInfoResponseType = {
    status: boolean;
    data?:
    {
        walletInfo: SkillBankAccount[],
        transactions: SkillPointTransaction[]
    }
    ;
    message?: string;
}

export type userTransactions = {
    status: boolean;
    data?:
    {
        transactions: SkillPointTransaction[],
        pagination: {
            limit: number;
            page: number;
            total: number;
        }
    }

    message?: string;
};

export type walletResponse = {
    status: boolean;
    data?:
    {
        walletInfo: SkillBankAccount[]
    }

    message?: string;
}

export type SkillBankAccount = {
    id?: string;
    user_id: string;
    balance_sp: number;
    total_earned_sp: number;
    total_withdrawn_sp: number;
    created_at?: Date;
    updated_at?: Date;
}

export type SkillPointTransaction = {
    id?: string;
    skill_bank_id: string;
    source_type: string;
    source_id: string | null;
    amount_sp: number;
    balance_after_sp: number;
    note: string | null;
    created_at: Date;
}

export type WithdrawalRequest = {

}