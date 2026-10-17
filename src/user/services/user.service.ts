import { Injectable, OnModuleInit } from '@nestjs/common';
import { UserRepository } from '../repositories/user.repositories';
import { userDetailsAndStreak, userDetailsAndStreakResponse } from '../interface';

@Injectable()
export class UserService implements OnModuleInit {
  constructor(
    private readonly userRepository: UserRepository,
  ) { }

  async onModuleInit() {
    await this.userRepository.ensureProfileColumnsExist();
  }

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

  async checkUsername(username: string): Promise<{ available: boolean; username: string; message: string }> {
    const clean = (username || '').toLowerCase().trim();
    if (!clean || clean.length < 3) {
      return { available: false, username: clean, message: 'Username must be at least 3 characters' };
    }
    if (!/^[a-z0-9_]+$/.test(clean)) {
      return { available: false, username: clean, message: 'Only lowercase letters, numbers, and underscores allowed' };
    }
    const available = await this.userRepository.checkUsernameAvailable(clean);
    return {
      available,
      username: clean,
      message: available ? 'Username is available' : 'Username is already taken',
    };
  }

  async setupProfile(data: {
    userId?: string;
    email?: string;
    username: string;
    fullName: string;
    phone: string;
    targetExam: string;
    qualification: string;
    preferredLanguage: string;
    bio?: string;
  }) {
    const cleanUsername = (data.username || '').toLowerCase().trim();
    const payload = {
      ...data,
      username: cleanUsername,
    };

    // Actually store in database!
    const saved = await this.userRepository.saveOrUpdateUser(payload);

    return {
      statusCode: 200,
      message: 'Profile setup completed successfully and stored in database',
      savedToDb: !!saved,
      user: saved,
      data: payload,
    };
  }

  async getDatabaseExams() {
    try {
      // 1. Get all public tables
      const tablesRaw: any[] = await this.userRepository.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `);
      const tableNames: string[] = tablesRaw.map((t) => t.table_name);

      const response: Record<string, any> = {
        all_tables: tableNames,
        exams_data: {},
      };

      // 2. Query any exam, test, subject, or category tables
      const candidateTables = [
        'users',
        'exams',
        'mock_test_categories',
        'categories',
        'subjects',
        'tests',
        'mock_tests',
        'subject_tests',
        'mock_exam_subjects',
      ];

      for (const t of candidateTables) {
        if (tableNames.includes(t)) {
          try {
            const rows = await this.userRepository.query(`SELECT * FROM ${t} LIMIT 50;`);
            response.exams_data[t] = rows;
          } catch (e: any) {
            response.exams_data[t] = `Error reading ${t}: ${e.message}`;
          }
        }
      }

      // Check if Bank PO and Bank Clerk exist, if not seed them
      if (tableNames.includes('mock_test_categories')) {
        const existing: any[] = response.exams_data['mock_test_categories'] || [];
        const existingNames = existing.map((c) => c.name);

        const newExams = [
          { name: 'Bank PO', short_name: 'BANK PO', description: 'IBPS PO, SBI PO, RRB Officer Scale I' },
          { name: 'Bank Clerk', short_name: 'BANK CLERK', description: 'IBPS Clerk, SBI Clerk, RRB Office Assistant' },
          { name: 'Railways RRB', short_name: 'RAILWAYS', description: 'RRB NTPC, Group D, ALP' },
          { name: 'UPSC / State PSC', short_name: 'UPSC', description: 'Civil Services Examination' },
          { name: 'Defense (NDA/CDS)', short_name: 'DEFENSE', description: 'NDA, CDS, AFCAT' },
          { name: 'Teaching (CTET)', short_name: 'TEACHING', description: 'CTET, State TET & KVS' },
        ];

        for (const e of newExams) {
          if (!existingNames.includes(e.name)) {
            await this.userRepository.query(`
              INSERT INTO mock_test_categories (id, name, short_name, description, created_at, updated_at)
              VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
              ON CONFLICT DO NOTHING;
            `, [e.name, e.short_name, e.description]);
          }
        }

        // Re-fetch updated categories
        response.exams_data['mock_test_categories'] = await this.userRepository.query(
          `SELECT id, name, short_name, description FROM mock_test_categories ORDER BY name;`
        );
      }

      // Ensure user profile columns exist in users table
      await this.userRepository.ensureProfileColumnsExist();
      const userCols = await this.userRepository.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users';
      `);
      response['user_columns'] = userCols;

      console.log('=== DATABASE EXAMS INSPECTION ===', JSON.stringify(response, null, 2));
      return response;
    } catch (e: any) {
      console.error('getDatabaseExams error:', e);
      return { error: e.message || String(e) };
    }
  }

  async getDiscussions(category?: string, sort?: string) {
    return this.userRepository.getDiscussions(category, sort);
  }

  async createDiscussion(data: {
    userId?: string;
    authorName: string;
    authorHandle?: string;
    authorBadge?: string;
    authorAvatar?: string;
    isAnonymous?: boolean;
    category?: string;
    title?: string;
    content: string;
    imageUrl?: string;
    attachmentUrl?: string;
    attachmentType?: 'image' | 'video' | 'pdf';
    attachmentName?: string;
    attachments?: any[];
  }) {
    return this.userRepository.createDiscussion(data);
  }

  async voteDiscussion(id: string, delta: number) {
    return this.userRepository.voteDiscussion(id, delta);
  }
}
