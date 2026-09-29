import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MockExamSubject, MockTestCategory, SubjectTest } from "../entities";

export class DashboardRepository {
    constructor(
        @InjectRepository(MockExamSubject) private readonly mockExamSubjectRepo: Repository<MockExamSubject>,
        @InjectRepository(MockTestCategory) private readonly mockTestCategoryRepo: Repository<MockTestCategory>,
        @InjectRepository(SubjectTest) private readonly subjectTestRepo: Repository<SubjectTest>,
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
}