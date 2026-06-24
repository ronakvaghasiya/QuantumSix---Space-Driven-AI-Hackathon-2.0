import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import OpenAI from 'openai';
import { SettingsService } from '../../settings/settings.service';
import { ProjectAiService } from '../../ai/project-ai.service';
import { huggingFaceJsonCompletion, HuggingFaceCompletionOptions, parseJsonFromLlm } from './huggingface-llm';
import { Project } from '../../projects/entities/project.entity';

export interface LlmCompletionOptions {
  maxTokens?: number;
  projectId?: string;
  taskId?: string;
  temperature?: number;
}

@Injectable()
export class LlmService {
  constructor(
    private readonly settings: SettingsService,
    private readonly projectAi: ProjectAiService,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  async jsonCompletion<T>(
    system: string,
    user: string,
    options: LlmCompletionOptions = {},
  ): Promise<T> {
    if (!options.projectId) {
      throw new BadRequestException(
        'projectId is required for LLM calls — configure per-project AI provider on the project.',
      );
    }

    const cfg = await this.projectAi.resolveLlmConfig(options.projectId);
    const maxTokens = options.maxTokens ?? cfg.maxTokens;
    const temperature = options.temperature ?? cfg.temperature;

    if (cfg.provider === 'huggingface') {
      const token = await this.settings.getHuggingFaceKey();
      if (!token) {
        throw new BadRequestException(
          'Hugging Face token required. Add hf_... token in Settings.',
        );
      }
      const hfOptions: HuggingFaceCompletionOptions = { maxTokens };
      return huggingFaceJsonCompletion<T>(token, cfg.chatModel, system, user, hfOptions);
    }

    const apiKey = await this.settings.getOpenAiKey();
    if (!apiKey) {
      throw new BadRequestException('OpenAI API key required. Add sk-... key in Settings.');
    }

    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: cfg.chatModel,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature,
      max_tokens: maxTokens,
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) throw new Error('Empty LLM response');

    return parseJsonFromLlm(raw) as T;
  }
}
