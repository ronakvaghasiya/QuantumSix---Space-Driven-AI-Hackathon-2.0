import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskFeedback } from '../tasks/entities/task-feedback.entity';
import { FeedbackService } from './feedback.service';

@Module({
  imports: [TypeOrmModule.forFeature([TaskFeedback])],
  providers: [FeedbackService],
  exports: [FeedbackService],
})
export class FeedbackModule {}
