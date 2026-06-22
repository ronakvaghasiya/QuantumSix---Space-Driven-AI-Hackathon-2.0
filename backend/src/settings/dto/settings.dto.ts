import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EmbeddingProvider } from '../embedding-config';

export class SaveOpenAiKeyDto {
  @IsString()
  @IsNotEmpty()
  apiKey: string;
}

export class SaveHuggingFaceKeyDto {
  @IsString()
  @IsNotEmpty()
  apiKey: string;

  @IsOptional()
  @IsString()
  model?: string;
}

export class SaveEmbeddingProviderDto {
  @IsIn(['openai', 'huggingface'])
  provider: EmbeddingProvider;
}
