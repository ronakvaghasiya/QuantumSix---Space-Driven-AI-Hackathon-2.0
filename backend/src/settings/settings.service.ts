import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import OpenAI from 'openai';
import { PlatformSetting } from './entities/platform-setting.entity';
import {
  DEFAULT_HF_EMBEDDING_MODEL,
  EmbeddingProvider,
  EmbeddingRuntimeConfig,
  OPENAI_EMBEDDING_DIMENSIONS,
  OPENAI_EMBEDDING_MODEL,
  hfModelDimensions,
} from './embedding-config';
import { DEFAULT_HF_CHAT_MODEL } from './llm-config';
import { validateHuggingFaceKey } from '../repository/services/huggingface-embedding';

const OPENAI_KEY = 'openai_api_key';
const HUGGINGFACE_KEY = 'huggingface_api_key';
const EMBEDDING_PROVIDER_KEY = 'embedding_provider';
const HUGGINGFACE_MODEL_KEY = 'huggingface_embedding_model';
const HUGGINGFACE_CHAT_MODEL_KEY = 'huggingface_chat_model';

@Injectable()
export class SettingsService {
  constructor(
    private readonly config: ConfigService,
    @InjectRepository(PlatformSetting)
    private readonly settingsRepo: Repository<PlatformSetting>,
  ) {}

  private maskKey(key: string): string {
    if (key.length <= 8) return '••••••••';
    return `${key.slice(0, 7)}••••${key.slice(-4)}`;
  }

  private async getSetting(key: string): Promise<string | null> {
    const stored = await this.settingsRepo.findOne({ where: { key } });
    return stored?.value ?? null;
  }

  private async setSetting(key: string, value: string): Promise<void> {
    await this.settingsRepo.save(this.settingsRepo.create({ key, value }));
  }

  async getOpenAiKey(): Promise<string | null> {
    const stored = await this.getSetting(OPENAI_KEY);
    if (stored) return stored;
    const envKey = this.config.get<string>('OPENAI_API_KEY');
    if (envKey?.startsWith('sk-')) return envKey;
    return null;
  }

  async getHuggingFaceKey(): Promise<string | null> {
    const stored = await this.getSetting(HUGGINGFACE_KEY);
    if (stored) return stored;
    const envHf =
      this.config.get<string>('HUGGINGFACE_API_KEY') || this.config.get<string>('HF_TOKEN');
    if (envHf) return envHf;
    const openaiEnv = this.config.get<string>('OPENAI_API_KEY');
    if (openaiEnv?.startsWith('hf_')) return openaiEnv;
    return null;
  }

  async getHuggingFaceModel(): Promise<string> {
    const stored = await this.getSetting(HUGGINGFACE_MODEL_KEY);
    if (stored) return stored;
    return this.config.get<string>('HUGGINGFACE_EMBEDDING_MODEL') || DEFAULT_HF_EMBEDDING_MODEL;
  }

  async getHuggingFaceChatModel(): Promise<string> {
    const stored = await this.getSetting(HUGGINGFACE_CHAT_MODEL_KEY);
    if (stored) return stored;
    return this.config.get<string>('HUGGINGFACE_CHAT_MODEL') || DEFAULT_HF_CHAT_MODEL;
  }

  /** Same provider drives embeddings + agent LLM pipeline */
  async getLlmProvider(): Promise<EmbeddingProvider> {
    return this.getEmbeddingProvider();
  }

  async getEmbeddingProvider(): Promise<EmbeddingProvider> {
    const stored = await this.getSetting(EMBEDDING_PROVIDER_KEY);
    if (stored === 'openai' || stored === 'huggingface') return stored;

    const env = this.config.get<string>('EMBEDDING_PROVIDER');
    if (env === 'openai' || env === 'huggingface') return env;

    const hf = await this.getHuggingFaceKey();
    const oa = await this.getOpenAiKey();
    if (hf && !oa) return 'huggingface';
    if (oa && !hf) return 'openai';
    if (hf) return 'huggingface';
    return 'openai';
  }

  async getEmbeddingConfig(): Promise<EmbeddingRuntimeConfig> {
    const provider = await this.getEmbeddingProvider();
    if (provider === 'huggingface') {
      const model = await this.getHuggingFaceModel();
      return { provider, model, dimensions: hfModelDimensions(model) };
    }
    return {
      provider: 'openai',
      model: OPENAI_EMBEDDING_MODEL,
      dimensions: OPENAI_EMBEDDING_DIMENSIONS,
    };
  }

  async getEmbeddingStatus(): Promise<{
    provider: EmbeddingProvider;
    model: string;
    dimensions: number;
    openai: { configured: boolean; source: 'database' | 'env' | null; keyPreview: string | null };
    huggingface: {
      configured: boolean;
      source: 'database' | 'env' | null;
      keyPreview: string | null;
      model: string;
      chatModel: string;
    };
  }> {
    const config = await this.getEmbeddingConfig();
    const [openai, huggingface] = await Promise.all([
      this.getOpenAiStatus(),
      this.getHuggingFaceStatus(),
    ]);
    return {
      provider: config.provider,
      model: config.model,
      dimensions: config.dimensions,
      openai,
      huggingface,
    };
  }

  async getOpenAiStatus(): Promise<{
    configured: boolean;
    source: 'database' | 'env' | null;
    keyPreview: string | null;
  }> {
    const stored = await this.getSetting(OPENAI_KEY);
    if (stored) {
      return { configured: true, source: 'database', keyPreview: this.maskKey(stored) };
    }
    const envKey = this.config.get<string>('OPENAI_API_KEY');
    if (envKey?.startsWith('sk-')) {
      return { configured: true, source: 'env', keyPreview: this.maskKey(envKey) };
    }
    return { configured: false, source: null, keyPreview: null };
  }

  async getHuggingFaceStatus(): Promise<{
    configured: boolean;
    source: 'database' | 'env' | null;
    keyPreview: string | null;
    model: string;
    chatModel: string;
  }> {
    const model = await this.getHuggingFaceModel();
    const chatModel = await this.getHuggingFaceChatModel();
    const stored = await this.getSetting(HUGGINGFACE_KEY);
    if (stored) {
      return { configured: true, source: 'database', keyPreview: this.maskKey(stored), model, chatModel };
    }
    const envKey =
      this.config.get<string>('HUGGINGFACE_API_KEY') ||
      this.config.get<string>('HF_TOKEN') ||
      (this.config.get<string>('OPENAI_API_KEY')?.startsWith('hf_')
        ? this.config.get<string>('OPENAI_API_KEY')
        : undefined);
    if (envKey) {
      return { configured: true, source: 'env', keyPreview: this.maskKey(envKey), model, chatModel };
    }
    return { configured: false, source: null, keyPreview: null, model, chatModel };
  }

  async saveEmbeddingProvider(provider: EmbeddingProvider): Promise<{ provider: EmbeddingProvider }> {
    if (provider === 'openai' && !(await this.getOpenAiKey())) {
      throw new BadRequestException('Add an OpenAI API key before selecting OpenAI.');
    }
    if (provider === 'huggingface' && !(await this.getHuggingFaceKey())) {
      throw new BadRequestException('Add a Hugging Face token before selecting Hugging Face.');
    }
    await this.setSetting(EMBEDDING_PROVIDER_KEY, provider);
    return { provider };
  }

  async saveOpenAiKey(apiKey: string): Promise<{ saved: boolean; keyPreview: string }> {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      throw new BadRequestException('API key is required');
    }
    if (!trimmed.startsWith('sk-')) {
      throw new BadRequestException('OpenAI API keys must start with sk-');
    }

    try {
      const client = new OpenAI({ apiKey: trimmed });
      await client.embeddings.create({
        model: OPENAI_EMBEDDING_MODEL,
        input: 'RepoPilot connectivity test',
      });
    } catch (err) {
      const message = (err as Error).message || 'Invalid OpenAI API key';
      throw new BadRequestException(`OpenAI key validation failed: ${message}`);
    }

    await this.setSetting(OPENAI_KEY, trimmed);
    return { saved: true, keyPreview: this.maskKey(trimmed) };
  }

  async saveHuggingFaceKey(
    apiKey: string,
    model?: string,
  ): Promise<{ saved: boolean; keyPreview: string; model: string; dimensions: number }> {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      throw new BadRequestException('API token is required');
    }
    if (!trimmed.startsWith('hf_')) {
      throw new BadRequestException('Hugging Face tokens must start with hf_');
    }

    const resolvedModel = (model?.trim() || (await this.getHuggingFaceModel())).trim();
    let dimensions: number;
    try {
      dimensions = await validateHuggingFaceKey(trimmed, resolvedModel);
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(
        `Hugging Face key validation failed: ${(err as Error).message}`,
      );
    }

    await this.setSetting(HUGGINGFACE_KEY, trimmed);
    await this.setSetting(HUGGINGFACE_MODEL_KEY, resolvedModel);
    await this.setSetting(EMBEDDING_PROVIDER_KEY, 'huggingface');

    return {
      saved: true,
      keyPreview: this.maskKey(trimmed),
      model: resolvedModel,
      dimensions,
    };
  }

  async clearOpenAiKey(): Promise<void> {
    await this.settingsRepo.delete({ key: OPENAI_KEY });
  }

  async clearHuggingFaceKey(): Promise<void> {
    await this.settingsRepo.delete({ key: HUGGINGFACE_KEY });
  }
}
