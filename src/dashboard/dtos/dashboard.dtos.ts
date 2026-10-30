import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UserTestRecordDto {
    @IsString()
    @IsNotEmpty()
    userId: string;

    @IsString()
    @IsNotEmpty()
    userTestId: string;

    @IsString()
    @IsNotEmpty()
    questionId: string;

    @IsString()
    @IsNotEmpty()
    selectedOptionId: string;
}

export class UserSbumittedTestRecordDto {
    @IsString()
    @IsNotEmpty()
    userId: string;

    @IsString()
    @IsNotEmpty()
    userTestId: string;
}

export class StartTestDto {
    @IsString()
    @IsNotEmpty()
    userId: string;

    @IsString()
    @IsNotEmpty()
    testId: string;

    @IsBoolean()
    @IsOptional()
    restart?: boolean;
}

export class SubmitAnswerDto {
    @IsString()
    @IsNotEmpty()
    userTestId: string;

    @IsString()
    @IsNotEmpty()
    questionId: string;

    @IsString()
    @IsNotEmpty()
    selectedOptionId: string; // uuid of the chosen option
}

export class SubmitTestDto {
    @IsString()
    @IsNotEmpty()
    userTestId: string;

    @IsString()
    @IsOptional()
    userId?: string;
}

export class FlagQuestionDto {
    @IsString()
    @IsNotEmpty()
    userId: string;

    @IsString()
    @IsNotEmpty()
    testId: string;

    @IsString()
    @IsNotEmpty()
    questionId: string;

    @IsString()
    @IsOptional()
    description?: string;
}
