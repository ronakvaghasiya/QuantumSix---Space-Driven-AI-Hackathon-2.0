import { IsString, IsOptional, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SaveGitLabPatDto {
  @ApiProperty({ description: 'GitLab Personal Access Token' })
  @IsString()
  token: string;

  @ApiPropertyOptional({ example: 'https://gitlab.com' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  baseUrl?: string;
}
