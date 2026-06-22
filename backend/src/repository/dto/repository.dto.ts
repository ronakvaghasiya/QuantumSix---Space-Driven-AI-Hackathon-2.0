import { IsString, IsUUID, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RepositorySearchDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ example: 'upload artwork preview issue' })
  @IsString()
  query: string;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class RepositoryIntelligenceDto {
  @ApiProperty()
  @IsUUID()
  projectId: string;

  @ApiProperty({ example: 'Upload artwork preview issue' })
  @IsString()
  requirement: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  taskId?: string;
}
