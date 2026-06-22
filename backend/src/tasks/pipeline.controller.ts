import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TaskPipelineService } from './services/task-pipeline.service';

class PipelineTaskDto {
  taskId: string;
}

@ApiTags('Pipeline')
@Controller('pipeline')
export class PipelineController {
  constructor(private readonly pipeline: TaskPipelineService) {}

  @Post('analyze')
  @ApiOperation({ summary: 'Run full analysis pipeline for a task (n8n or manual)' })
  async analyze(@Body() body: PipelineTaskDto) {
    this.pipeline.runAnalysis(body.taskId).catch(() => undefined);
    return { ok: true, message: 'Analysis pipeline started' };
  }

  @Post('code-generation')
  @ApiOperation({ summary: 'Run code generation pipeline for a task' })
  async codeGeneration(@Body() body: PipelineTaskDto) {
    this.pipeline.runCodeGeneration(body.taskId).catch(() => undefined);
    return { ok: true, message: 'Code generation pipeline started' };
  }

  @Post('validation')
  @ApiOperation({ summary: 'Run validation and PR pipeline for a task' })
  async validation(@Body() body: PipelineTaskDto) {
    this.pipeline.runValidation(body.taskId).catch(() => undefined);
    return { ok: true, message: 'Validation pipeline started' };
  }
}
