import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { QdrantClient } from '@qdrant/js-client-rest';
import { v4 as uuidv4 } from 'uuid';
import { FileChunk } from '../interfaces/repository.interfaces';
import { SettingsService } from '../../settings/settings.service';
import { ProjectAiService } from '../../ai/project-ai.service';
import { OPENAI_EMBEDDING_MODEL } from '../../settings/embedding-config';
import { huggingFaceEmbeddings } from './huggingface-embedding';
export const EMBEDDING_BATCH_SIZE = 20;
export const HF_EMBEDDING_BATCH_SIZE = 2;
export const TASK_MEMORY_COLLECTION = 'task_memory';

export interface TaskMemorySearchResult {
  taskId: string;
  requirement: string;
  outcome: string;
  riskLevel: string | null;
  score: number;
  impactedFiles: string[];
}

export interface EmbeddingPoint {
  id: string;
  projectId: string;
  filePath: string;
  chunkIndex: number;
  chunkText: string;
  startLine: number;
  endLine: number;
  vector: number[];
}

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly qdrant: QdrantClient;
  private readonly collection: string;

  constructor(
    private readonly config: ConfigService,
    private readonly settingsService: SettingsService,
    private readonly projectAi: ProjectAiService,
  ) {
    this.qdrant = new QdrantClient({
      url: config.get('QDRANT_URL', 'http://localhost:6333'),
      checkCompatibility: false,
    });
    this.collection = config.get('QDRANT_COLLECTION', 'repository_knowledge');
  }

  private taskMemoryCollection(): string {
    return this.config.get('QDRANT_TASK_MEMORY_COLLECTION', TASK_MEMORY_COLLECTION);
  }

  private async openaiClient(): Promise<OpenAI> {
    const apiKey = await this.settingsService.getOpenAiKey();
    if (!apiKey) {
      throw new BadRequestException(
        'OpenAI API key not configured. Add your sk-... key in Settings.',
      );
    }
    return new OpenAI({ apiKey });
  }

  async ensureCollection(projectId?: string): Promise<void> {
    const { dimensions } = projectId
      ? await this.projectAi.resolveEmbeddingConfig(projectId)
      : await this.settingsService.getEmbeddingConfig();
    try {
      const info = await this.qdrant.getCollection(this.collection);
      const size = (info.config?.params?.vectors as { size?: number })?.size;
      if (size && size !== dimensions) {
        this.logger.warn(
          `Collection ${this.collection} has dimension ${size}, expected ${dimensions}. Recreating.`,
        );
        await this.qdrant.deleteCollection(this.collection);
        await this.createCollection(dimensions);
      }
    } catch (err) {
      const message = (err as Error).message || '';
      if (message.includes('Not found') || message.includes('404')) {
        await this.createCollection(dimensions);
        return;
      }
      try {
        await this.createCollection(dimensions);
      } catch (createErr) {
        this.logger.error(`Qdrant collection setup failed: ${(createErr as Error).message}`);
        throw createErr;
      }
    }
  }

  private async createCollection(dimensions: number): Promise<void> {
    await this.qdrant.createCollection(this.collection, {
      vectors: { size: dimensions, distance: 'Cosine' },
    });
    await this.qdrant.createPayloadIndex(this.collection, {
      field_name: 'projectId',
      field_schema: 'keyword',
    });
    await this.qdrant.createPayloadIndex(this.collection, {
      field_name: 'filePath',
      field_schema: 'keyword',
    });
  }

  async generateEmbedding(text: string, projectId: string): Promise<number[]> {
    const [vector] = await this.generateEmbeddings([text], projectId);
    return vector;
  }

  async generateEmbeddings(texts: string[], projectId: string): Promise<number[][]> {
    if (texts.length === 0) return [];

    const runtime = await this.projectAi.resolveEmbeddingConfig(projectId);

    if (runtime.provider === 'huggingface') {
      const token = await this.settingsService.getHuggingFaceKey();
      if (!token) {
        throw new BadRequestException(
          'Hugging Face token not configured. Add your hf_... token in Settings.',
        );
      }
      return huggingFaceEmbeddings(texts, token, runtime.model);
    }

    const openai = await this.openaiClient();
    const response = await openai.embeddings.create({
      model: OPENAI_EMBEDDING_MODEL,
      input: texts,
    });
    return response.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
  }

  async embedAndStore(
    projectId: string,
    chunks: FileChunk[],
    onProgress?: (processed: number, total: number) => void,
  ): Promise<number> {
    await this.ensureCollection(projectId);
    await this.deleteProjectEmbeddings(projectId);

    const runtime = await this.projectAi.resolveEmbeddingConfig(projectId);
    const batchSize =
      runtime.provider === 'huggingface' ? HF_EMBEDDING_BATCH_SIZE : EMBEDDING_BATCH_SIZE;

    let stored = 0;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const texts = batch.map((c) => c.chunkText);
      const vectors = await this.generateEmbeddings(texts, projectId);

      const points = batch.map((chunk, idx) => ({
        id: uuidv4(),
        vector: vectors[idx],
        payload: {
          projectId,
          filePath: chunk.filePath,
          chunkIndex: chunk.chunkIndex,
          chunkText: chunk.chunkText.slice(0, 2000),
          startLine: chunk.startLine,
          endLine: chunk.endLine,
        },
      }));

      await this.qdrant.upsert(this.collection, {
        wait: true,
        points,
      });

      stored += batch.length;
      onProgress?.(stored, chunks.length);

      if (runtime.provider === 'huggingface') {
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    return stored;
  }

  async deleteFileEmbeddings(projectId: string, filePaths: string[]): Promise<void> {
    if (filePaths.length === 0) return;
    try {
      await this.qdrant.delete(this.collection, {
        wait: true,
        filter: {
          must: [
            { key: 'projectId', match: { value: projectId } },
            { key: 'filePath', match: { any: filePaths } },
          ],
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to delete file embeddings: ${(err as Error).message}`);
    }
  }

  async embedChunksIncremental(
    projectId: string,
    chunks: FileChunk[],
    onProgress?: (processed: number, total: number) => void,
  ): Promise<number> {
    if (chunks.length === 0) return 0;
    await this.ensureCollection(projectId);

    const runtime = await this.projectAi.resolveEmbeddingConfig(projectId);
    const batchSize =
      runtime.provider === 'huggingface' ? HF_EMBEDDING_BATCH_SIZE : EMBEDDING_BATCH_SIZE;

    let stored = 0;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const texts = batch.map((c) => c.chunkText);
      const vectors = await this.generateEmbeddings(texts, projectId);

      const points = batch.map((chunk, idx) => ({
        id: uuidv4(),
        vector: vectors[idx],
        payload: {
          projectId,
          filePath: chunk.filePath,
          chunkIndex: chunk.chunkIndex,
          chunkText: chunk.chunkText.slice(0, 2000),
          startLine: chunk.startLine,
          endLine: chunk.endLine,
        },
      }));

      await this.qdrant.upsert(this.collection, { wait: true, points });
      stored += batch.length;
      onProgress?.(stored, chunks.length);

      if (runtime.provider === 'huggingface') {
        await new Promise((r) => setTimeout(r, 300));
      }
    }
    return stored;
  }

  private async ensureTaskMemoryCollection(projectId: string): Promise<void> {
    const collection = this.taskMemoryCollection();
    const { dimensions } = await this.projectAi.resolveEmbeddingConfig(projectId);
    try {
      await this.qdrant.getCollection(collection);
    } catch {
      await this.qdrant.createCollection(collection, {
        vectors: { size: dimensions, distance: 'Cosine' },
      });
      await this.qdrant.createPayloadIndex(collection, {
        field_name: 'projectId',
        field_schema: 'keyword',
      });
      await this.qdrant.createPayloadIndex(collection, {
        field_name: 'taskId',
        field_schema: 'keyword',
      });
    }
  }

  async upsertTaskMemory(
    projectId: string,
    taskId: string,
    requirement: string,
    metadata: {
      outcome: string;
      riskLevel?: string | null;
      impactedFiles?: string[];
    },
  ): Promise<string> {
    await this.ensureTaskMemoryCollection(projectId);
    const pointId = uuidv4();
    const vector = await this.generateEmbedding(requirement, projectId);
    const collection = this.taskMemoryCollection();

    await this.qdrant.upsert(collection, {
      wait: true,
      points: [
        {
          id: pointId,
          vector,
          payload: {
            projectId,
            taskId,
            requirement: requirement.slice(0, 4000),
            outcome: metadata.outcome,
            riskLevel: metadata.riskLevel || null,
            impactedFiles: metadata.impactedFiles || [],
          },
        },
      ],
    });
    return pointId;
  }

  async searchTaskMemory(
    projectId: string,
    query: string,
    limit = 5,
    excludeTaskId?: string,
  ): Promise<TaskMemorySearchResult[]> {
    try {
      await this.ensureTaskMemoryCollection(projectId);
      const vector = await this.generateEmbedding(query, projectId);
      const collection = this.taskMemoryCollection();

      const results = await this.qdrant.search(collection, {
        vector,
        limit: limit * 2,
        filter: {
          must: [{ key: 'projectId', match: { value: projectId } }],
        },
        with_payload: true,
      });

      return results
        .filter((r) => {
          const payload = r.payload as { taskId?: string };
          return !excludeTaskId || payload.taskId !== excludeTaskId;
        })
        .slice(0, limit)
        .map((r) => {
          const payload = r.payload as {
            taskId: string;
            requirement: string;
            outcome: string;
            riskLevel: string | null;
            impactedFiles: string[];
          };
          return {
            taskId: payload.taskId,
            requirement: payload.requirement,
            outcome: payload.outcome,
            riskLevel: payload.riskLevel,
            score: r.score,
            impactedFiles: payload.impactedFiles || [],
          };
        });
    } catch (error) {
      this.logger.warn(`Task memory vector search failed: ${(error as Error).message}`);
      return [];
    }
  }

  async deleteTaskMemoryPoint(pointId: string): Promise<void> {
    try {
      await this.qdrant.delete(this.taskMemoryCollection(), {
        wait: true,
        points: [pointId],
      });
    } catch (err) {
      this.logger.warn(`Failed to delete task memory point: ${(err as Error).message}`);
    }
  }

  async deleteProjectEmbeddings(projectId: string): Promise<void> {
    try {
      await this.qdrant.delete(this.collection, {
        wait: true,
        filter: {
          must: [{ key: 'projectId', match: { value: projectId } }],
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to delete embeddings for ${projectId}: ${(err as Error).message}`);
    }
  }

  async search(
    projectId: string,
    query: string,
    limit = 10,
  ): Promise<{ filePath: string; score: number; chunkText: string; startLine: number; endLine: number }[]> {
    const vector = await this.generateEmbedding(query, projectId);

    const results = await this.qdrant.search(this.collection, {
      vector,
      limit: limit * 3,
      filter: {
        must: [{ key: 'projectId', match: { value: projectId } }],
      },
      with_payload: true,
    });

    const fileScores = new Map<string, { score: number; chunkText: string; startLine: number; endLine: number }>();

    for (const result of results) {
      const payload = result.payload as {
        filePath: string;
        chunkText: string;
        startLine: number;
        endLine: number;
      };
      const existing = fileScores.get(payload.filePath);
      if (!existing || result.score > existing.score) {
        fileScores.set(payload.filePath, {
          score: result.score,
          chunkText: payload.chunkText,
          startLine: payload.startLine,
          endLine: payload.endLine,
        });
      }
    }

    return Array.from(fileScores.entries())
      .map(([filePath, data]) => ({ filePath, ...data }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}
