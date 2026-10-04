import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
    UploadedFiles,
    UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CommunityService } from '../services';
import type { communityCreateDto, createcomentDto, paginationDto } from '../dtos';
import { communityPostEditDto } from '../dtos';


@Controller('community')
export class CommunityController {
    constructor(
        private readonly communityService: CommunityService,
    ) { }

    @Post('create')
    @UseInterceptors(FilesInterceptor('files', 10))
    async createCommunityPost(
        @Body() postData: communityCreateDto,
        @UploadedFiles() files: Express.Multer.File[],
    ) {
        return this.communityService.createPost(
            postData,
            files,
        );
    }

    @Get('posts')
    async getCommunityPosts(@Body() pagination: paginationDto) {
        return this.communityService.getAllPosts(pagination);
    }

    @Patch('update/:postId')
    @UseInterceptors(FilesInterceptor('files', 10))
    async updateCommunityPost(
        @Param('postId') postId: string,
        @Body() postData: communityPostEditDto,
        @UploadedFiles() files: Express.Multer.File[],
    ) {
        return this.communityService.updatePost(postId, postData, files);
    }

    @Patch('post/upvote/:postId')
    async toggleUpvote(
        @Body() body: { userId: string },
        @Param('postId') postId: string) {
        return this.communityService.toggleUpvote(body.userId, postId);
    }

    @Get('post/comments/:postId')
    async getPostComments(
        @Body() pagination: paginationDto,
        @Param('postId') postId: string) {
        return this.communityService.getPostComments(postId, pagination.limit, pagination.page);
    }

    @Get('post/comments-replies/:postId/:parentCommentId')
    async getComentReplies(
        @Body() pagination: paginationDto,
        @Param('postId') postId: string,
        @Param('parentCommentId') parentCommentId: string) {
        return this.communityService.getCommentReplies(postId, parentCommentId, pagination.limit, pagination.page);
    }

    @Post('post/comments/:postId')
    async addPostComment(
        @Body() body: createcomentDto,
        @Param('postId') postId: string) {
        return this.communityService.addPostComment(postId, body.userId, body.comment, body.parentCommentId);
    }
}