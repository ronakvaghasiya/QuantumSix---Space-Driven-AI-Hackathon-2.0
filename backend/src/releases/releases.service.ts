import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Release } from './entities/release.entity';
import { OrganizationsService } from '../organizations/organizations.service';

@Injectable()
export class ReleasesService {
  constructor(
    @InjectRepository(Release)
    private readonly releaseRepo: Repository<Release>,
    private readonly orgs: OrganizationsService,
  ) {}

  async listByProject(projectId: string, organizationId: string): Promise<Release[]> {
    await this.orgs.assertProjectInOrg(projectId, organizationId);
    return this.releaseRepo.find({
      where: { projectId, organizationId },
      order: { createdAt: 'DESC' },
      relations: ['task'],
    });
  }

  async findOne(id: string, organizationId: string): Promise<Release> {
    const release = await this.releaseRepo.findOne({
      where: { id, organizationId },
      relations: ['task', 'project'],
    });
    if (!release) throw new NotFoundException('Release not found');
    return release;
  }

  async listByOrganization(organizationId: string, limit = 20): Promise<Release[]> {
    return this.releaseRepo.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['project', 'task'],
    });
  }
}
