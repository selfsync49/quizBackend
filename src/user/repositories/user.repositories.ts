import { InjectRepository } from "@nestjs/typeorm";
import { User } from "../entities";
import { Repository } from "typeorm";
import { userDetailsAndStreak } from "../interface";

export class UserRepository {
    constructor(
        @InjectRepository(User) private readonly userRepo: Repository<User>,
    ) { }
    async getAllUsers() {
        return this.userRepo.find();
    }

    async getUserDetailsAndStreak(userId: string): Promise<userDetailsAndStreak | []> {
        try {
            if (!userId) return [];

            const rows = this.userRepo.query(`
                SELECT
                u.id,
                u.full_name,
                u.email,
                sr.current_streak_days AS current_streak,
                sr.longest_streak_days AS longest_streak,
                sr.last_active_date
                FROM users u
                LEFT JOIN streak_records sr ON u.id = sr.user_id
                WHERE u.id = $1;
        `, [userId])

            return rows ?? [];
        } catch (error) {
            console.error('SourceError:- getUserDetailsAndStreak', error, 'userId', userId);
            return [];
        }
    }

    async checkUsernameAvailable(username: string): Promise<boolean> {
        try {
            const count = await this.userRepo.count({
                where: { username: username.toLowerCase().trim() },
            });
            return count === 0;
        } catch (error) {
            console.error('SourceError:- checkUsernameAvailable', error);
            // Default to true if table is migrating or error
            return true;
        }
    }

    async query(sql: string, params: any[] = []) {
        return this.userRepo.query(sql, params);
    }

    async ensureProfileColumnsExist() {
        try {
            await this.userRepo.query(`
                ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(255);
                ALTER TABLE users ADD COLUMN IF NOT EXISTS target_exam VARCHAR(255);
                ALTER TABLE users ADD COLUMN IF NOT EXISTS qualification VARCHAR(255);
                ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(50);
                ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
                ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
                ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
                ALTER TABLE users ALTER COLUMN phone DROP DEFAULT;
                ALTER TABLE users ALTER COLUMN phone SET DEFAULT NULL;
            `);
        } catch (e) {
            console.error('ensureProfileColumnsExist note:', e);
        }
    }

    async saveOrUpdateUser(data: {
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
        await this.ensureProfileColumnsExist();

        try {
            let user = await this.userRepo.findOne({
                where: data.email ? [{ email: data.email }, { username: data.username }] : [{ username: data.username }],
            });

            if (user) {
                user.username = data.username;
                user.full_name = data.fullName;
                user.phone = data.phone;
                user.target_exam = data.targetExam;
                user.qualification = data.qualification;
                user.preferred_language = data.preferredLanguage;
                if (data.bio !== undefined) user.bio = data.bio;
                const saved = await this.userRepo.save(user);
                console.log('✅ User profile updated in DB:', saved.id, saved.username, saved.target_exam);
                return saved;
            } else {
                user = this.userRepo.create({
                    email: data.email || `${data.username}@gyaanzo.com`,
                    username: data.username,
                    full_name: data.fullName,
                    phone: data.phone,
                    target_exam: data.targetExam,
                    qualification: data.qualification,
                    preferred_language: data.preferredLanguage,
                    bio: data.bio || '',
                });
                const saved = await this.userRepo.save(user);
                console.log('✅ New user created with profile in DB:', saved.id, saved.username, saved.target_exam);
                return saved;
            }
        } catch (error) {
            console.error('SourceError:- saveOrUpdateUser', error);
            // Fallback raw SQL update if entity mapping issue
            try {
                if (data.email) {
                    await this.userRepo.query(`
                        UPDATE users 
                        SET username = $1, full_name = $2, phone = $3, target_exam = $4, qualification = $5, preferred_language = $6, bio = $7
                        WHERE email = $8;
                    `, [data.username, data.fullName, data.phone, data.targetExam, data.qualification, data.preferredLanguage, data.bio || '', data.email]);
                    console.log('✅ User profile updated via SQL fallback:', data.email);
                }
            } catch (rawErr) {
                console.error('Raw fallback error:', rawErr);
            }
            return null;
        }
    }

    async ensureDiscussionsTable(): Promise<void> {
        try {
            await this.userRepo.query(`
                CREATE TABLE IF NOT EXISTS discussions (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id UUID NULL,
                    author_name VARCHAR(255) NOT NULL,
                    author_handle VARCHAR(255) NULL,
                    author_badge VARCHAR(50) DEFAULT 'S1',
                    author_avatar TEXT NULL,
                    is_anonymous BOOLEAN DEFAULT FALSE,
                    category VARCHAR(100) DEFAULT 'General',
                    title VARCHAR(255) DEFAULT '',
                    content TEXT NOT NULL,
                    image_url TEXT NULL,
                    attachment_url TEXT NULL,
                    attachment_type VARCHAR(50) NULL,
                    attachment_name VARCHAR(255) NULL,
                    attachments JSONB DEFAULT '[]'::jsonb,
                    upvotes INT DEFAULT 1,
                    downvotes INT DEFAULT 0,
                    comments_count INT DEFAULT 0,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                );
            `);

            // Ensure columns exist if table was already created
            await this.userRepo.query(`
                ALTER TABLE discussions ADD COLUMN IF NOT EXISTS attachment_url TEXT;
                ALTER TABLE discussions ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(50);
                ALTER TABLE discussions ADD COLUMN IF NOT EXISTS attachment_name VARCHAR(255);
                ALTER TABLE discussions ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
            `);

            // Clean up any old dummy seed posts so only real user posts are displayed
            await this.userRepo.query(`
                DELETE FROM discussions 
                WHERE author_name IN ('rs', 'Sneha Verma', 'Amit Kumar')
                   OR author_handle IN ('@rs_aspirant', '@sneha_banker', '@amit_bank');
            `);
        } catch (e) {
            console.error('ensureDiscussionsTable error:', e);
        }
    }

    async getDiscussions(category?: string, sort?: string) {
        await this.ensureDiscussionsTable();
        try {
            let sql = `
                SELECT 
                    d.id,
                    d.user_id,
                    d.author_name,
                    d.author_handle,
                    d.author_badge,
                    d.author_avatar,
                    d.is_anonymous,
                    d.category,
                    d.title,
                    d.content,
                    d.image_url,
                    d.attachment_url,
                    d.attachment_type,
                    d.attachment_name,
                    d.attachments,
                    d.upvotes,
                    d.downvotes,
                    d.comments_count,
                    d.created_at
                FROM discussions d
                WHERE 1=1
            `;
            const params: any[] = [];
            if (category && category !== 'All') {
                params.push(category);
                sql += ` AND LOWER(d.category) = LOWER($${params.length})`;
            }

            const cleanSort = (sort || 'latest').toLowerCase().trim();
            if (cleanSort === 'unanswered') {
                sql += ` AND d.comments_count = 0 ORDER BY d.created_at DESC;`;
            } else if (cleanSort === 'top') {
                sql += ` ORDER BY d.upvotes DESC, d.created_at DESC;`;
            } else {
                sql += ` ORDER BY d.created_at DESC;`;
            }

            const rows = await this.userRepo.query(sql, params);
            return rows || [];
        } catch (error) {
            console.error('getDiscussions error from discussions table:', error);
            return [];
        }
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
        attachmentType?: string;
        attachmentName?: string;
        attachments?: any[];
    }) {
        await this.ensureDiscussionsTable();
        try {
            let resolvedUserId: string | null = null;
            if (data.userId) {
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.userId);
                if (isUuid) {
                    resolvedUserId = data.userId;
                } else {
                    const u = await this.userRepo.query(
                        `SELECT id, full_name, username FROM users WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1) LIMIT 1;`,
                        [data.userId]
                    );
                    if (u && u[0]) resolvedUserId = u[0].id;
                }
            }

            const isAnon = data.isAnonymous === true;
            const authorName = (isAnon ? 'Anonymous' : (data.authorName || 'Gyaanzo User')).trim();
            const authorHandle = (isAnon ? '@anonymous' : (data.authorHandle || '@user')).trim();
            const category = (data.category && data.category !== 'All') ? data.category.trim() : 'General';
            const title = (data.title || '').trim();
            const content = (data.content || '').trim();

            const rawAttachments = Array.isArray(data.attachments) ? data.attachments.slice(0, 3) : [];
            const firstAtt = rawAttachments.length > 0 ? rawAttachments[0] : null;

            const finalAttachmentUrl = data.attachmentUrl || firstAtt?.url || data.imageUrl || null;
            const finalAttachmentType = data.attachmentType || firstAtt?.type || (data.imageUrl ? 'image' : null);
            const finalAttachmentName = data.attachmentName || firstAtt?.name || null;
            const finalImageUrl = (finalAttachmentType === 'image' ? finalAttachmentUrl : data.imageUrl) || null;

            const rows = await this.userRepo.query(`
                INSERT INTO discussions (
                    user_id,
                    author_name,
                    author_handle,
                    author_badge,
                    author_avatar,
                    is_anonymous,
                    category,
                    title,
                    content,
                    image_url,
                    attachment_url,
                    attachment_type,
                    attachment_name,
                    attachments,
                    upvotes,
                    downvotes,
                    comments_count,
                    created_at,
                    updated_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 1, 0, 0, NOW(), NOW())
                RETURNING *;
            `, [
                resolvedUserId,
                authorName,
                authorHandle,
                data.authorBadge || null,
                data.authorAvatar || null,
                isAnon,
                category,
                title,
                content,
                finalImageUrl,
                finalAttachmentUrl,
                finalAttachmentType,
                finalAttachmentName,
                JSON.stringify(rawAttachments)
            ]);

            const newPost = rows[0];
            console.log('✅ Discussion post saved with author:', authorName, 'id:', newPost?.id, 'attachments count:', rawAttachments.length);
            return newPost || null;
        } catch (error) {
            console.error('createDiscussion error into discussions table:', error);
            return null;
        }
    }

    async voteDiscussion(id: string, delta: number) {
        await this.ensureDiscussionsTable();
        try {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
            if (!isUuid) return null;
            const rows = await this.userRepo.query(`
                UPDATE discussions 
                SET upvotes = GREATEST(0, upvotes + $1), updated_at = NOW()
                WHERE id = $2
                RETURNING *;
            `, [delta, id]);
            return rows[0] || null;
        } catch (error) {
            console.error('voteDiscussion error on discussions table:', error);
            return null;
        }
    }
}