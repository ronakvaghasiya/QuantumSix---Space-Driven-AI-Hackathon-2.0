import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { CreateProjectDto, UpdateProjectDto, ConnectProjectDto } from './dto/project.dto';
import { ProjectStatus } from '../common/enums/project.enum';
import { IndexingService } from '../repository/services/indexing.service';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly indexingService: IndexingService,
  ) {}

  async findAll(): Promise<Project[]> {
    return this.projectRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Project> {
    const project = await this.projectRepo.findOne({ where: { id } });
    if (!project) throw new NotFoundException(`Project ${id} not found`);
    return project;
  }

  async create(dto: CreateProjectDto): Promise<Project> {
    const project = this.projectRepo.create({
      ...dto,
      defaultBranch: dto.defaultBranch || 'main',
      status: ProjectStatus.PENDING,
      githubRepoId: dto.githubRepoId || null,
      githubOwner: dto.githubOwner || null,
      githubRepoName: dto.githubRepoName || null,
    });
    return this.projectRepo.save(project);
  }

  async update(id: string, dto: UpdateProjectDto): Promise<Project> {
    const project = await this.findOne(id);
    Object.assign(project, dto);
    return this.projectRepo.save(project);
  }

  async remove(id: string): Promise<void> {
    const project = await this.findOne(id);
    await this.projectRepo.remove(project);
  }

  async connectRepository(id: string, dto?: ConnectProjectDto): Promise<Project> {
    const project = await this.findOne(id);

    if (dto) {
      if (dto.repositoryUrl) project.repositoryUrl = dto.repositoryUrl;
      if (dto.defaultBranch) project.defaultBranch = dto.defaultBranch;
      if (dto.githubRepoId) project.githubRepoId = dto.githubRepoId;
      if (dto.githubOwner) project.githubOwner = dto.githubOwner;
      if (dto.githubRepoName) project.githubRepoName = dto.githubRepoName;
      await this.projectRepo.save(project);
    }

    await this.indexingService.startIndexing(id);
    return this.findOne(id);
  }

  async reindexRepository(id: string): Promise<Project> {
    await this.indexingService.startIndexing(id);
    return this.findOne(id);
  }

  async syncRepository(id: string): Promise<Project> {
    return this.reindexRepository(id);
  }

  async getIndexingStatus(id: string) {
    const project = await this.findOne(id);
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
