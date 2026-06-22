import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { QdrantClient } from '@qdrant/js-client-rest';
import { v4 as uuidv4 } from 'uuid';
import { FileChunk } from '../interfaces/repository.interfaces';
import { SettingsService } from '../../settings/settings.service';
import { OPENAI_EMBEDDING_MODEL } from '../../settings/embedding-config';
import { huggingFaceEmbeddings } from './huggingface-embedding';

export const EMBEDDING_BATCH_SIZE = 20;
export const HF_EMBEDDING_BATCH_SIZE = 2;

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
  ) {
    this.qdrant = new QdrantClient({
      url: config.get('QDRANT_URL', 'http://localhost:6333'),
      checkCompatibility: false,
    });
    this.collection = config.get('QDRANT_COLLECTION', 'repository_knowledge');
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

  async ensureCollection(): Promise<void> {
    const { dimensions } = await this.settingsService.getEmbeddingConfig();
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

  async generateEmbedding(text: string): Promise<number[]> {
    const [vector] = await this.generateEmbeddings([text]);
    return vector;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const runtime = await this.settingsService.getEmbeddingConfig();

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
    await this.ensureCollection();
    await this.deleteProjectEmbeddings(projectId);

    const runtime = await this.settingsService.getEmbeddingConfig();
    const batchSize =
      runtime.provider === 'huggingface' ? HF_EMBEDDING_BATCH_SIZE : EMBEDDING_BATCH_SIZE;

    let stored = 0;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const texts = batch.map((c) => c.chunkText);
      const vectors = await this.generateEmbeddings(texts);

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
    const vector = await this.generateEmbedding(query);

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
