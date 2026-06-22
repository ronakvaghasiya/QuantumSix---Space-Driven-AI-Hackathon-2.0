import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { RepositoryFile } from '../entities/repository-file.entity';
import { ProjectStatus } from '../../common/enums/project.enum';
import { EmbeddingService } from './embedding.service';
import { DependencyGraphService } from './dependency-graph.service';
import { RepositorySearchDto, RepositoryIntelligenceDto } from '../dto/repository.dto';

export interface SearchResultItem {
  file: string;
  score: number;
  chunkText?: string;
  confidence?: number;
}

export interface RepositoryIntelligenceResult {
  relevantFiles: { file: string; score: number; confidence: number }[];
  confidenceScores: { file: string; confidence: number }[];
  dependencyGraph: { source: string; target: string; relationType: string }[];
  adjacencyList: Record<string, string[]>;
  keywords: string[];
}

@Injectable()
export class RepositorySearchService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(RepositoryFile)
    private readonly fileRepo: Repository<RepositoryFile>,
    private readonly embedding: EmbeddingService,
    private readonly dependencyGraph: DependencyGraphService,
  ) {}

  async search(dto: RepositorySearchDto): Promise<{ results: SearchResultItem[] }> {
    const project = await this.projectRepo.findOne({ where: { id: dto.projectId } });
    if (!project) throw new BadRequestException('Project not found');
    if (project.status !== ProjectStatus.COMPLETED) {
      throw new BadRequestException('Repository indexing not completed');
    }

    const limit = dto.limit || 10;
    const rawResults = await this.embedding.search(dto.projectId, dto.query, limit);

    const results: SearchResultItem[] = rawResults.map((r) => ({
      file: r.filePath,
      score: Math.round(r.score * 1000) / 1000,
      chunkText: r.chunkText,
      confidence: Math.round(r.score * 100),
    }));

    return { results };
  }

  async analyzeRequirement(dto: RepositoryIntelligenceDto): Promise<RepositoryIntelligenceResult> {
    const project = await this.projectRepo.findOne({ where: { id: dto.projectId } });
    if (!project) throw new BadRequestException('Project not found');
    if (project.status !== ProjectStatus.COMPLETED) {
      throw new BadRequestException('Repository indexing not completed');
    }

    const keywords = this.extractKeywords(dto.requirement);
    const searchQuery = [...keywords, dto.requirement].join(' ');
    const searchResults = await this.embedding.search(dto.projectId, searchQuery, 15);

    const relevantFiles = searchResults.map((r) => ({
      file: r.filePath,
      score: Math.round(r.score * 1000) / 1000,
      confidence: Math.round(r.score * 100),
    }));

    const confidenceScores = relevantFiles.map((f) => ({
      file: f.file,
      confidence: f.confidence,
    }));

    const filePaths = relevantFiles.map((f) => f.file);
    const graph = await this.dependencyGraph.getGraphForFiles(dto.projectId, filePaths);

    return {
      relevantFiles,
      confidenceScores,
      dependencyGraph: graph.edges.map((e) => ({
        source: e.source,
        target: e.target,
        relationType: e.relationType,
      })),
      adjacencyList: graph.adjacencyList,
      keywords,
    };
  }

  async getProjectFiles(projectId: string): Promise<RepositoryFile[]> {
    return this.fileRepo.find({
      where: { projectId },
      order: { filePath: 'ASC' },
    });
  }

  async getProjectGraph(projectId: string) {
    return this.dependencyGraph.getFullGraph(projectId);
  }

  private extractKeywords(requirement: string): string[] {
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'not', 'with', 'should', 'when', 'after', 'before']);
    return requirement
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w));
  }
}
