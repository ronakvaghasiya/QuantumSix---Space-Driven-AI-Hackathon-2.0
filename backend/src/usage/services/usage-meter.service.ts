import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UsageEvent } from '../entities/usage-event.entity';
import { UsageMetric } from '../entities/usage-metric.entity';
import { UsageMetricType } from '../../common/enums/usage.enum';
import { Project } from '../../projects/entities/project.entity';

export interface RecordUsageInput {
  organizationId: string;
  projectId?: string | null;
  taskId?: string | null;
  metricType: UsageMetricType;
  quantity: number;
  unit?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class UsageMeterService {
  private readonly logger = new Logger(UsageMeterService.name);

  constructor(
    @InjectRepository(UsageEvent)
    private readonly eventRepo: Repository<UsageEvent>,
    @InjectRepository(UsageMetric)
    private readonly metricRepo: Repository<UsageMetric>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  async record(input: RecordUsageInput): Promise<void> {
    await this.eventRepo.save(
      this.eventRepo.create({
        organizationId: input.organizationId,
        projectId: input.projectId || null,
        taskId: input.taskId || null,
        metricType: input.metricType,
        quantity: input.quantity,
        unit: input.unit || 'count',
        metadata: input.metadata || null,
      }),
    );
    await this.incrementMonthlyRollup(input);
  }

  async recordForProject(
    projectId: string,
    metricType: UsageMetricType,
    quantity: number,
    options?: { taskId?: string; unit?: string; metadata?: Record<string, unknown> },
  ): Promise<void> {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project?.organizationId) return;

    await this.record({
      organizationId: project.organizationId,
      projectId,
      taskId: options?.taskId,
      metricType,
      quantity,
      unit: options?.unit,
      metadata: options?.metadata,
    });
  }

  async getCurrentMonthUsage(organizationId: string): Promise<UsageMetric> {
    const { year, month } = this.currentPeriod();
    let row = await this.metricRepo.findOne({
      where: { organizationId, year, month },
    });
    if (!row) {
      row = await this.rebuildMonth(organizationId, year, month);
    }
    return row;
  }

  async getUsageHistory(organizationId: string, months = 6): Promise<UsageMetric[]> {
    const results: UsageMetric[] = [];
    const now = new Date();
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      let row = await this.metricRepo.findOne({ where: { organizationId, year, month } });
      if (!row) row = await this.rebuildMonth(organizationId, year, month);
      results.push(row);
    }
    return results;
  }

  async countTasksThisMonth(organizationId: string): Promise<number> {
    const usage = await this.getCurrentMonthUsage(organizationId);
    return usage.tasksProcessed;
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async rollupYesterday(): Promise<void> {
    const orgIds = await this.eventRepo
      .createQueryBuilder('e')
      .select('DISTINCT e.organization_id', 'organizationId')
      .where('e.created_at >= NOW() - INTERVAL \'2 days\'')
      .getRawMany<{ organizationId: string }>();

    const { year, month } = this.currentPeriod();
    for (const { organizationId } of orgIds) {
      try {
        await this.rebuildMonth(organizationId, year, month);
      } catch (err) {
        this.logger.warn(`Rollup failed for ${organizationId}: ${(err as Error).message}`);
      }
    }
  }

  private async incrementMonthlyRollup(input: RecordUsageInput): Promise<void> {
    const { year, month } = this.currentPeriod();
    let row = await this.metricRepo.findOne({
      where: { organizationId: input.organizationId, year, month },
    });
    if (!row) {
      row = this.metricRepo.create({
        organizationId: input.organizationId,
        year,
        month,
      });
    }

    switch (input.metricType) {
      case UsageMetricType.OPENAI_TOKENS:
      case UsageMetricType.EMBEDDING_TOKENS:
        row.tokensUsed = Number(row.tokensUsed) + input.quantity;
        break;
      case UsageMetricType.HF_REQUESTS:
        row.requestsUsed = Number(row.requestsUsed) + input.quantity;
        break;
      case UsageMetricType.TASK_EXECUTION:
        row.tasksProcessed += input.quantity;
        break;
      case UsageMetricType.PLAYWRIGHT_RUN:
        row.playwrightRuns += input.quantity;
        break;
      case UsageMetricType.STORAGE_BYTES:
        row.storageUsed = Number(row.storageUsed) + input.quantity;
        break;
    }

    await this.metricRepo.save(row);
  }

  private async rebuildMonth(organizationId: string, year: number, month: number): Promise<UsageMetric> {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const events = await this.eventRepo.find({
      where: {
        organizationId,
        createdAt: Between(start, end),
      },
    });

    const rollup = this.metricRepo.create({
      organizationId,
      year,
      month,
      tokensUsed: 0,
      requestsUsed: 0,
      tasksProcessed: 0,
      storageUsed: 0,
      playwrightRuns: 0,
    });

    for (const e of events) {
      const q = Number(e.quantity);
      switch (e.metricType) {
        case UsageMetricType.OPENAI_TOKENS:
        case UsageMetricType.EMBEDDING_TOKENS:
          rollup.tokensUsed = Number(rollup.tokensUsed) + q;
          break;
        case UsageMetricType.HF_REQUESTS:
          rollup.requestsUsed = Number(rollup.requestsUsed) + q;
          break;
        case UsageMetricType.TASK_EXECUTION:
          rollup.tasksProcessed += q;
          break;
        case UsageMetricType.PLAYWRIGHT_RUN:
          rollup.playwrightRuns += q;
          break;
        case UsageMetricType.STORAGE_BYTES:
          rollup.storageUsed = Number(rollup.storageUsed) + q;
          break;
      }
    }

    const existing = await this.metricRepo.findOne({ where: { organizationId, year, month } });
    if (existing) {
      Object.assign(existing, rollup);
      return this.metricRepo.save(existing);
    }
    return this.metricRepo.save(rollup);
  }

  private currentPeriod(): { year: number; month: number } {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
}
