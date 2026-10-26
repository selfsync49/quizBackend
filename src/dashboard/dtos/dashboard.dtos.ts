export class UserTestRecordDto {
    userId: string;
    userTestId: string;
    questionId: string;
    selectedOptionId: string;
}

export class UserSbumittedTestRecordDto {
    userId: string;
    userTestId: string;
}

export class StartTestDto {
    userId: string;
    testId: string;
}

export class SubmitAnswerDto {
    userTestId: string;
    questionId: string;
    selectedOptionId: string;   // uuid of the chosen option
}

export class SubmitTestDto {
    userTestId: string;
    userId: string;
}
