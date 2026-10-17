import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ALLOWED_FILE_EXTENSIONS, communityCreateDto, communityPostEditDto } from "../dtos";
import { CommunityCommand } from '../command';
import { communityPostAttachment } from '../interface/community.interface';
import { AttachmentType } from '../entities';
import { S3Service } from 'src/shared-svc';
import { S3_BUCKET_KEY_PREFIX } from '../constants';
import { randomUUID } from 'crypto';
import { CommunityRepository } from '../repositories';



@Injectable()
export class CommunityService {
    constructor(
        private readonly communityCommand: CommunityCommand,
        private readonly communityRepository: CommunityRepository,
        private readonly s3Service: S3Service
    ) { }

    async createPost(
        postData: communityCreateDto,
        files?: Express.Multer.File[],
    ) {
        let s3UploadFiles: communityPostAttachment[] = [];

        try {
            // -----------------------------
            // 1. Validate request
            // -----------------------------

            if (!postData.userId) {
                throw new BadRequestException('Userid is required');
            }

            const uuidRegex =
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

            if (!uuidRegex.test(postData.userId)) {
                throw new BadRequestException(
                    'Invalid userId: must be a valid UUID',
                );
            }

            if (
                !postData.description ||
                postData.description.trim() === ''
            ) {
                throw new BadRequestException('Description is required');
            }

            // -----------------------------
            // 2. Validate files
            // -----------------------------

            const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

            const uploadedFiles: communityPostAttachment[] = [];

            if (files && files.length > 0) {
                for (const file of files) {
                    // File size validation
                    if (file.size > MAX_FILE_SIZE_BYTES) {
                        throw new BadRequestException(
                            `File "${file.originalname}" exceeds the 10MB size limit.`,
                        );
                    }

                    // File extension
                    const fileExt =
                        '.' +
                        file.originalname
                            .split('.')
                            .pop()
                            ?.toLowerCase();

                    // Allowed extension validation
                    if (
                        !fileExt ||
                        !ALLOWED_FILE_EXTENSIONS.includes(fileExt)
                    ) {
                        throw new BadRequestException(
                            `File "${file.originalname}" has an unsupported file type. Allowed types: ${ALLOWED_FILE_EXTENSIONS.join(', ')}`,
                        );
                    }

                    uploadedFiles.push({
                        fileName: file.originalname,
                        fileSize: file.size,
                        buffer: file.buffer,
                        attachmentType: this.getAttachmentType(fileExt),
                        fileExt,
                    });
                }
            }

            // -----------------------------
            // 3. Create post in database
            // -----------------------------

            const createdPost =
                await this.communityCommand.createCommunityPost(
                    postData.userId,
                    postData.description.trim(),
                );

            const createdPostId = createdPost?.id;

            if (!createdPostId) {
                throw new InternalServerErrorException(
                    'Failed to create post.',
                );
            }

            // -----------------------------
            // 4. Generate S3 keys
            // -----------------------------

            if (uploadedFiles.length > 0) {
                s3UploadFiles = uploadedFiles.map((file) => {
                    const safeFileName = file.fileName.replace(
                        /[^a-zA-Z0-9._-]/g,
                        '_',
                    );

                    const s3Key =
                        `${S3_BUCKET_KEY_PREFIX}/` +
                        `${postData.userId}/` +
                        `posts/` +
                        `${createdPostId}/` +
                        `${randomUUID()}_${safeFileName}`;

                    return {
                        ...file,
                        fileUrl: s3Key,
                    };
                });

                // -----------------------------
                // 5. Upload all files to S3
                // -----------------------------

                await Promise.all(
                    s3UploadFiles.map((file) =>
                        this.s3Service.upload(
                            file.fileUrl,
                            file.buffer,
                            file.fileExt,
                        ),
                    ),
                );

                // -----------------------------
                // 6. Save attachment records
                // -----------------------------

                await Promise.all(
                    s3UploadFiles.map((file) =>
                        this.communityCommand.createPostAttachment(
                            createdPostId,
                            file,
                        ),
                    ),
                );
            }

            // -----------------------------
            // 7. Return response
            // -----------------------------

            return {
                status: true,
                data: {
                    post: createdPost,
                },
            };
        } catch (error) {
            console.error(
                'SourceError:- createPost',
                error,
                'postData',
                postData,
            );

            // -----------------------------
            // 8. Cleanup S3 files
            // -----------------------------

            if (s3UploadFiles.length > 0) {
                await Promise.allSettled(
                    s3UploadFiles.map((file) =>
                        this.s3Service.delete(file.fileUrl),
                    ),
                );
            }

            // -----------------------------
            // 9. Handle errors
            // -----------------------------

            if (error instanceof BadRequestException) {
                throw error;
            }

            throw new InternalServerErrorException(
                error?.message ||
                'Something went wrong while creating post.',
            );
        }
    }

    async getAllPosts(pagination: { limit: number; page: number }) {
        try {
            // think whether we need redis here or not ?
            const { limit, page } = pagination;
            const posts = await this.communityRepository.getAllPosts(limit, page);
            const postsWithSignedUrls = await this.addAttachmentUrls(posts, this.s3Service);
            return {
                status: true,
                data: postsWithSignedUrls,
            };
        } catch (error) {
            console.error('SourceError:- getAllPosts', error);
            throw new InternalServerErrorException(
                error?.message ||
                'Something went wrong while fetching posts.',
            );
        }
    }

    getAttachmentType(fileExt: string): AttachmentType {
        const ext = fileExt.toLowerCase().startsWith('.')
            ? fileExt.toLowerCase()
            : `.${fileExt.toLowerCase()}`;

        if (['.jpg', '.jpeg', '.png', '.webp', '.svg'].includes(ext)) {
            return AttachmentType.IMAGE;
        }

        if (ext === '.gif') {
            return AttachmentType.GIF;
        }

        if (['.mp4', '.mov', '.webm'].includes(ext)) {
            return AttachmentType.VIDEO;
        }

        if (ext === '.pdf') {
            return AttachmentType.PDF;
        }

        if (['.doc', '.docx'].includes(ext)) {
            return AttachmentType.WORD;
        }

        if (['.xls', '.xlsx'].includes(ext)) {
            return AttachmentType.EXCEL;
        }

        return AttachmentType.OTHERS;
    };

    async addAttachmentUrls<T extends {
        attachments?: Array<{ file_url: string }>;
    }>(
        posts: T[],
        s3Service: S3Service,
    ) {
        return Promise.all(
            posts.map(async (post) => {
                const attachments = await Promise.all(
                    (post.attachments ?? []).map(async (attachment) => {
                        const signedUrl = await s3Service.getSignedDownloadUrl(
                            attachment.file_url,
                        );

                        return {
                            ...attachment,
                            file_url: signedUrl,
                        };
                    }),
                );

                return {
                    ...post,
                    attachments,
                };
            }),
        );
    }

    async toggleUpvote(userId: string, postId: string) {
        try {
            if (!userId) throw new BadRequestException('UserId is required.');
            if (!postId) throw new BadRequestException('PostId is required.');

            const alreadyUpvoted = await this.communityRepository.hasUserUpvoted(postId, userId);
            if (alreadyUpvoted) {
                const result = await this.communityCommand.removeUpvote(postId, userId);
                if (!result) throw new InternalServerErrorException('Could not remove upvote.');
                return { status: true, message: 'Upvote removed.', upvoted: false };
            }

            const result = await this.communityCommand.addUpvote(postId, userId);
            if (!result) {
                throw new InternalServerErrorException('Could not upvote post.');
            }

            return { status: true, message: 'Post upvoted successfully.', upvoted: true };

        } catch (error) {
            console.error('SourceError:- upvotePost', error, 'userId', userId, 'postId', postId);
            if (error instanceof BadRequestException || error instanceof InternalServerErrorException) throw error;
            throw new InternalServerErrorException(error?.message || 'Something went wrong while upvoting post.');
        }
    }

    async getPostComments(postId: string, limit: number = 10, page: number = 1) {
        try {
            if (!postId) throw new BadRequestException('PostId is required.');
            const comments = await this.communityRepository.getPostComments(postId, limit, page);
            return { status: true, data: comments };
        } catch (error) {
            console.error('SourceError:- getPostComments', error, 'postId', postId);
            if (error instanceof BadRequestException) throw error;
            throw new InternalServerErrorException(error?.message || 'Something went wrong while fetching post comments.');
        }
    }

    async addPostComment(postId: string, userId: string, comment: string, parentCommentId?: string) {
        try {
            if (!postId) throw new BadRequestException('PostId is required.');
            if (!userId) throw new BadRequestException('UserId is required.');
            if (!comment || comment.trim() === '') throw new BadRequestException('Comment cannot be empty.');

            const createdComment = await this.communityCommand.addPostComment(postId, userId, comment.trim(), parentCommentId);
            return { status: true, data: createdComment };
        } catch (error) {
            console.error('SourceError:- addPostComment', error, 'postId', postId, 'userId', userId);
            if (error instanceof BadRequestException || error instanceof InternalServerErrorException) throw error;
            throw new InternalServerErrorException(error?.message || 'Something went wrong while adding comment.');
        }
    }

    async getCommentReplies(postId: string, parentCommentId: string, limit: number = 10, page: number = 1) {
        try {
            if (!postId) throw new BadRequestException('PostId is required.');
            if (!parentCommentId) throw new BadRequestException('ParentCommentId is required.');

            const replies = await this.communityRepository.getCommentReplies(postId, parentCommentId, limit, page);
            return { status: true, data: replies };
        } catch (error) {
            console.error('SourceError:- getCommentReplies', error, 'postId', postId, 'parentCommentId', parentCommentId);
            if (error instanceof BadRequestException) throw error;
            throw new InternalServerErrorException(error?.message || 'Something went wrong while fetching comment replies.');
        }
    }

    async updatePost(
        postId: string,
        updateData: communityPostEditDto,
        files?: Express.Multer.File[],
    ) {
        let s3UploadFiles: communityPostAttachment[] = [];
        const deletedS3Keys: string[] = [];

        try {
            // 1. Validate ownership — critical, don't skip this
            const post = await this.communityRepository.getPostById(postId);
            if (!post) throw new BadRequestException('Post not found.');
            if (post.user_id !== updateData.userId) {
                throw new ForbiddenException('You do not have permission to edit this post.');
            }

            // 2. Validate new files (same logic as createPost)
            const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
            const uploadedFiles: communityPostAttachment[] = [];

            if (files && files.length > 0) {
                for (const file of files) {
                    if (file.size > MAX_FILE_SIZE_BYTES) {
                        throw new BadRequestException(`File "${file.originalname}" exceeds the 10MB size limit.`);
                    }
                    const fileExt = '.' + file.originalname.split('.').pop()?.toLowerCase();
                    if (!fileExt || !ALLOWED_FILE_EXTENSIONS.includes(fileExt)) {
                        throw new BadRequestException(`File "${file.originalname}" has an unsupported file type.`);
                    }
                    uploadedFiles.push({
                        fileName: file.originalname,
                        fileSize: file.size,
                        buffer: file.buffer,
                        attachmentType: this.getAttachmentType(fileExt),
                        fileExt,
                    });
                }
            }

            // 3. Update description if provided
            if (updateData.description !== undefined) {
                await this.communityCommand.updatePostDescription(postId, updateData.description.trim());
            }

            // 4. Delete specified attachments (DB + S3)
            if (updateData.attachmentsToDelete && updateData.attachmentsToDelete.length > 0) {
                const attachmentsToDelete = await this.communityRepository.getAttachmentsByIds(
                    updateData.attachmentsToDelete,
                    postId,
                );

                for (const attachment of attachmentsToDelete) {
                    deletedS3Keys.push(attachment.file_url);
                }

                await this.communityCommand.deleteAttachments(updateData.attachmentsToDelete, postId);

                // Only delete from S3 after DB delete succeeds
                await Promise.allSettled(deletedS3Keys.map((key) => this.s3Service.delete(key)));
            }

            // 5. Upload and attach new files (same as createPost)
            if (uploadedFiles.length > 0) {
                s3UploadFiles = uploadedFiles.map((file) => {
                    const safeFileName = file.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
                    const s3Key = `${S3_BUCKET_KEY_PREFIX}/${updateData.userId}/posts/${postId}/${randomUUID()}_${safeFileName}`;
                    return { ...file, fileUrl: s3Key };
                });

                await Promise.all(s3UploadFiles.map((file) => this.s3Service.upload(file.fileUrl, file.buffer, file.fileExt)));
                await Promise.all(s3UploadFiles.map((file) => this.communityCommand.createPostAttachment(postId, file)));
            }

            const updatedPost = await this.communityRepository.getPostWithAttachments(postId);

            return { status: true, data: { post: updatedPost } };

        } catch (error) {
            console.error('SourceError:- updatePost', error, 'postId', postId, 'updateData', updateData);

            // cleanup newly uploaded files only — don't try to "undo" deletions, see note below
            if (s3UploadFiles.length > 0) {
                await Promise.allSettled(s3UploadFiles.map((file) => this.s3Service.delete(file.fileUrl)));
            }

            if (error instanceof BadRequestException || error instanceof ForbiddenException) throw error;
            throw new InternalServerErrorException(error?.message || 'Something went wrong while updating post.');
        }
    }
}