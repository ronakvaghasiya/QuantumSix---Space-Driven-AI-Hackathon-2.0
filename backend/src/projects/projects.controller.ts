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
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto, ConnectProjectDto } from './dto/project.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { Permission } from '../common/enums/organization.enum';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';

@ApiTags('Projects')
@ApiBearerAuth()
@Controller('projects')
@UseGuards(PermissionsGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @RequirePermission(Permission.VIEW_ALL)
  @ApiOperation({ summary: 'List projects in current organization' })
  findAll(@CurrentUser() user: AuthUser) {
    return this.projectsService.findAll(user.organizationId);
  }

  @Get(':id')
  @RequirePermission(Permission.VIEW_ALL)
  @ApiOperation({ summary: 'Get project by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.projectsService.findOne(id, user.organizationId);
  }

  @Get(':id/indexing-status')
  @RequirePermission(Permission.VIEW_ALL)
  @ApiOperation({ summary: 'Get project indexing status and progress' })
  getIndexingStatus(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.projectsService.getIndexingStatus(id, user.organizationId);
  }

  @Post()
  @RequirePermission(Permission.CREATE_PROJECT)
  @ApiOperation({ summary: 'Create a new project' })
  create(@Body() dto: CreateProjectDto, @CurrentUser() user: AuthUser) {
    return this.projectsService.create(dto, user.organizationId);
  }

  @Put(':id')
  @RequirePermission(Permission.CREATE_PROJECT)
  @ApiOperation({ summary: 'Update project' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.projectsService.update(id, dto, user.organizationId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(Permission.CREATE_PROJECT)
  @ApiOperation({ summary: 'Delete project' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.projectsService.remove(id, user.organizationId);
  }

  @Post(':id/connect')
  @RequirePermission(Permission.CONNECT_REPOSITORY)
  @ApiOperation({ summary: 'Connect repository and start indexing' })
  connect(
    @Param('id') id: string,
    @Body() dto: ConnectProjectDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.projectsService.connectRepository(id, user.organizationId, dto);
  }

  @Post(':id/reindex')
  @RequirePermission(Permission.CONNECT_REPOSITORY)
  @ApiOperation({ summary: 'Reindex repository' })
  reindex(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.projectsService.reindexRepository(id, user.organizationId);
  }

  @Post(':id/sync')
  @RequirePermission(Permission.CONNECT_REPOSITORY)
  @ApiOperation({ summary: 'Sync repository' })
  sync(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.projectsService.syncRepository(id, user.organizationId);
  }
}
