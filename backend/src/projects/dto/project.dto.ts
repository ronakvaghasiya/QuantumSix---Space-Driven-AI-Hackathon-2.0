import { IsString, IsOptional, IsEnum, IsUrl, IsNumber, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Framework, Language } from '../../common/enums/project.enum';
import { AiProvider } from '../../common/enums/ai.enum';

export class CreateProjectDto {
  @ApiProperty({ example: 'BannerBuzz' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'https://github.com/company/bannerbuzz-nextjs' })
  @IsUrl()
  repositoryUrl: string;

  @ApiPropertyOptional({ example: 'dev' })
  @IsOptional()
  @IsString()
  defaultBranch?: string;

  @ApiPropertyOptional({ enum: Framework })
  @IsOptional()
  @IsEnum(Framework)
  framework?: Framework;

  @ApiPropertyOptional({ enum: Language })
  @IsOptional()
  @IsEnum(Language)
  language?: Language;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  githubRepoId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  githubOwner?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  githubRepoName?: string;

  @ApiPropertyOptional({ enum: AiProvider, default: AiProvider.OPENAI })
  @IsOptional()
  @IsEnum(AiProvider)
  aiProvider?: AiProvider;

  @ApiPropertyOptional({ example: 'gpt-4o-mini' })
  @IsOptional()
  @IsString()
  aiModel?: string;

  @ApiPropertyOptional({ example: 0.2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  aiTemperature?: number;

  @ApiPropertyOptional({ example: 4096 })
  @IsOptional()
  @IsNumber()
  @Min(256)
  @Max(32768)
  aiMaxTokens?: number;
}

export class UpdateProjectDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultBranch?: string;

  @ApiPropertyOptional({ enum: Framework })
  @IsOptional()
  @IsEnum(Framework)
  framework?: Framework;

  @ApiPropertyOptional({ enum: Language })
  @IsOptional()
  @IsEnum(Language)
  language?: Language;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: AiProvider })
  @IsOptional()
  @IsEnum(AiProvider)
  aiProvider?: AiProvider;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  aiModel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  aiTemperature?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(256)
  @Max(32768)
  aiMaxTokens?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vcsProvider?: string;

  @ApiPropertyOptional({ description: 'Enable auto-reindex via webhooks and cron' })
  @IsOptional()
  @IsBoolean()
  autoReindexEnabled?: boolean;
}

export class ConnectProjectDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  repositoryUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultBranch?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  githubRepoId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  githubOwner?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  githubRepoName?: string;
}
