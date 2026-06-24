import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Project } from '../projects/entities/project.entity';
import { SettingsService } from '../settings/settings.service';
import { AiProvider } from '../common/enums/ai.enum';
import {
  DEFAULT_HF_EMBEDDING_MODEL,
  EmbeddingProvider,
  EmbeddingRuntimeConfig,
  OPENAI_EMBEDDING_DIMENSIONS,
  OPENAI_EMBEDDING_MODEL,
  hfModelDimensions,
} from '../settings/embedding-config';
import { DEFAULT_HF_CHAT_MODEL, DEFAULT_OPENAI_CHAT_MODEL } from '../settings/llm-config';

export interface ProjectLlmConfig {
  provider: EmbeddingProvider;
  chatModel: string;
  temperature: number;
  maxTokens: number;
}

@Injectable()
export class ProjectAiService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly settings: SettingsService,
    private readonly config: ConfigService,
  ) {}

  async resolveLlmConfig(projectId: string): Promise<ProjectLlmConfig> {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    const provider = project.aiProvider as EmbeddingProvider;
    const temperature = project.aiTemperature ?? 0.2;
    const maxTokens = project.aiMaxTokens ?? 4096;

    if (provider === AiProvider.HUGGINGFACE) {
      const chatModel =
        project.aiModel || (await this.settings.getHuggingFaceChatModel()) || DEFAULT_HF_CHAT_MODEL;
      return { provider: 'huggingface', chatModel, temperature, maxTokens };
    }

    const chatModel =
      project.aiModel ||
      this.config.get<string>('OPENAI_CHAT_MODEL', DEFAULT_OPENAI_CHAT_MODEL) ||
      DEFAULT_OPENAI_CHAT_MODEL;
    return { provider: 'openai', chatModel, temperature, maxTokens };
  }

  async resolveEmbeddingConfig(projectId: string): Promise<EmbeddingRuntimeConfig> {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    if (project.aiProvider === AiProvider.HUGGINGFACE) {
      const model = (await this.settings.getHuggingFaceModel()) || DEFAULT_HF_EMBEDDING_MODEL;
      return { provider: 'huggingface', model, dimensions: hfModelDimensions(model) };
    }

    return {
      provider: 'openai',
      model: OPENAI_EMBEDDING_MODEL,
      dimensions: OPENAI_EMBEDDING_DIMENSIONS,
    };
  }
}
