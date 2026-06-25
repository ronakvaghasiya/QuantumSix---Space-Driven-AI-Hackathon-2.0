import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RiskLevel } from '../../common/enums/task.enum';

export class CreateTaskDto {
  @ApiProperty({ example: 'BB-14342' })
  @IsString()
  taskId: string;

  @ApiProperty()
  @IsString()
  projectId: string;

  @ApiProperty({ example: 'Upload artwork preview issue' })
  @IsString()
  requirement: string;

  @ApiPropertyOptional({ enum: RiskLevel })
  @IsOptional()
  @IsEnum(RiskLevel)
  risk?: RiskLevel;
}

export class UploadTasksDto {
  @ApiProperty()
  @IsString()
  projectId: string;

  @ApiProperty({ description: 'CSV content with task_id,requirement columns' })
  @IsString()
  csvContent: string;
}

export class ApprovalDto {
  @ApiProperty({ enum: ['approve', 'reject', 'request_changes'] })
  @IsString()
  action: 'approve' | 'reject' | 'request_changes';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ example: 'missing_test_coverage' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RevertCodeDto {
  @ApiPropertyOptional({
    description: 'File paths to revert (relative). Omit to revert all changed files.',
    example: ['components/Common/SidePreview/index.js'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  paths?: string[];
}
