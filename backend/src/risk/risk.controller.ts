import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RiskEngineService } from './services/risk-engine.service';

@ApiTags('Risk')
@Controller('risk')
export class RiskController {
  constructor(private readonly riskEngine: RiskEngineService) {}

  @Get('tasks/:taskId')
  @ApiOperation({ summary: 'Get latest risk assessment for a task' })
  getTaskRisk(@Param('taskId') taskId: string) {
    return this.riskEngine.getAssessment(taskId);
  }

  @Post('tasks/:taskId/assess')
  @ApiOperation({ summary: 'Compute or refresh risk assessment' })
  assessTask(@Param('taskId') taskId: string) {
    return this.riskEngine.assessTask(taskId);
  }

  @Get('projects/:projectId/summary')
  @ApiOperation({ summary: 'Project-level risk summary' })
  getProjectSummary(@Param('projectId') projectId: string) {
    return this.riskEngine.getProjectSummary(projectId);
  }
}
