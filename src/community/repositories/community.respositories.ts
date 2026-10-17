import { InjectRepository } from "@nestjs/typeorm";
import { Post, PostAttachment, PostComment, PostUpvote } from "../entities";
import { Repository } from "typeorm";

export class CommunityRepository {
    constructor(
        @InjectRepository(Post) private readonly postRepo: Repository<Post>,
        @InjectRepository(PostUpvote) private readonly postUpvoteRepo: Repository<PostUpvote>,
        @InjectRepository(PostComment) private readonly postCommentRepo: Repository<PostComment>,
        @InjectRepository(PostAttachment) private readonly postAttachmentRepo: Repository<PostAttachment>,
    ) { }

    async getAllPosts(limit: number, page: number, orderBy: any = 'DESC') {
        try {
            const posts = await this.postRepo.query(
                `SELECT
                    p.id,
                    p.user_id,
                    p.description,
                    p.upvote_count,
                    p.comment_count,
                    p.created_at,
                    p.updated_at,

                    COALESCE(
                        json_agg(
                            json_build_object(
                                'id', pa.id,
                                'attachment_type', pa.attachment_type,
                                'file_ext', pa.file_ext,
                                'file_url', pa.file_url,
                                'file_name', pa.file_name,
                                'file_size_bytes', pa.file_size_bytes,
                                'order_index', pa.order_index,
                                'created_at', pa.created_at
                            )
                            ORDER BY pa.order_index, pa.created_at
                        ) FILTER (WHERE pa.id IS NOT NULL),
                        '[]'::json
                    ) AS attachments

                FROM posts p

                LEFT JOIN post_attachments pa
                    ON pa.post_id = p.id

                GROUP BY
                    p.id,
                    p.user_id,
                    p.description,
                    p.upvote_count,
                    p.comment_count,
                    p.created_at,
                    p.updated_at

                ORDER BY p.created_at DESC;
                `)
            return posts;
        } catch (error) {
            console.error('SourceError:- getAllPosts', error, 'limit', limit, 'page', page);
            throw error;
        }
    }

    async getPostWithAttachments(postId: string) {
        try {
            const posts = await this.postRepo.query(
                `SELECT
                    p.id,
                    p.user_id,
                    p.description,
                    p.upvote_count,
                    p.comment_count,
                    p.created_at,
                    p.updated_at,

                    COALESCE(
                        json_agg(
                            json_build_object(
                                'id', pa.id,
                                'attachment_type', pa.attachment_type,
                                'file_ext', pa.file_ext,
                                'file_url', pa.file_url,
                                'file_name', pa.file_name,
                                'file_size_bytes', pa.file_size_bytes,
                                'order_index', pa.order_index,
                                'created_at', pa.created_at
                            )
                            ORDER BY pa.order_index, pa.created_at
                        ) FILTER (WHERE pa.id IS NOT NULL),
                        '[]'::json
                    ) AS attachments

                FROM posts p

                LEFT JOIN post_attachments pa
                    ON pa.post_id = p.id

                WHERE p.id = $1

                GROUP BY
                    p.id,
                    p.user_id,
                    p.description,
                    p.upvote_count,
                    p.comment_count,
                    p.created_at,
                    p.updated_at

                ORDER BY p.created_at DESC;
                `,[postId])
            return posts;
        } catch (error) {
            console.error('SourceError:- getPostWithAttachments', error, 'postId', postId);
            throw error;
        }
    }

    // community.repositories.ts
    async hasUserUpvoted(postId: string, userId: string) {
        try {
            const existing = await this.postUpvoteRepo.findOne({
                where: { post_id: postId, user_id: userId },
            });
            return !!existing;
        } catch (error) {
            console.error('SourceError:- hasUserUpvoted', error, 'postId', postId, 'userId', userId);
            return false;
        }
    }

    async getPostComments(postId: string, limit: number, page: number) {
        try {
            const comments = await this.postCommentRepo.query(
                `
                SELECT
                    pc.id,
                    pc.post_id,
                    pc.user_id,
                    pc.parent_comment_id,
                    pc.body,
                    pc.created_at,
                    pc.updated_at,

                    json_build_object(
                        'id', u.id,
                        'full_name', u.full_name,
                        'avatar_url', u.avatar_url
                    ) AS user

                FROM post_comments pc

                INNER JOIN users u
                    ON u.id = pc.user_id

                WHERE pc.post_id = $1 AND pc.parent_comment_id IS NULL

                ORDER BY pc.created_at ASC;`, [postId]
            )
            return comments;
        } catch (error) {
            console.error('SourceError:- getPostComments', error, 'postId', postId, 'limit', limit, 'page', page);
            throw error;
        }
    }

    async getCommentReplies(postId: string, parentCommentId: string, limit: number, page: number) {
        try {
            const replies = await this.postCommentRepo.query(
                `
                SELECT
                    pc.id,
                    pc.post_id,
                    pc.user_id,
                    pc.parent_comment_id,
                    pc.body,
                    pc.created_at,
                    pc.updated_at,

                    json_build_object(
                        'id', u.id,
                        'full_name', u.full_name,
                        'avatar_url', u.avatar_url
                    ) AS user

                FROM post_comments pc

                INNER JOIN users u
                    ON u.id = pc.user_id

                WHERE pc.post_id = $1 AND pc.parent_comment_id = $2

                ORDER BY pc.created_at ASC;`, [postId, parentCommentId]
            );
            return replies;
        } catch (error) {
            console.error('SourceError:- getCommentReplies', error, 'postId', postId, 'parentCommentId', parentCommentId, 'limit', limit, 'page', page);
            throw error;
        }
    }

    async getPostById(postId: string) {
        try {
            const post = await this.postRepo.findOne({
                where: { id: postId }
            });
            return post;
        } catch (error) {
            console.error('SourceError:- getPostById', error, 'postId', postId);
            throw error;
        }
    }

    async getAttachmentsByIds(attachmentIds: string[], postId: string) {
        try {
            if (!attachmentIds || attachmentIds.length === 0) return [];

            const attachments = await this.postAttachmentRepo.createQueryBuilder('pa')
                .where('pa.id IN (:...attachmentIds) AND pa.post_id = :postId', { attachmentIds, postId })
                .getMany();
            return attachments;

        } catch (error) {
            console.error('SourceError:- getAttachmentsByIds', error, 'attachmentIds', attachmentIds, 'postId', postId);
            throw error;
        }
    }
}