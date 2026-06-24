import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskFeedback, FeedbackAction, FeedbackGate } from '../tasks/entities/task-feedback.entity';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(TaskFeedback)
    private readonly feedbackRepo: Repository<TaskFeedback>,
  ) {}

  async record(
    taskId: string,
    gate: FeedbackGate,
    action: FeedbackAction,
    reason?: string | null,
    comments?: string | null,
  ): Promise<TaskFeedback> {
    return this.feedbackRepo.save(
      this.feedbackRepo.create({
        taskId,
        gate,
        action,
        reason: reason || null,
        comments: comments || null,
      }),
    );
  }

  async findByTask(taskId: string): Promise<TaskFeedback[]> {
    return this.feedbackRepo.find({
      where: { taskId },
      order: { createdAt: 'DESC' },
    });
  }

  async contextForTask(taskId: string): Promise<string> {
    const items = await this.findByTask(taskId);
    if (!items.length) return '';
    return items
      .slice(0, 5)
      .map(
        (f) =>
          `[${f.gate}] ${f.action}${f.reason ? ` — ${f.reason}` : ''}${f.comments ? `: ${f.comments}` : ''}`,
      )
      .join('\n');
  }
}
