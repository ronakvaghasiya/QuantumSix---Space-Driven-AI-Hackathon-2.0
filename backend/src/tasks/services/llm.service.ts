import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import OpenAI from 'openai';
import { SettingsService } from '../../settings/settings.service';
import { ProjectAiService } from '../../ai/project-ai.service';
import { huggingFaceJsonCompletion, HuggingFaceCompletionOptions, parseJsonFromLlm } from './huggingface-llm';
import { UsageMeterService } from '../../usage/services/usage-meter.service';
import { BillingService } from '../../billing/services/billing.service';
import { UsageMetricType } from '../../common/enums/usage.enum';
import { QuotaMetric } from '../../common/enums/usage.enum';
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
    @Optional() private readonly usageMeter?: UsageMeterService,
    @Optional() private readonly billing?: BillingService,
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

    await this.assertTokenQuota(options.projectId);

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
      const result = await huggingFaceJsonCompletion<T>(token, cfg.chatModel, system, user, hfOptions);
      await this.recordHfUsage(options.projectId, options.taskId, system, user);
      return result;
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

    const tokens = response.usage?.total_tokens || this.estimateTokens(system + user + raw);
    await this.usageMeter?.recordForProject(
      options.projectId,
      UsageMetricType.OPENAI_TOKENS,
      tokens,
      { taskId: options.taskId, metadata: { model: cfg.chatModel } },
    );

    return parseJsonFromLlm(raw) as T;
  }

  private async assertTokenQuota(projectId: string): Promise<void> {
    if (!this.billing) return;
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project?.organizationId) return;
    await this.billing.assertQuota(project.organizationId, QuotaMetric.TOKENS_PER_MONTH);
  }

  private async recordHfUsage(
    projectId: string,
    taskId: string | undefined,
    system: string,
    user: string,
  ): Promise<void> {
    await this.usageMeter?.recordForProject(
      projectId,
      UsageMetricType.HF_REQUESTS,
      1,
      { taskId, unit: 'request' },
    );
    const estimated = this.estimateTokens(system + user);
    await this.usageMeter?.recordForProject(
      projectId,
      UsageMetricType.OPENAI_TOKENS,
      estimated,
      { taskId, metadata: { provider: 'huggingface', estimated: true } },
    );
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
