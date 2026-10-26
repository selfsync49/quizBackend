import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { DashboardService } from '../services/dashboard.services';
import type { StartTestDto, SubmitAnswerDto, SubmitTestDto, UserSbumittedTestRecordDto, UserTestRecordDto } from '../dtos/dashboard.dtos';
@Controller('dashboard')
export class DashboardController {
    constructor(
        private readonly dashboardService: DashboardService
    ) { }

    @Get(':userId')
    async getUserDashboardInfo(@Param('userId') userId: string) {
        return await this.dashboardService.getUserDashboardInfo(userId);
    }
    @Get('exams/list')
    async getMockTestCategories() {
        return await this.dashboardService.getExams();
    }

    @Get('exams/subjects/:examId')
    async getExamSubjects(@Param('examId') examId: string) {
        return await this.dashboardService.getExamSubjects(examId);
    }

    @Get('subject/topics/:subjectId')
    async getSubjectsTopic(@Param('subjectId') subjectId: string) {
        return await this.dashboardService.getSubjectsTopic(subjectId);
    }

    @Get('topic-tests/:topicId')
    async getTopicTests(@Param('topicId') topicId: string) {
        return await this.dashboardService.getTopicTests(topicId);
    }

    @Get('tests/:testId')
    async getTestDetails(@Param('testId') testId: string) {
        return await this.dashboardService.getTestDetails(testId);
    }

    @Post('tests/start')
    async startTest(@Body() body: StartTestDto) {
        return await this.dashboardService.startTest(body.userId, body.testId);
    }

    @Patch('tests/answer')
    async submitAnswer(@Body() body: SubmitAnswerDto) {
        return await this.dashboardService.submitAnswer(body.userTestId, body.questionId, body.selectedOptionId);
    }

    @Patch('tests/submit')
    async submitTest(@Body() body: SubmitTestDto) {
        return await this.dashboardService.submitTest(body.userTestId);
    }

    // @Get('mock-tests/:categoryId')
    // async getMockTestSubjects(@Param('categoryId') categoryId: string) {
    //     return await this.dashboardService.getMockTestSubjects(categoryId);
    // }

    // @Get('subject-tests/:subjectId')
    // async getSubjectTests(@Param('subjectId') subjectId: string) {
    //     return await this.dashboardService.getSubjectTests(subjectId);
    // }

    // @Get('test-questions/:testId')
    // async getTestQuestions(@Param('testId') TestId: string) {
    //     return await this.dashboardService.getTestQuestions(TestId);
    // }

    // @Post('create-test/:testId/user/:userId')
    // async createUserTestRecord(@Param('testId') testId: string, @Param('userId') userId: string) {
    //     return await this.dashboardService.createUserTestRecord(testId, userId);
    // }

    // @Patch('update-test/:testId')
    // async updateUserTestRecord(
    //     @Param('testId') testId: string,
    //     @Body() body: UserTestRecordDto
    // ) {
    //     return await this.dashboardService.updateUserTestRecord(testId, body);
    // }

    // @Patch('submit-test/:testId')
    // async submitUserTest(
    //     @Param('testId') testId: string,
    //     @Body() body: UserSbumittedTestRecordDto
    // ) {
    //     return await this.dashboardService.submitUserTest(testId, body);
    // }
}