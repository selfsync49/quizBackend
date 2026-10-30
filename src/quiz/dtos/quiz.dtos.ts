import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class SubmitAnswerDto {
    @IsString()
    @IsNotEmpty()
    questionId: string;

    @IsString()
    @IsNotEmpty()
    selectedOptionId: string;

    @IsBoolean()
    @IsOptional()
    isCorrect?: boolean;

    @IsNumber()
    @IsOptional()
    spDelta?: number;

    @IsNumber()
    @IsOptional()
    timeTakenMs?: number;
}

export class SubmitQuizAttemptDto {
    @IsString()
    @IsNotEmpty()
    userId: string;

    @IsString()
    @IsNotEmpty()
    quizId: string;

    @IsNumber()
    @IsOptional()
    score?: number;

    @IsNumber()
    @IsNotEmpty()
    spEarned: number;

    @IsNumber()
    @IsOptional()
    correctCount?: number;

    @IsNumber()
    @IsOptional()
    wrongCount?: number;

    @IsNumber()
    @IsOptional()
    unansweredCount?: number;

    @IsArray()
    @IsOptional()
    answers?: SubmitAnswerDto[];
}
