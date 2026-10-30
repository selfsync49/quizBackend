import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Exam, ExamSubject, Subject, Test, Topic, TestScope, TestQuestion } from '../entities/index';

export class DashboardRepository {
    constructor(
        @InjectRepository(Exam) private readonly examRepo: Repository<Exam>,
        @InjectRepository(ExamSubject) private readonly examSubjectRepo: Repository<ExamSubject>,
        @InjectRepository(Subject) private readonly subjectRepo: Repository<Subject>,
        @InjectRepository(Topic) private readonly topicRepo: Repository<Topic>,
        @InjectRepository(Test) private readonly testRepo: Repository<Test>,
        @InjectRepository(TestQuestion) private readonly testQuestionRepo: Repository<TestQuestion>
    ) { }

    async getMockExamsList() {
        try {
            const mockTests = await this.examRepo.find();
            return mockTests;
        } catch (error) {
            console.error('SourceError:- getMockExamsList', error);
            return [];
        }
    }

    async getExamsSubjects(examId: string) {
        try {
            if (!examId) throw 'Exam id is required.';

            const subjects = await this.examSubjectRepo.query(
                `
                    SELECT
                        s.id,
                        s.name,
                        s.description,
                        s.icon_url,
                        es.display_order,
                        COUNT(t.id)::int AS test_count
                    FROM exam_subjects es
                    INNER JOIN subjects s ON s.id = es.subject_id
                    LEFT JOIN tests t
                        ON t.exam_id = es.exam_id
                    AND t.subject_id = es.subject_id
                    AND t.scope = 'subject'
                    AND t.is_active = true
                    WHERE es.exam_id = $1
                    GROUP BY s.id, es.display_order
                    ORDER BY es.display_order ASC NULLS LAST, s.name ASC
            `,
                [examId],
            );

            return subjects;

        } catch (error) {
            console.error('SourceError:- getExamsSubjects', error, 'examId', examId);
            return [];
        }
    }

    async getSubjectTopic(subjectId: string) {
        try {
            const topics = this.topicRepo.find({
                where: { subject_id: subjectId },
                order: { name: 'ASC' },
            })

            return topics;
        } catch (error) {
            console.error('SourceError:- getSubjectTopic', error, 'subjectId', subjectId);
            return [];
        }
    }

    async getExamTests(examId: string) {
        try {
            return await this.testRepo.find({
                where: { exam_id: examId, scope: TestScope.EXAM, is_active: true }
            });
        } catch (error) {
            console.error('SourceError:- getExamTests', error, 'examId', examId);
            return [];
        }
    }

    async getSubjectTests(subjectId: string) {
        try {
            return await this.testRepo.find({
                where: { subject_id: subjectId, scope: TestScope.SUBJECT, is_active: true }
            });
        } catch (error) {
            console.error('SourceError:- getSubjectTests', error, 'subjectId', subjectId);
            return [];
        }
    }

    async getTopicTests(topicId: string) {
        try {
            const topicTests = await this.testRepo.find({
                where: { topic_id: topicId, scope: TestScope.TOPIC }
            });
            return topicTests;
        } catch (error) {
            console.error('SourceError:- getTopicTests', error, 'topicId', topicId);
            return [];
        }
    }

    async getTestDetails(testId: string) {
        try {
            const testDetails = this.testQuestionRepo.query(
                `
                select
                    tq.test_id,
                    tq.order_index,
                    qb.id as question_id,
                    qb.question_text,
                    qb.subject,
                    qb.topic,
                    qb.difficulty,
                    coalesce(
                        json_agg(
                        json_build_object(
                            'id', o.id,
                            'option_text', o.option_text,
                            'order_index', o.order_index,
                            'is_correct', o.is_correct
                        )
                        order by o.order_index
                        ) filter (where o.id is not null),
                        '[]'
                    ) as options
                    from test_questions tq
                    inner join question_bank qb on qb.id = tq.question_id
                    left join question_bank_options o on o.question_id = qb.id
                    where tq.test_id = $1
                    group by tq.test_id, tq.order_index, qb.id
                    order by tq.order_index;
                `, [testId],
            );

            return testDetails;
        } catch (error) {
            console.error('SourceError:- getTestDetails', error, 'testId', testId);
            return [];
        }
    }

    // Returns true if the given option is the correct answer for its question.
    async checkIsCorrectOption(selectedOptionId: string): Promise<boolean> {
        try {
            const rows: { is_correct: boolean }[] = await this.testQuestionRepo.query(
                `SELECT is_correct FROM question_bank_options WHERE id = $1 LIMIT 1`,
                [selectedOptionId],
            );
            return rows.length > 0 ? rows[0].is_correct : false;
        } catch (error) {
            console.error('SourceError:- checkIsCorrectOption', error, 'selectedOptionId', selectedOptionId);
            return false;
        }
    }
}