import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Quiz } from '../entities/quiz.entity';

@Injectable()
export class QuizCommand {
    constructor(
        @InjectRepository(Quiz) private readonly quizRepo: Repository<Quiz>,
        private readonly dataSource: DataSource,
    ) { }

    // Placeholder — write operations (create/update quiz, etc.) go here
}
