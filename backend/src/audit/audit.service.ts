import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async log(
    entityType: string,
    entityId: string,
    action: string,
    payload?: Record<string, unknown>,
    actor = 'user',
    organizationId?: string | null,
  ): Promise<AuditLog> {
    return this.auditRepo.save(
      this.auditRepo.create({
        entityType,
        entityId,
        actor,
        action,
        payload: payload || null,
        organizationId: organizationId || null,
      }),
    );
  }

  async findByOrganization(organizationId: string, limit = 200): Promise<AuditLog[]> {
    return this.auditRepo.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async exportCsv(organizationId: string, days = 90): Promise<string> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const logs = await this.auditRepo
      .createQueryBuilder('a')
      .leftJoin('tasks', 't', "a.entity_type = 'task' AND t.id::text = a.entity_id")
      .leftJoin('projects', 'p', 't.project_id = p.id')
      .where('(a.organization_id = :organizationId OR p.organization_id = :organizationId)', {
        organizationId,
      })
      .andWhere('a.created_at >= :since', { since })
      .orderBy('a.created_at', 'ASC')
      .getMany();

    const header = 'id,created_at,entity_type,entity_id,actor,action,payload';
    const rows = logs.map((l) => {
      const payload = l.payload ? JSON.stringify(l.payload).replace(/"/g, '""') : '';
      return [
        l.id,
        l.createdAt.toISOString(),
        l.entityType,
        l.entityId,
        l.actor,
        l.action,
        `"${payload}"`,
      ].join(',');
    });

    return [header, ...rows].join('\n');
  }

  async findByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    return this.auditRepo.find({
      where: { entityType, entityId },
      order: { createdAt: 'ASC' },
    });
  }
}
