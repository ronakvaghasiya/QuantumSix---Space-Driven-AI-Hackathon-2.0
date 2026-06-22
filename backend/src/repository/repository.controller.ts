import {
  Controller,
  Get,
  Post,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IndexingService } from './services/indexing.service';
import { RepositorySearchService } from './services/repository-search.service';
import { RepositorySearchDto, RepositoryIntelligenceDto } from './dto/repository.dto';

@ApiTags('Repository')
@Controller('repository')
export class RepositoryController {
  constructor(
    private readonly indexingService: IndexingService,
    private readonly searchService: RepositorySearchService,
  ) {}

  @Post('search')
  @ApiOperation({ summary: 'Semantic repository search' })
  search(@Body() dto: RepositorySearchDto) {
    return this.searchService.search(dto);
  }

  @Post('intelligence')
  @ApiOperation({ summary: 'Repository intelligence analysis for a requirement' })
  intelligence(@Body() dto: RepositoryIntelligenceDto) {
    return this.searchService.analyzeRequirement(dto);
  }

  @Post(':projectId/index')
  @ApiOperation({ summary: 'Start repository indexing' })
  startIndexing(@Param('projectId') projectId: string) {
    return this.indexingService.startIndexing(projectId);
  }

  @Get(':projectId/index/status')
  @ApiOperation({ summary: 'Get indexing job status' })
  getIndexingStatus(@Param('projectId') projectId: string) {
    return this.indexingService.getIndexingStatus(projectId);
  }

  @Get(':projectId/files')
  @ApiOperation({ summary: 'List indexed repository files' })
  getFiles(@Param('projectId') projectId: string) {
    return this.searchService.getProjectFiles(projectId);
  }

  @Get(':projectId/graph')
  @ApiOperation({ summary: 'Get full dependency graph' })
  getGraph(@Param('projectId') projectId: string) {
    return this.searchService.getProjectGraph(projectId);
  }
}
