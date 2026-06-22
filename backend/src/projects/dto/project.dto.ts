import { IsString, IsOptional, IsEnum, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Framework, Language } from '../../common/enums/project.enum';

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
