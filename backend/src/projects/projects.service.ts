import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { CreateProjectDto, UpdateProjectDto, ConnectProjectDto } from './dto/project.dto';
import { ProjectStatus } from '../common/enums/project.enum';
import { IndexingService } from '../repository/services/indexing.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { BillingService } from '../billing/services/billing.service';
import { QuotaMetric } from '../common/enums/usage.enum';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly indexingService: IndexingService,
    private readonly orgs: OrganizationsService,
    private readonly billing: BillingService,
  ) {}

  async findAll(organizationId: string): Promise<Project[]> {
    return this.projectRepo.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, organizationId: string): Promise<Project> {
    return this.orgs.assertProjectInOrg(id, organizationId);
  }

  async create(dto: CreateProjectDto, organizationId: string): Promise<Project> {
    await this.billing.assertQuota(organizationId, QuotaMetric.PROJECTS);

    const project = this.projectRepo.create({
      ...dto,
      organizationId,
      defaultBranch: dto.defaultBranch || 'main',
      status: ProjectStatus.PENDING,
      githubRepoId: dto.githubRepoId || null,
      githubOwner: dto.githubOwner || null,
      githubRepoName: dto.githubRepoName || null,
    });
    return this.projectRepo.save(project);
  }

  async update(id: string, dto: UpdateProjectDto, organizationId: string): Promise<Project> {
    const project = await this.findOne(id, organizationId);
    Object.assign(project, dto);
    return this.projectRepo.save(project);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const project = await this.findOne(id, organizationId);
    await this.projectRepo.remove(project);
  }

  async connectRepository(
    id: string,
    organizationId: string,
    dto?: ConnectProjectDto,
  ): Promise<Project> {
    const project = await this.findOne(id, organizationId);

    if (dto) {
      if (dto.repositoryUrl) project.repositoryUrl = dto.repositoryUrl;
      if (dto.defaultBranch) project.defaultBranch = dto.defaultBranch;
      if (dto.githubRepoId) project.githubRepoId = dto.githubRepoId;
      if (dto.githubOwner) project.githubOwner = dto.githubOwner;
      if (dto.githubRepoName) project.githubRepoName = dto.githubRepoName;
      await this.projectRepo.save(project);
    }

    await this.indexingService.startIndexing(id);
    return this.findOne(id, organizationId);
  }

  async reindexRepository(id: string, organizationId: string): Promise<Project> {
    await this.orgs.assertProjectInOrg(id, organizationId);
    await this.indexingService.startIndexing(id);
    return this.findOne(id, organizationId);
  }

  async syncRepository(id: string, organizationId: string): Promise<Project> {
    return this.reindexRepository(id, organizationId);
  }

  async getIndexingStatus(id: string, organizationId: string) {
    const project = await this.findOne(id, organizationId);
    const job = await this.indexingService.getIndexingStatus(id);
    return {
      project: {
        id: project.id,
        status: project.status,
        indexingProgress: project.indexingProgress,
        filesIndexed: project.filesIndexed,
        indexingError: project.indexingError,
      },
      job,
    };
  }
}
