import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuizController } from './controllers';
import { QuizService } from './services';
import { QuizRepository } from './repositories';
import { QuizCommand } from './commands';
import { Quiz, Question } from './entities';
import { RedisModule } from 'src/shared-svc';

@Module({
  imports: [
    RedisModule,
    TypeOrmModule.forFeature([Quiz, Question]),
  ],
  controllers: [QuizController],
  providers: [QuizService, QuizRepository, QuizCommand],
  exports: [QuizService],
})
export class QuizModule { }


// Flow of quizes 

// User requests quiz for morning 

// - Check if any quiz scheduled for that time or not if it is null give user the quiz

// if 
//     yes return that quiz 

// else 
//     ask user to wait 

// How does the quiz answer submission works 

// - Add a col to quiz attempts DB named: - time Took in MS - will help us in ranking user based on time when their scores are same 

// - when a user starts a quiz create an entry in quiz attempts 

// - when user submits any answers create entries into attempt answers with details and then update the quiz attempts 

// - Make sure there is a backend compatibility if any user re answer any specific question just like we did in mock test 

