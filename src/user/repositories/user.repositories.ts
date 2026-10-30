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
                ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';
                ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
                ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(100);
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

                // Propagate updated name and handle to all non-anonymous discussions & comments
                try {
                    const cleanHandle = `@${data.username.replace(/^@/, '')}`;
                    await this.userRepo.query(`
                        UPDATE discussions 
                        SET author_name = $1, author_handle = $2, updated_at = NOW()
                        WHERE (user_id = $3 OR LOWER(author_handle) = LOWER($2)) AND is_anonymous = FALSE;
                    `, [data.fullName, cleanHandle, saved.id]);

                    await this.userRepo.query(`
                        UPDATE discussion_comments 
                        SET author_name = $1 
                        WHERE user_id = $2 AND author_name != 'Anonymous';
                    `, [data.fullName, saved.id]);
                } catch (propErr) {
                    console.error('Note propagating updated author name:', propErr);
                }

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

                    const cleanHandle = `@${data.username.replace(/^@/, '')}`;
                    await this.userRepo.query(`
                        UPDATE discussions 
                        SET author_name = $1, author_handle = $2, updated_at = NOW()
                        WHERE (user_id = (SELECT id FROM users WHERE LOWER(email) = LOWER($3) LIMIT 1) 
                               OR LOWER(author_handle) = LOWER($2)) AND is_anonymous = FALSE;
                    `, [data.fullName, cleanHandle, data.email]);
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
                    upvotes INT DEFAULT 0,
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
                ALTER TABLE discussions ALTER COLUMN upvotes SET DEFAULT 0;

                CREATE TABLE IF NOT EXISTS discussion_votes (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    discussion_id UUID NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
                    user_id TEXT NOT NULL,
                    vote_type INT NOT NULL,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    CONSTRAINT unique_user_discussion_vote UNIQUE (discussion_id, user_id)
                );

                CREATE TABLE IF NOT EXISTS discussion_comments (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    discussion_id UUID NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
                    user_id UUID NULL,
                    author_name TEXT NOT NULL,
                    author_avatar TEXT NULL,
                    content TEXT NOT NULL,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
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

    async getDiscussions(category?: string, sort?: string, currentUserId?: string) {
        await this.ensureDiscussionsTable();
        try {
            let sql = `
                SELECT 
                    d.id,
                    d.user_id,
                    CASE 
                        WHEN d.is_anonymous THEN 'Anonymous' 
                        ELSE COALESCE(NULLIF(TRIM(u.full_name), ''), d.author_name) 
                    END AS author_name,
                    CASE 
                        WHEN d.is_anonymous THEN '@anonymous' 
                        ELSE COALESCE(NULLIF(TRIM(CONCAT('@', u.username)), '@'), d.author_handle) 
                    END AS author_handle,
                    d.author_badge,
                    COALESCE(d.author_avatar, u.avatar_url) AS author_avatar,
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
                    COALESCE(dv.vote_type, 0) AS user_vote,
                    d.created_at
                FROM discussions d
                LEFT JOIN users u ON d.user_id = u.id
                LEFT JOIN discussion_votes dv ON dv.discussion_id = d.id AND dv.user_id = $1
                WHERE 1=1
            `;
            const params: any[] = [currentUserId ? currentUserId.trim() : ''];
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
            let category = (data.category && data.category !== 'All') ? data.category.trim() : 'General';
            let authorBadge = data.authorBadge || null;

            // Restrict Announcements category: only admin/developer accounts can publish announcements
            if (category === 'Announcements') {
                let isAdmin = false;
                if (resolvedUserId) {
                    const adminCheck = await this.userRepo.query(
                        `SELECT role, is_admin FROM users WHERE id = $1 LIMIT 1;`,
                        [resolvedUserId]
                    );
                    if (adminCheck && adminCheck[0] && (adminCheck[0].role === 'admin' || adminCheck[0].is_admin === true)) {
                        isAdmin = true;
                    }
                }
                if (!isAdmin) {
                    console.log('⚠️ Non-admin attempted to post in Announcements category. Overriding to General.');
                    category = 'General';
                } else {
                    authorBadge = 'ADMIN';
                }
            }

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
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 0, 0, 0, NOW(), NOW())
                RETURNING *;
            `, [
                resolvedUserId,
                authorName,
                authorHandle,
                authorBadge,
                data.authorAvatar || (data as any).author_avatar || (data as any).avatar_url || null,
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

    async voteDiscussion(id: string, delta: number, userId?: string) {
        await this.ensureDiscussionsTable();
        try {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
            if (!isUuid) return null;

            if (userId && userId.trim() !== '') {
                const uid = userId.trim();
                const existingVotes = await this.userRepo.query(
                    `SELECT vote_type FROM discussion_votes WHERE discussion_id = $1 AND user_id = $2 LIMIT 1;`,
                    [id, uid]
                );

                if (existingVotes && existingVotes.length > 0) {
                    const currentVote = existingVotes[0].vote_type;
                    if (currentVote === delta) {
                        // User clicked same button -> toggle off / remove vote
                        await this.userRepo.query(
                            `DELETE FROM discussion_votes WHERE discussion_id = $1 AND user_id = $2;`,
                            [id, uid]
                        );
                        if (delta === 1) {
                            await this.userRepo.query(
                                `UPDATE discussions SET upvotes = GREATEST(0, upvotes - 1), updated_at = NOW() WHERE id = $1;`,
                                [id]
                            );
                        } else if (delta === -1) {
                            await this.userRepo.query(
                                `UPDATE discussions SET downvotes = GREATEST(0, downvotes - 1), updated_at = NOW() WHERE id = $1;`,
                                [id]
                            );
                        }
                    } else {
                        // User switched vote (e.g. from -1 to 1 or 1 to -1)
                        await this.userRepo.query(
                            `UPDATE discussion_votes SET vote_type = $1 WHERE discussion_id = $2 AND user_id = $3;`,
                            [delta, id, uid]
                        );
                        if (delta === 1) {
                            await this.userRepo.query(
                                `UPDATE discussions SET upvotes = upvotes + 1, downvotes = GREATEST(0, downvotes - 1), updated_at = NOW() WHERE id = $1;`,
                                [id]
                            );
                        } else if (delta === -1) {
                            await this.userRepo.query(
                                `UPDATE discussions SET downvotes = downvotes + 1, upvotes = GREATEST(0, upvotes - 1), updated_at = NOW() WHERE id = $1;`,
                                [id]
                            );
                        }
                    }
                } else {
                    // First time voting
                    await this.userRepo.query(
                        `INSERT INTO discussion_votes (discussion_id, user_id, vote_type) VALUES ($1, $2, $3)
                         ON CONFLICT (discussion_id, user_id) DO UPDATE SET vote_type = $3;`,
                        [id, uid, delta]
                    );
                    if (delta === 1) {
                        await this.userRepo.query(
                            `UPDATE discussions SET upvotes = upvotes + 1, updated_at = NOW() WHERE id = $1;`,
                            [id]
                        );
                    } else if (delta === -1) {
                        await this.userRepo.query(
                            `UPDATE discussions SET downvotes = downvotes + 1, updated_at = NOW() WHERE id = $1;`,
                            [id]
                        );
                    }
                }
            } else {
                // Fallback if no userId provided
                if (delta > 0) {
                    await this.userRepo.query(
                        `UPDATE discussions SET upvotes = GREATEST(0, upvotes + $1), updated_at = NOW() WHERE id = $2;`,
                        [delta, id]
                    );
                } else {
                    await this.userRepo.query(
                        `UPDATE discussions SET downvotes = GREATEST(0, downvotes + 1), updated_at = NOW() WHERE id = $1;`,
                        [id]
                    );
                }
            }

            const rows = await this.userRepo.query(`SELECT * FROM discussions WHERE id = $1;`, [id]);
            return rows[0] || null;
        } catch (error) {
            console.error('voteDiscussion error on discussions table:', error);
            return null;
        }
    }

    async getDiscussionComments(discussionId: string) {
        await this.ensureDiscussionsTable();
        try {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(discussionId);
            if (!isUuid) return [];

            const rows = await this.userRepo.query(`
                SELECT 
                    dc.id,
                    dc.discussion_id,
                    dc.user_id,
                    CASE 
                        WHEN dc.author_name = 'Anonymous' THEN 'Anonymous' 
                        ELSE COALESCE(NULLIF(TRIM(u.full_name), ''), dc.author_name) 
                    END AS author_name,
                    COALESCE(dc.author_avatar, u.avatar_url) AS author_avatar,
                    dc.content,
                    dc.created_at
                FROM discussion_comments dc
                LEFT JOIN users u ON dc.user_id = u.id
                WHERE dc.discussion_id = $1
                ORDER BY dc.created_at ASC;
            `, [discussionId]);
            return rows || [];
        } catch (error) {
            console.error('getDiscussionComments error:', error);
            return [];
        }
    }

    async addDiscussionComment(discussionId: string, data: {
        userId?: string;
        authorName: string;
        authorAvatar?: string;
        content: string;
    }) {
        await this.ensureDiscussionsTable();
        try {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(discussionId);
            if (!isUuid) return null;

            let resolvedUserId: string | null = null;
            if (data.userId) {
                const isUserUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.userId);
                if (isUserUuid) resolvedUserId = data.userId;
            }

            const rows = await this.userRepo.query(`
                INSERT INTO discussion_comments (
                    discussion_id,
                    user_id,
                    author_name,
                    author_avatar,
                    content,
                    created_at
                )
                VALUES ($1, $2, $3, $4, NOW())
                RETURNING *;
            `, [
                discussionId,
                resolvedUserId,
                (data.authorName || 'Gyaanzo User').trim(),
                data.authorAvatar || null,
                (data.content || '').trim()
            ]);

            // Increment comments_count on discussion post
            await this.userRepo.query(`
                UPDATE discussions 
                SET comments_count = comments_count + 1, updated_at = NOW()
                WHERE id = $1;
            `, [discussionId]);

            return rows[0] || null;
        } catch (error) {
            console.error('addDiscussionComment error:', error);
            return null;
        }
    }

    async updateDiscussion(id: string, data: { title?: string; content?: string; category?: string }) {
        await this.ensureDiscussionsTable();
        try {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
            if (!isUuid) return null;

            const rows = await this.userRepo.query(`
                UPDATE discussions
                SET 
                    title = COALESCE($1, title),
                    content = COALESCE($2, content),
                    category = COALESCE($3, category),
                    updated_at = NOW()
                WHERE id = $4
                RETURNING *;
            `, [
                data.title !== undefined ? data.title.trim() : null,
                data.content !== undefined ? data.content.trim() : null,
                data.category !== undefined ? data.category.trim() : null,
                id,
            ]);
            return rows && rows[0] ? rows[0] : null;
        } catch (error) {
            console.error('updateDiscussion error:', error);
            return null;
        }
    }

    async deleteDiscussion(id: string): Promise<boolean> {
        await this.ensureDiscussionsTable();
        try {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
            if (!isUuid) return false;

            await this.userRepo.query(`DELETE FROM discussions WHERE id = $1;`, [id]);
            return true;
        } catch (error) {
            console.error('deleteDiscussion error:', error);
            return false;
        }
    }

    async updateDiscussionComment(commentId: string, content: string) {
        await this.ensureDiscussionsTable();
        try {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(commentId);
            if (!isUuid) return null;

            const rows = await this.userRepo.query(`
                UPDATE discussion_comments
                SET content = $1
                WHERE id = $2
                RETURNING *;
            `, [content.trim(), commentId]);
            return rows && rows[0] ? rows[0] : null;
        } catch (error) {
            console.error('updateDiscussionComment error:', error);
            return null;
        }
    }

    async deleteDiscussionComment(commentId: string, discussionId?: string): Promise<boolean> {
        await this.ensureDiscussionsTable();
        try {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(commentId);
            if (!isUuid) return false;

            let targetDiscussionId = discussionId;
            if (!targetDiscussionId) {
                const found = await this.userRepo.query(
                    `SELECT discussion_id FROM discussion_comments WHERE id = $1 LIMIT 1;`,
                    [commentId],
                );
                if (found && found.length > 0) {
                    targetDiscussionId = found[0].discussion_id;
                }
            }

            await this.userRepo.query(`DELETE FROM discussion_comments WHERE id = $1;`, [commentId]);

            if (targetDiscussionId) {
                await this.userRepo.query(`
                    UPDATE discussions 
                    SET comments_count = GREATEST(0, comments_count - 1), updated_at = NOW()
                    WHERE id = $1;
                `, [targetDiscussionId]);
            }
            return true;
        } catch (error) {
            console.error('deleteDiscussionComment error:', error);
            return false;
        }
    }

    async ensureReferralsTable(): Promise<void> {
        try {
            await this.userRepo.query(`
                CREATE TABLE IF NOT EXISTS referrals (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    referrer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    referred_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    referral_code VARCHAR(100) NOT NULL,
                    sp_awarded INT DEFAULT 100,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    CONSTRAINT unique_referred_user UNIQUE (referred_user_id)
                );
            `);
        } catch (err) {
            console.error('ensureReferralsTable note:', err);
        }
    }

    async creditSpPoints(userId: string, amount: number, sourceType: string, note?: string): Promise<boolean> {
        try {
            const accounts = await this.userRepo.query(`
                INSERT INTO skill_bank_accounts (user_id, balance_sp, total_earned_sp, total_withdrawn_sp, created_at, updated_at)
                VALUES ($1, $2, $2, 0, NOW(), NOW())
                ON CONFLICT (user_id) DO UPDATE
                SET balance_sp = skill_bank_accounts.balance_sp + $2,
                    total_earned_sp = skill_bank_accounts.total_earned_sp + $2,
                    updated_at = NOW()
                RETURNING id, balance_sp;
            `, [userId, amount]);

            if (accounts && accounts[0]) {
                const account = accounts[0];
                await this.userRepo.query(`
                    INSERT INTO skill_point_transactions (skill_bank_id, source_type, source_id, amount_sp, balance_after_sp, note, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, NOW());
                `, [
                    account.id,
                    sourceType || 'referral_reward',
                    userId,
                    amount,
                    account.balance_sp,
                    note || 'Referral Reward (+100 SP)',
                ]);
                return true;
            }
            return false;
        } catch (err) {
            console.error('creditSpPoints error:', err, 'userId:', userId);
            return false;
        }
    }

    async claimReferral(referredUserId: string, referralCode: string): Promise<{
        success: boolean;
        message: string;
        spAwarded?: number;
    }> {
        await this.ensureReferralsTable();
        await this.ensureProfileColumnsExist();

        const cleanCode = (referralCode || '').trim().toUpperCase();
        if (!cleanCode) {
            return { success: false, message: 'Please enter a valid referral code.' };
        }

        // 1. Resolve referred user ID
        let resolvedReferredUserId: string | null = null;
        if (referredUserId) {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(referredUserId);
            if (isUuid) {
                resolvedReferredUserId = referredUserId;
            } else {
                const u = await this.userRepo.query(
                    `SELECT id FROM users WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1) LIMIT 1;`,
                    [referredUserId]
                );
                if (u && u[0]) resolvedReferredUserId = u[0].id;
            }
        }

        if (!resolvedReferredUserId) {
            return { success: false, message: 'User account not found. Please log in first.' };
        }

        // 2. Find referrer by referral_code or username
        const referrerUsers = await this.userRepo.query(
            `SELECT id, username, email FROM users 
             WHERE UPPER(referral_code) = $1 OR UPPER(username) = $1 
             LIMIT 1;`,
            [cleanCode]
        );

        if (!referrerUsers || referrerUsers.length === 0) {
            return { success: false, message: 'Invalid referral code. Please check and try again.' };
        }

        const referrer = referrerUsers[0];

        // 3. Ensure not referring oneself
        if (referrer.id === resolvedReferredUserId) {
            return { success: false, message: 'You cannot use your own referral code.' };
        }

        // 4. Ensure referred user hasn't already claimed a referral
        const existingClaim = await this.userRepo.query(
            `SELECT id FROM referrals WHERE referred_user_id = $1 LIMIT 1;`,
            [resolvedReferredUserId]
        );

        if (existingClaim && existingClaim.length > 0) {
            return { success: false, message: 'You have already claimed a referral bonus.' };
        }

        // 5. Insert referral record
        try {
            await this.userRepo.query(`
                INSERT INTO referrals (referrer_user_id, referred_user_id, referral_code, sp_awarded, created_at)
                VALUES ($1, $2, $3, 100, NOW());
            `, [referrer.id, resolvedReferredUserId, cleanCode]);

            // 6. Award +100 SP to referrer
            await this.creditSpPoints(
                referrer.id,
                100,
                'referral_reward',
                `Referral bonus for inviting ${cleanCode}`
            );

            // 7. Award +100 SP to referred user
            await this.creditSpPoints(
                resolvedReferredUserId,
                100,
                'referral_reward',
                `Welcome bonus for joining with referral code ${cleanCode}`
            );

            console.log(`🎉 Referral successful! 100 SP awarded to referrer ${referrer.id} and referred ${resolvedReferredUserId}`);

            return {
                success: true,
                message: 'Referral code applied! You and your friend both received 100 SP points 🎉',
                spAwarded: 100,
            };
        } catch (e) {
            console.error('claimReferral error:', e);
            return { success: false, message: 'Unable to claim referral at this time. Please try again.' };
        }
    }

    async getReferralInfo(userId: string): Promise<{
        referralCode: string;
        totalReferrals: number;
        totalEarnedSp: number;
        rewardPerReferral: number;
    }> {
        await this.ensureReferralsTable();
        await this.ensureProfileColumnsExist();

        let resolvedUserId = userId;
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
        if (!isUuid) {
            const u = await this.userRepo.query(
                `SELECT id, username, referral_code FROM users WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1) LIMIT 1;`,
                [userId]
            );
            if (u && u[0]) {
                resolvedUserId = u[0].id;
            }
        }

        const userRow = await this.userRepo.query(
            `SELECT id, username, referral_code FROM users WHERE id = $1 LIMIT 1;`,
            [resolvedUserId]
        );

        let code = '';
        if (userRow && userRow[0]) {
            const u = userRow[0];
            if (u.referral_code && u.referral_code.trim()) {
                code = u.referral_code.trim().toUpperCase();
            } else {
                // Generate referral code from username or ID
                code = (u.username ? u.username.toUpperCase() : `GYN${u.id.replace(/-/g, '').slice(0, 6).toUpperCase()}`).trim();
                try {
                    await this.userRepo.query(
                        `UPDATE users SET referral_code = $1 WHERE id = $2;`,
                        [code, resolvedUserId]
                    );
                } catch (_) {}
            }
        } else {
            code = `GYN${userId.slice(0, 6).toUpperCase()}`;
        }

        // Count successful referrals
        let count = 0;
        try {
            const countRes = await this.userRepo.query(
                `SELECT COUNT(*) as cnt FROM referrals WHERE referrer_user_id = $1;`,
                [resolvedUserId]
            );
            if (countRes && countRes[0]) {
                count = parseInt(countRes[0].cnt, 10) || 0;
            }
        } catch (_) {}

        return {
            referralCode: code,
            totalReferrals: count,
            totalEarnedSp: count * 100,
            rewardPerReferral: 100,
        };
    }
}