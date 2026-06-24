import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { ReindexEvent } from '../../memory/entities/reindex-event.entity';
import { IndexingService } from '../../repository/services/indexing.service';
import { AuditService } from '../../audit/audit.service';
import { ProjectStatus } from '../../common/enums/project.enum';

const STALE_HOURS = 24;

@Injectable()
export class AutoReindexService {
  private readonly logger = new Logger(AutoReindexService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(ReindexEvent)
    private readonly eventRepo: Repository<ReindexEvent>,
    private readonly indexing: IndexingService,
    private readonly audit: AuditService,
  ) {}

  @Cron(CronExpression.EVERY_6_HOURS)
  async runScheduledReindex(): Promise<void> {
    const staleBefore = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000);
    const projects = await this.projectRepo.find({
      where: { autoReindexEnabled: true, status: ProjectStatus.COMPLETED },
    });

    for (const project of projects) {
      if (project.lastReindexAt && project.lastReindexAt > staleBefore) continue;
      try {
        await this.triggerReindex(project.id, 'cron');
      } catch (err) {
        this.logger.warn(`Scheduled reindex failed for ${project.id}: ${(err as Error).message}`);
      }
    }
  }

  async triggerReindex(
    projectId: string,
    triggerSource: string,
    options?: { changedFiles?: string[]; commitSha?: string; branch?: string },
  ): Promise<ReindexEvent> {
    const event = await this.eventRepo.save(
      this.eventRepo.create({
        projectId,
        triggerSource,
        branch: options?.branch || null,
        commitSha: options?.commitSha || null,
        changedFiles: options?.changedFiles || [],
        status: 'running',
      }),
    );

    try {
      await this.indexing.startIncrementalIndexing(projectId, {
        changedFiles: options?.changedFiles,
        commitSha: options?.commitSha,
        branch: options?.branch,
        trigger: triggerSource,
      });
      await this.eventRepo.update(event.id, { status: 'completed' });
      await this.projectRepo.update(projectId, { lastReindexAt: new Date() });
      await this.audit.log('project', projectId, 'auto_reindex', {
        trigger: triggerSource,
        changedFiles: options?.changedFiles?.length || 0,
      });
    } catch (err) {
      const message = (err as Error).message;
      await this.eventRepo.update(event.id, { status: 'failed', errorMessage: message });
      throw err;
    }

    return this.eventRepo.findOneOrFail({ where: { id: event.id } });
  }

  async getEvents(projectId: string, limit = 20): Promise<ReindexEvent[]> {
    return this.eventRepo.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
