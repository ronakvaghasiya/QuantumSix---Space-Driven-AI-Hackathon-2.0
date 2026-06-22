import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GitLabController } from './gitlab.controller';
import { GitLabService } from './gitlab.service';
import { GitLabConnection } from './entities/gitlab-connection.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GitLabConnection])],
  controllers: [GitLabController],
  providers: [GitLabService],
  exports: [GitLabService],
})
export class GitLabModule {}
