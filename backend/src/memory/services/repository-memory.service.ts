import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RepositoryMemorySnapshot } from '../entities/repository-memory-snapshot.entity';
import { EmbeddingService } from '../../repository/services/embedding.service';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class RepositoryMemoryService {
  private readonly logger = new Logger(RepositoryMemoryService.name);

  constructor(
    @InjectRepository(RepositoryMemorySnapshot)
    private readonly snapshotRepo: Repository<RepositoryMemorySnapshot>,
    private readonly embedding: EmbeddingService,
    private readonly audit: AuditService,
  ) {}

  async recordSnapshot(params: {
    projectId: string;
    commitSha?: string | null;
    branch?: string | null;
    filesCount: number;
    chunksCount: number;
    metadata?: Record<string, unknown>;
  }): Promise<RepositoryMemorySnapshot> {
    const summary = `Indexed ${params.filesCount} files (${params.chunksCount} chunks) at ${params.commitSha?.slice(0, 8) || 'unknown'}`;
    const snapshot = await this.snapshotRepo.save(
      this.snapshotRepo.create({
        projectId: params.projectId,
        commitSha: params.commitSha || null,
        branch: params.branch || null,
        filesCount: params.filesCount,
        chunksCount: params.chunksCount,
        summary,
        metadata: params.metadata || null,
      }),
    );
    await this.audit.log('project', params.projectId, 'memory_snapshot', {
      snapshotId: snapshot.id,
      commitSha: params.commitSha,
      filesCount: params.filesCount,
    });
    this.logger.log(`Memory snapshot recorded for project ${params.projectId}`);
    return snapshot;
  }

  async getSnapshots(projectId: string, limit = 20): Promise<RepositoryMemorySnapshot[]> {
    return this.snapshotRepo.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async retrieveContext(
    projectId: string,
    requirement: string,
    limit = 8,
  ): Promise<{
    snapshots: RepositoryMemorySnapshot[];
    semanticMatches: { filePath: string; score: number; chunkText: string }[];
  }> {
    const [snapshots, semanticMatches] = await Promise.all([
      this.getSnapshots(projectId, 3),
      this.embedding.search(projectId, requirement, limit),
    ]);
    return {
      snapshots,
      semanticMatches: semanticMatches.map((m) => ({
        filePath: m.filePath,
        score: m.score,
        chunkText: m.chunkText,
      })),
    };
  }
}
