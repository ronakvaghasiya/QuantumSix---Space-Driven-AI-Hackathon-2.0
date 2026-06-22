import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { RepositoryFile } from '../entities/repository-file.entity';
import { IndexingJob } from '../entities/indexing-job.entity';
import { ProjectStatus, IndexingJobStatus } from '../../common/enums/project.enum';
import { ScannerService } from './scanner.service';
import { EmbeddingService } from './embedding.service';
import { DependencyGraphService } from './dependency-graph.service';
import { GitLabService } from '../../gitlab/gitlab.service';
import { ParsedFileMetadata, FileChunk } from '../interfaces/repository.interfaces';
import * as fs from 'fs';
import * as path from 'path';
import simpleGit from 'simple-git';

@Injectable()
export class IndexingService implements OnModuleInit {
  private readonly logger = new Logger(IndexingService.name);
  private readonly activeJobs = new Map<string, Promise<void>>();

  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(RepositoryFile)
    private readonly fileRepo: Repository<RepositoryFile>,
    @InjectRepository(IndexingJob)
    private readonly jobRepo: Repository<IndexingJob>,
    private readonly scanner: ScannerService,
    private readonly embedding: EmbeddingService,
    private readonly dependencyGraph: DependencyGraphService,
    private readonly gitlab: GitLabService,
  ) {}

  async onModuleInit(): Promise<void> {
    const staleProjects = await this.projectRepo.find({
      where: { status: ProjectStatus.INDEXING },
    });
    for (const project of staleProjects) {
      if (this.activeJobs.has(project.id)) continue;
      const message = 'Indexing was interrupted (server restart). Click Reindex to continue.';
      await this.projectRepo.update(project.id, {
        status: ProjectStatus.FAILED,
        indexingError: message,
      });
      const job = await this.jobRepo.findOne({
        where: { projectId: project.id },
        order: { createdAt: 'DESC' },
      });
      if (job && job.status !== IndexingJobStatus.COMPLETED && job.status !== IndexingJobStatus.FAILED) {
        await this.jobRepo.update(job.id, {
          status: IndexingJobStatus.FAILED,
          errorMessage: message,
          completedAt: new Date(),
        });
      }
      this.logger.warn(`Marked stale indexing job as failed for ${project.name}`);
    }
  }

  async startIndexing(projectId: string): Promise<IndexingJob> {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    if (this.activeJobs.has(projectId)) {
      const existingJob = await this.jobRepo.findOne({
        where: { projectId },
        order: { createdAt: 'DESC' },
      });
      if (existingJob) return existingJob;
    }

    const job = await this.jobRepo.save(
      this.jobRepo.create({
        projectId,
        status: IndexingJobStatus.PENDING,
        progress: 0,
        currentStep: 'Queued',
        startedAt: new Date(),
      }),
    );

    await this.projectRepo.update(projectId, {
      status: ProjectStatus.INDEXING,
      indexingProgress: 0,
      indexingError: null,
    });

    const jobPromise = this.runIndexingPipeline(project, job.id).finally(() => {
      this.activeJobs.delete(projectId);
    });
    this.activeJobs.set(projectId, jobPromise);

    return job;
  }

  async getIndexingStatus(projectId: string): Promise<IndexingJob | null> {
    return this.jobRepo.findOne({
      where: { projectId },
      order: { createdAt: 'DESC' },
    });
  }

  private async runIndexingPipeline(project: Project, jobId: string): Promise<void> {
    const reposPath = process.env.REPOS_BASE_PATH || '/tmp/sdlc-repos';
    const clonePath = path.join(reposPath, project.id);

    try {
      await this.updateJob(jobId, IndexingJobStatus.CLONING, 5, 'Cloning repository');
      await this.cloneRepository(project, clonePath);
      await this.projectRepo.update(project.id, { clonePath });

      await this.updateJob(jobId, IndexingJobStatus.SCANNING, 15, 'Scanning files');
      const absolutePaths = this.scanner.discoverFiles(clonePath);
      await this.jobRepo.update(jobId, { totalFiles: absolutePaths.length });

      await this.fileRepo.delete({ projectId: project.id });

      await this.updateJob(jobId, IndexingJobStatus.PARSING, 25, 'Parsing files');
      const parsedFiles: ParsedFileMetadata[] = [];
      const allChunks: FileChunk[] = [];

      for (let i = 0; i < absolutePaths.length; i++) {
        const parsed = this.scanner.parseFile(clonePath, absolutePaths[i]);
        if (!parsed) continue;

        parsedFiles.push(parsed);
        const chunks = this.scanner.chunkFile(parsed);
        allChunks.push(...chunks);

        await this.fileRepo.save(
          this.fileRepo.create({
            projectId: project.id,
            filePath: parsed.filePath,
            imports: parsed.imports,
            exports: parsed.exports,
            functions: parsed.functions,
            components: parsed.components,
            hooks: parsed.hooks,
            contexts: parsed.contexts,
            services: parsed.services,
            utilities: parsed.utilities,
            graphqlQueries: parsed.graphqlQueries,
            keywords: parsed.keywords,
            lineCount: parsed.lineCount,
            chunkCount: chunks.length,
          }),
        );

        const parseProgress = 25 + Math.floor((i / absolutePaths.length) * 30);
        await this.updateJob(jobId, IndexingJobStatus.PARSING, parseProgress, `Parsing ${parsed.filePath}`, i + 1);
        await this.projectRepo.update(project.id, {
          indexingProgress: parseProgress,
          filesIndexed: parsedFiles.length,
        });
      }

      await this.updateJob(jobId, IndexingJobStatus.EMBEDDING, 55, 'Generating embeddings');
      await this.embedding.embedAndStore(project.id, allChunks, async (processed, total) => {
        const progress = 55 + Math.floor((processed / total) * 30);
        await this.updateJob(jobId, IndexingJobStatus.EMBEDDING, progress, `Embedding ${processed}/${total}`);
        await this.projectRepo.update(project.id, { indexingProgress: progress });
      });

      await this.updateJob(jobId, IndexingJobStatus.BUILDING_GRAPH, 90, 'Building dependency graph');
      await this.dependencyGraph.buildGraph(project.id, parsedFiles);

      await this.updateJob(jobId, IndexingJobStatus.COMPLETED, 100, 'Repository ready');
      await this.projectRepo.update(project.id, {
        status: ProjectStatus.COMPLETED,
        indexingProgress: 100,
        filesIndexed: parsedFiles.length,
        lastScanAt: new Date(),
        indexingError: null,
      });

      this.logger.log(`Indexed ${parsedFiles.length} files for project ${project.name}`);
    } catch (err) {
      const message = (err as Error).message;
      this.logger.error(`Indexing failed for ${project.name}: ${message}`);
      await this.updateJob(jobId, IndexingJobStatus.FAILED, 0, 'Failed', undefined, message);
      await this.projectRepo.update(project.id, {
        status: ProjectStatus.FAILED,
        indexingError: message,
      });
    }
  }

  private async cloneRepository(project: Project, clonePath: string): Promise<void> {
    const reposPath = path.dirname(clonePath);
    if (!fs.existsSync(reposPath)) {
      fs.mkdirSync(reposPath, { recursive: true });
    }

    let cloneUrl = project.repositoryUrl;
    try {
      cloneUrl = await this.gitlab.buildAuthenticatedCloneUrl(project.repositoryUrl);
    } catch {
      this.logger.warn('No GitLab auth — cloning without token (public repos only)');
    }

    const git = simpleGit();
    if (fs.existsSync(clonePath)) {
      try {
        await git.cwd(clonePath).fetch().catch(() => undefined);
        await git.cwd(clonePath).checkout(project.defaultBranch);
        await git.cwd(clonePath).pull('origin', project.defaultBranch).catch(() => undefined);
      } catch {
        fs.rmSync(clonePath, { recursive: true, force: true });
        await git.clone(cloneUrl, clonePath, [
          '--branch', project.defaultBranch,
          '--single-branch',
          '--depth', '1',
        ]);
      }
    } else {
      await git.clone(cloneUrl, clonePath, [
        '--branch', project.defaultBranch,
        '--single-branch',
        '--depth', '1',
      ]);
    }
  }

  private async updateJob(
    jobId: string,
    status: IndexingJobStatus,
    progress: number,
    currentStep: string,
    processedFiles?: number,
    errorMessage?: string,
  ): Promise<void> {
    const update: Record<string, unknown> = {
      status,
      progress,
      currentStep,
      ...(processedFiles !== undefined && { processedFiles }),
      ...(errorMessage && { errorMessage }),
      ...(status === IndexingJobStatus.COMPLETED && { completedAt: new Date() }),
      ...(status === IndexingJobStatus.FAILED && { completedAt: new Date() }),
    };
    await this.jobRepo.update(jobId, update);
  }
}
