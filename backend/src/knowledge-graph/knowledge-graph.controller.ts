import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { KnowledgeGraphService } from './services/knowledge-graph.service';

@ApiTags('Knowledge Graph')
@Controller('knowledge-graph')
export class KnowledgeGraphController {
  constructor(private readonly graphService: KnowledgeGraphService) {}

  @Get('projects/:projectId')
  @ApiOperation({ summary: 'Get unified knowledge graph (files, tasks, tests) for ReactFlow' })
  getGraph(@Param('projectId') projectId: string) {
    return this.graphService.buildGraph(projectId);
  }
}
