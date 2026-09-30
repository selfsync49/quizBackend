import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MockExamSubject, MockTestCategory, SubjectTest, TestQuestionOption } from "../entities";

export class DashboardRepository {
    constructor(
        @InjectRepository(MockExamSubject) private readonly mockExamSubjectRepo: Repository<MockExamSubject>,
        @InjectRepository(MockTestCategory) private readonly mockTestCategoryRepo: Repository<MockTestCategory>,
        @InjectRepository(SubjectTest) private readonly subjectTestRepo: Repository<SubjectTest>,
        @InjectRepository(TestQuestionOption) private readonly testQuestionOptionRepo: Repository<TestQuestionOption>,
    ) { }

    async getMockTestCategories() {
        try {
            const mockTests = await this.mockTestCategoryRepo.find();
            return mockTests;
        } catch (error) {
            console.error('SourceError:- getMockTests', error);
            return [];
        }
    }

    async getMockTestSubjectsByCategoryId(categoryId: string) {
        try {
            if (!categoryId) throw 'Category id is required.';
            const mockTestSubjects = await this.mockExamSubjectRepo.find(
                {
                    where: {
                        category_id: categoryId
                    }
                }
            )
            return mockTestSubjects;
        } catch (error) {
            console.error('SourceError:- getMockTestSubjectsByCategoryId', error, 'categoryId', categoryId);
            return [];
        }
    }

    async getSubjectTestsBySubjectId(subjectId: string) {
        try {
            if (!subjectId) throw 'Subject id is required.';
            const subjectTests = await this.subjectTestRepo.find(
                {
                    where: {
                        subject_id: subjectId
                    }
                }
            )
            return subjectTests;
        } catch (error) {
            console.error('SourceError:- getSubjectTestsBySubjectId', error, 'subjectId', subjectId);
            return [];
        }
    }

    async getTestQuestionsByTestId(testId: string) {
        try {
            if (!testId) throw 'Test id is required.';
            const testQuestions = await this.subjectTestRepo.query(
                `
                        SELECT
                            tq.id,
                            tq.body,
                            tq.question_type,
                            tq.sp_correct,
                            tq.sp_wrong,
                            tq.order_index,
                            COALESCE(
                                json_agg(
                                    json_build_object(
                                        'id', tqo.id,
                                        'body', tqo.body,
                                        'order_index', tqo.order_index
                                    )
                                    ORDER BY tqo.order_index
                                ) FILTER (WHERE tqo.id IS NOT NULL),
                                '[]'
                            ) AS options
                        FROM test_questions tq
                        LEFT JOIN test_question_options tqo ON tqo.question_id = tq.id
                        WHERE tq.test_id = $1
                        GROUP BY tq.id
                        ORDER BY tq.order_index;
                        `,
                [testId],
            );

            return testQuestions;

        } catch (error) {
            console.error('SourceError:- getTestQuestionsByTestId', error, 'testId', testId);
            return [];
        }
    }

    async checkCorrectAnswerByQuestionId(questionId: string, selectedOptionId: string) {
        try {
            const result = await this.testQuestionOptionRepo.findOne({
                where: {
                    id: selectedOptionId,
                    question_id: questionId,
                    is_correct: true,
                },
            });
            return !!result;
        } catch (error) {
            console.error('SourceError:- checkCorrectAnswerByQuestionId', error, 'questionId', questionId, 'selectedOptionId', selectedOptionId);
            return false;
        }
    }
}