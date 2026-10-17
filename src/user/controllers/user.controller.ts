import { Controller, Get, Post, Body, Param, Query, BadRequestException } from "@nestjs/common";
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
    async getDiscussions(@Query('category') category?: string, @Query('sort') sort?: string) {
        return this.userService.getDiscussions(category, sort);
    }

    @Post('/discussions')
    async createDiscussion(@Body() body: any) {
        return this.userService.createDiscussion(body);
    }

    @Post('/discussions/:id/vote')
    async voteDiscussion(@Param('id') id: string, @Body('delta') delta: number) {
        return this.userService.voteDiscussion(id, delta ?? 1);
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
}
