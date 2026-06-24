import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RepositoryAccessLog } from './entities/repository-access-log.entity';

@Injectable()
export class RepositoryAccessLogService {
  constructor(
    @InjectRepository(RepositoryAccessLog)
    private readonly logRepo: Repository<RepositoryAccessLog>,
  ) {}

  async log(params: {
    organizationId: string;
    projectId?: string;
    action: string;
    actorId?: string;
    ipAddress?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.logRepo.save(
      this.logRepo.create({
        organizationId: params.organizationId,
        projectId: params.projectId || null,
        action: params.action,
        actorId: params.actorId || null,
        ipAddress: params.ipAddress || null,
        metadata: params.metadata || null,
      }),
    );
  }

  async list(organizationId: string, limit = 100): Promise<RepositoryAccessLog[]> {
    return this.logRepo.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
