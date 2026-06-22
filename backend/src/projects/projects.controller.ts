import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto, ConnectProjectDto } from './dto/project.dto';

@ApiTags('Projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'List all projects' })
  findAll() {
    return this.projectsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Get(':id/indexing-status')
  @ApiOperation({ summary: 'Get project indexing status and progress' })
  getIndexingStatus(@Param('id') id: string) {
    return this.projectsService.getIndexingStatus(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  create(@Body() dto: CreateProjectDto) {
    return this.projectsService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update project' })
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete project' })
  remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }

  @Post(':id/connect')
  @ApiOperation({ summary: 'Connect repository and start indexing' })
  connect(@Param('id') id: string, @Body() dto?: ConnectProjectDto) {
    return this.projectsService.connectRepository(id, dto);
  }

  @Post(':id/reindex')
  @ApiOperation({ summary: 'Reindex repository' })
  reindex(@Param('id') id: string) {
    return this.projectsService.reindexRepository(id);
  }

  @Post(':id/sync')
  @ApiOperation({ summary: 'Sync repository' })
  sync(@Param('id') id: string) {
    return this.projectsService.syncRepository(id);
  }
}
