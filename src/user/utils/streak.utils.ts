export class StreakUtils {

    calculateUserPointsForStreak(currentStreak: number): number {
        if (currentStreak > 0 && currentStreak <= 7) {
            return 1;
        } else if (currentStreak <= 14 && currentStreak > 7) {
            return 2
        } else if (currentStreak > 14 && currentStreak <= 21) {
            return 3
        } else if (currentStreak <= 28 && currentStreak > 21) {
            return 5
        } else if (currentStreak > 28 && (currentStreak <= 30 || currentStreak <= 31)) {
            return 7
        }
        return 1;
    }
}