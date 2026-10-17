import { Module } from '@nestjs/common';
import { CommunityController } from './controllers';
import { CommunityService } from './services';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post, PostAttachment, PostComment, PostUpvote } from './entities';
import { CommunityCommand } from './command';
import { CommunityRepository } from './repositories';
import { S3Module } from 'src/shared-svc';

@Module({
  imports: [S3Module,TypeOrmModule.forFeature([Post, PostAttachment, PostComment, PostUpvote])],
  controllers: [CommunityController],
  providers: [CommunityService, CommunityCommand, CommunityRepository]
})
export class CommunityModule {}
