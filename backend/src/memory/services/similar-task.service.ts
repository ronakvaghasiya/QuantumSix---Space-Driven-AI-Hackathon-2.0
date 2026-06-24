import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Task } from '../../tasks/entities/task.entity';
import { TaskMemory } from '../entities/task-memory.entity';
import { EmbeddingService, TaskMemorySearchResult } from '../../repository/services/embedding.service';

export interface SimilarTaskResult extends TaskMemorySearchResult {
  taskDisplayId?: string;
  similarity: number;
}

@Injectable()
export class SimilarTaskService {
  private readonly logger = new Logger(SimilarTaskService.name);

  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(TaskMemory)
    private readonly memoryRepo: Repository<TaskMemory>,
    private readonly embedding: EmbeddingService,
  ) {}

  async findSimilarForTask(taskId: string, limit = 5): Promise<SimilarTaskResult[]> {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) return [];
    return this.searchByRequirement(task.projectId, task.requirement, limit, taskId);
  }

  async searchByRequirement(
    projectId: string,
    requirement: string,
    limit = 5,
    excludeTaskId?: string,
  ): Promise<SimilarTaskResult[]> {
    let vectorResults: TaskMemorySearchResult[] = [];
    try {
      vectorResults = await this.embedding.searchTaskMemory(
        projectId,
        requirement,
        limit,
        excludeTaskId,
      );
    } catch (error) {
      this.logger.warn(
        `Vector similar-task search failed for project ${projectId}: ${(error as Error).message}`,
      );
    }

    if (vectorResults.length > 0) {
      return this.enrichResults(vectorResults);
    }

    return this.fallbackSearch(projectId, requirement, limit, excludeTaskId);
  }

  private async fallbackSearch(
    projectId: string,
    requirement: string,
    limit: number,
    excludeTaskId?: string,
  ): Promise<SimilarTaskResult[]> {
    const memories = await this.memoryRepo.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    const queryTokens = new Set(this.tokenize(requirement));
    const scored = memories
      .filter((m) => m.taskId !== excludeTaskId)
      .map((m) => {
        const tokens = new Set(this.tokenize(m.requirement));
        const intersection = [...queryTokens].filter((t) => tokens.has(t)).length;
        const union = new Set([...queryTokens, ...tokens]).size || 1;
        const score = intersection / union;
        return {
          taskId: m.taskId,
          requirement: m.requirement,
          outcome: m.outcome,
          riskLevel: m.riskLevel,
          impactedFiles: m.impactedFiles,
          score,
          similarity: Math.round(score * 100),
        };
      })
      .filter((r) => r.score > 0.05)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return this.enrichResults(scored);
  }

  async failureRateForSimilar(
    projectId: string,
    requirement: string,
    limit = 5,
  ): Promise<number> {
    const similar = await this.searchByRequirement(projectId, requirement, limit);
    if (similar.length === 0) return 0;
    const failed = similar.filter((s) => s.outcome === 'failed' || s.outcome === 'rejected').length;
    return failed / similar.length;
  }

  private async enrichResults(results: TaskMemorySearchResult[]): Promise<SimilarTaskResult[]> {
    const taskIds = results.map((r) => r.taskId);
    const tasks = taskIds.length
      ? await this.taskRepo.find({ where: { id: In(taskIds) } })
      : [];
    const taskMap = new Map(tasks.map((t) => [t.id, t]));

    return results.map((r) => ({
      ...r,
      taskDisplayId: taskMap.get(r.taskId)?.taskId,
      similarity: Math.round(r.score * 100),
    }));
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2);
  }
}
