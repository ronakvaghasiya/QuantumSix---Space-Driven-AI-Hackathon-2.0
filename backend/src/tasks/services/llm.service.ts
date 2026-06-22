import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { SettingsService } from '../../settings/settings.service';
import { DEFAULT_HF_CHAT_MODEL, DEFAULT_OPENAI_CHAT_MODEL } from '../../settings/llm-config';
import { huggingFaceJsonCompletion, HuggingFaceCompletionOptions, parseJsonFromLlm } from './huggingface-llm';

export interface LlmCompletionOptions {
  maxTokens?: number;
}

@Injectable()
export class LlmService {
  constructor(
    private readonly settings: SettingsService,
    private readonly config: ConfigService,
  ) {}

  private openAiModel(): string {
    return this.config.get('OPENAI_CHAT_MODEL', DEFAULT_OPENAI_CHAT_MODEL);
  }

  private hfChatModel(): string {
    return this.config.get('HUGGINGFACE_CHAT_MODEL', DEFAULT_HF_CHAT_MODEL);
  }

  async jsonCompletion<T>(
    system: string,
    user: string,
    options: LlmCompletionOptions = {},
  ): Promise<T> {
    const provider = await this.settings.getEmbeddingProvider();

    if (provider === 'huggingface') {
      const token = await this.settings.getHuggingFaceKey();
      if (!token) {
        throw new BadRequestException(
          'Hugging Face token required for agents. Add hf_... token in Settings.',
        );
      }
      const hfOptions: HuggingFaceCompletionOptions = { maxTokens: options.maxTokens };
      return huggingFaceJsonCompletion<T>(token, this.hfChatModel(), system, user, hfOptions);
    }

    const apiKey = await this.settings.getOpenAiKey();
    if (!apiKey) {
      throw new BadRequestException(
        'OpenAI API key required for agents. Add sk-... key in Settings.',
      );
    }

    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: this.openAiModel(),
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.2,
      max_tokens: options.maxTokens ?? 4096,
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) throw new Error('Empty LLM response');
    return parseJsonFromLlm(raw) as T;
  }
}
