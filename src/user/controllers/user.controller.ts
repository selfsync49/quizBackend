import { Controller, Get, Post, Put, Delete, Body, Param, Query, BadRequestException } from "@nestjs/common";
import { UserService, S3Service } from "../services";

@Controller('user')
export class UserController {
    constructor(
        private readonly userService: UserService,
        private readonly s3Service: S3Service
    ) { }

    @Get('/all-users')
    async getAllUsers() {
        return this.userService.getAllUsers();
    }

    @Get('/profile/:userId')
    async getUserProfile(@Param('userId') userId: string) {
        return this.userService.getUserDetailsForDashboard(userId);
    }

    @Get('/check-username/:username')
    async checkUsername(@Param('username') username: string) {
        return this.userService.checkUsername(username);
    }

    @Post('/setup-profile')
    async setupProfile(@Body() body: any) {
        return this.userService.setupProfile(body);
    }

    @Get('/database-exams')
    async getDatabaseExams() {
        return this.userService.getDatabaseExams();
    }

    @Get('/discussions')
    async getDiscussions(
        @Query('category') category?: string,
        @Query('sort') sort?: string,
        @Query('userId') userId?: string,
    ) {
        return this.userService.getDiscussions(category, sort, userId);
    }

    @Post('/discussions')
    async createDiscussion(@Body() body: any) {
        return this.userService.createDiscussion(body);
    }

    @Post('/discussions/:id/vote')
    async voteDiscussion(
        @Param('id') id: string,
        @Body('delta') delta: number,
        @Body('userId') userId?: string,
    ) {
        return this.userService.voteDiscussion(id, delta ?? 1, userId);
    }

    @Get('/discussions/:id/comments')
    async getDiscussionComments(@Param('id') id: string) {
        return this.userService.getDiscussionComments(id);
    }

    @Post('/discussions/:id/comments')
    async addDiscussionComment(@Param('id') id: string, @Body() body: any) {
        return this.userService.addDiscussionComment(id, body);
    }

    @Put('/discussions/:id')
    async updateDiscussion(
        @Param('id') id: string,
        @Body() body: { title?: string; content?: string; category?: string },
    ) {
        return this.userService.updateDiscussion(id, body);
    }

    @Delete('/discussions/:id')
    async deleteDiscussion(@Param('id') id: string) {
        return this.userService.deleteDiscussion(id);
    }

    @Put('/discussions/comments/:commentId')
    async updateDiscussionComment(
        @Param('commentId') commentId: string,
        @Body('content') content: string,
    ) {
        return this.userService.updateDiscussionComment(commentId, content);
    }

    @Delete('/discussions/comments/:commentId')
    async deleteDiscussionComment(
        @Param('commentId') commentId: string,
        @Query('discussionId') discussionId?: string,
    ) {
        return this.userService.deleteDiscussionComment(commentId, discussionId);
    }

    @Post('/upload')
    async uploadFile(@Body() body: { fileData?: string; fileName?: string; mimeType?: string; folder?: string }) {
        if (!body.fileData || !body.fileName) {
            throw new BadRequestException('fileData (base64) and fileName are required');
        }
        const result = await this.s3Service.uploadBase64(
            body.fileData,
            body.fileName,
            body.folder || 'discussions'
        );
        return {
            success: true,
            ...result,
        };
    }

    @Post('/presigned-upload-url')
    async getPresignedUploadUrl(@Body() body: { fileName?: string; mimeType?: string; folder?: string }) {
        if (!body.fileName) {
            throw new BadRequestException('fileName is required');
        }
        const result = this.s3Service.getPresignedUploadUrl(
            body.fileName,
            body.mimeType || 'application/octet-stream',
            body.folder || 'discussions'
        );
        return {
            success: true,
            ...result,
        };
    }

    @Post('/referral/claim')
    async claimReferral(@Body() body: { userId: string; referralCode: string }) {
        if (!body.userId || !body.referralCode) {
            throw new BadRequestException('userId and referralCode are required');
        }
        return this.userService.claimReferral(body.userId, body.referralCode);
    }

    @Get('/referral/info/:userId')
    async getReferralInfo(@Param('userId') userId: string) {
        return this.userService.getReferralInfo(userId);
    }
}
