export type userDetailsAndStreak = [{
    id: string,
    full_name: string,
    email: string,
    current_streak: number,
    longest_streak: number,
    daily_bonus_sp: number,
    last_active_date: Date,
}]

export type userDetailsAndStreakResponse = {
    status?: boolean,
    data?: userDetailsAndStreak | [],
    message?: string,
}

export type userStreakRecordResponse = {
    status?: boolean,
    data?: any[];
    message?: string,
}