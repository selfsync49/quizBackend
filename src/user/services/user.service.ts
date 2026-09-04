import { Injectable } from '@nestjs/common';
import { UserRepository } from '../repositories/user.repositories';
import { userDetailsAndStreak, userDetailsAndStreakResponse } from '../interface';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
  ) { }

  async getAllUsers() {
    return this.userRepository.getAllUsers();
  }

  async getUserDetailsForDashboard(userId: string): Promise<userDetailsAndStreak | []> {
    try {
      if (!userId) throw 'User id is required.';

      const data: userDetailsAndStreak | [] = await this.userRepository.getUserDetailsAndStreak(userId);
      if (!data) throw 'User not found.';
      return data;

    } catch (error) {
      console.error('SourceError:- getUserDetailsForDashboard', error, 'userId', userId);
      return []
    }
  }
}
