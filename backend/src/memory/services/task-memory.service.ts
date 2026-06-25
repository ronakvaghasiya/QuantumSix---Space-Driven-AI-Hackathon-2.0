import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskMemory } from '../entities/task-memory.entity';
import { Task } from '../../tasks/entities/task.entity';
import { TaskAnalysis } from '../../tasks/entities/task-analysis.entity';
import { EmbeddingService } from '../../repository/services/embedding.service';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class TaskMemoryService {
  private readonly logger = new Logger(TaskMemoryService.name);

  constructor(
    @InjectRepository(TaskMemory)
    private readonly memoryRepo: Repository<TaskMemory>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(TaskAnalysis)
    private readonly analysisRepo: Repository<TaskAnalysis>,
    private readonly embedding: EmbeddingService,
    private readonly audit: AuditService,
  ) {}

  async indexTask(taskId: string, outcome: string): Promise<TaskMemory | null> {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) return null;

    const analysis = await this.analysisRepo.findOne({
      where: { taskId },
      order: { createdAt: 'DESC' },
    });
    const impactedFiles = (analysis?.impactedFiles || []).map(
      (f: { path?: string } | string) => (typeof f === 'string' ? f : f.path || ''),
    ).filter(Boolean);

    let existing = await this.memoryRepo.findOne({ where: { taskId } });
    if (existing?.qdrantPointId) {
      await this.embedding.deleteTaskMemoryPoint(existing.qdrantPointId);
    }

    let pointId: string | null = null;
    try {
      pointId = await this.embedding.upsertTaskMemory(task.projectId, taskId, task.requirement, {
        outcome,
        riskLevel: task.risk,
        impactedFiles,
      });
    } catch (error) {
      this.logger.warn(`Qdrant task memory upsert failed for ${taskId}: ${(error as Error).message}`);
    }

    const lessons = {
      acceptanceCriteria: task.acceptanceCriteria,
      keywords: task.keywords,
      businessImpact: task.businessImpact,
    };

    if (existing) {
      existing.outcome = outcome;
      existing.riskLevel = task.risk;
      existing.impactedFiles = impactedFiles;
      existing.lessons = lessons;
      existing.qdrantPointId = pointId;
      existing = await this.memoryRepo.save(existing);
    } else {
      existing = await this.memoryRepo.save(
        this.memoryRepo.create({
          taskId,
          projectId: task.projectId,
          requirement: task.requirement,
          outcome,
          riskLevel: task.risk,
          impactedFiles,
          lessons,
          qdrantPointId: pointId,
        }),
      );
    }

    await this.audit.log('task', taskId, 'task_memory_indexed', { outcome, pointId });
    this.logger.log(`Task memory indexed for ${taskId} (${outcome})`);
    return existing;
  }

  async getByProject(projectId: string, limit = 50): Promise<TaskMemory[]> {
    return this.memoryRepo.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async purgeTask(taskId: string): Promise<void> {
    const rows = await this.memoryRepo.find({ where: { taskId } });
    for (const row of rows) {
      if (row.qdrantPointId) {
        await this.embedding.deleteTaskMemoryPoint(row.qdrantPointId).catch(() => undefined);
      }
    }
    await this.memoryRepo.delete({ taskId });
  }
}
