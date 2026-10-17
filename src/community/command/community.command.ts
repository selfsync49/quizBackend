import { InjectRepository } from "@nestjs/typeorm";
import { DataSource } from 'typeorm';
import { Post, PostAttachment, PostComment, PostUpvote } from "../entities";
import { Repository } from "typeorm";
import { communityPostAttachment } from "../interface";

export class CommunityCommand {
    constructor(
        @InjectRepository(Post) private readonly postRepo: Repository<Post>,
        @InjectRepository(PostUpvote) private readonly postUpvoteRepo: Repository<PostUpvote>,
        @InjectRepository(PostAttachment) private readonly postAttachmentRepo: Repository<PostAttachment>,
        @InjectRepository(PostComment) private readonly postCommentRepo: Repository<PostComment>,
        private readonly dataSource: DataSource
    ) { }

    async createCommunityPost(userId: string, description: string) {
        try {
            const createdPost = await this.postRepo.create({
                user_id: userId,
                description: description
            });
            const result = await this.postRepo.save(createdPost);
            return result;
        } catch (error) {
            console.error('SourceError:- createCommunityPost', error, 'userId', userId, 'description', description);
            throw error;
        }
    }

    async createPostAttachment(postId: string, post: communityPostAttachment) {
        try {
            const createdAttachment = await this.postAttachmentRepo.create({
                post_id: postId,
                file_name: post.fileName,
                file_size_bytes: post.fileSize,
                file_url: post.fileUrl,
                file_ext: post.fileExt,
                attachment_type: post.attachmentType,
            });
            const result = await this.postAttachmentRepo.save(createdAttachment);
            return result;
        } catch (error) {
            console.error('SourceError:- createPostAttachment', error, 'post', post);
            throw error;
        }
    }

    async addUpvote(postId: string, userId: string) {
        try {
            await this.dataSource.transaction(async (manager) => {
                const upvote = manager.create(PostUpvote, {
                    post_id: postId,
                    user_id: userId,
                });
                await manager.save(upvote);

                const updateResult = await manager
                    .createQueryBuilder()
                    .update(Post)
                    .set({ upvote_count: () => 'upvote_count + 1' })
                    .where('id = :postId', { postId })
                    .execute();

                if (updateResult.affected === 0) {
                    throw 'Post not found.';
                }
            });

            return true;

        } catch (error) {
            console.error('SourceError:- addUpvote', error, 'postId', postId, 'userId', userId);
            return false;
        }
    }

    async removeUpvote(postId: string, userId: string) {
        try {
            await this.dataSource.transaction(async (manager) => {
                const deleteResult = await manager.delete(PostUpvote, {
                    post_id: postId,
                    user_id: userId,
                });

                if (deleteResult.affected === 0) {
                    throw 'Upvote record not found — nothing to remove.';
                }

                const updateResult = await manager
                    .createQueryBuilder()
                    .update(Post)
                    .set({ upvote_count: () => 'GREATEST(upvote_count - 1, 0)' })
                    .where('id = :postId', { postId })
                    .execute();

                if (updateResult.affected === 0) {
                    throw 'Post not found.';
                }
            });

            return true;

        } catch (error) {
            console.error('SourceError:- removeUpvote', error, 'postId', postId, 'userId', userId);
            return false;
        }
    }

    async addPostComment(postId: string, userId: string, comment: string, parentCommentId?: string) {
        try {
            const created = await this.postCommentRepo.create({
                post_id: postId,
                user_id: userId,
                body: comment,
                parent_comment_id: parentCommentId || null,
            });
            const result = await this.postCommentRepo.save(created);
            return result;
        } catch (error) {
            console.error('SourceError:- addPostComment', error, 'postId', postId, 'userId', userId, 'comment', comment, 'parentCommentId', parentCommentId);
            throw error;
        }
    }

    async updatePostDescription(postId: string, newDescription: string) {
        try {
            const updateResult = await this.postRepo.update(
                { id: postId },
                { description: newDescription }
            );
            return updateResult;
        } catch (error) {
            console.error('SourceError:- updatePostDescription', error, 'postId', postId, 'newDescription', newDescription);
            throw error;
        }
    }

    async deleteAttachments(attachmentIds: string[], postId: string) {
        try {
            if (!attachmentIds || attachmentIds.length === 0) return 0;

            const result = await this.postAttachmentRepo
                .createQueryBuilder()
                .delete()
                .from(PostAttachment)
                .where('id IN (:...attachmentIds) AND post_id = :postId', { attachmentIds, postId })
                .execute();

            return result.affected ?? 0;

        } catch (error) {
            console.error('SourceError:- deleteAttachments', error, 'attachmentIds', attachmentIds, 'postId', postId);
            throw error;
        }
    }
}
