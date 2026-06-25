import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { Public } from '../auth/public.decorator';
import { GitLabService } from './gitlab.service';
import { SaveGitLabPatDto } from './dto/gitlab.dto';

@ApiTags('GitLab')
@Controller('gitlab')
export class GitLabController {
  constructor(
    private readonly gitlabService: GitLabService,
    private readonly config: ConfigService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Get GitLab connection status' })
  getStatus() {
    return this.gitlabService.getConnectionStatus();
  }

  @Public()
  @Get('auth')
  @ApiOperation({ summary: 'Redirect to GitLab OAuth (optional — requires GITLAB_CLIENT_ID)' })
  auth(@Res() res: Response) {
    res.redirect(this.gitlabService.getOAuthUrl());
  }

  @Public()
  @Get('callback')
  @ApiOperation({ summary: 'GitLab OAuth callback' })
  async callback(@Query('code') code: string, @Res() res: Response) {
    await this.gitlabService.handleOAuthCallback(code);
    const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3100');
    res.redirect(`${frontendUrl}/settings?gitlab=connected`);
  }

  @Post('token')
  @ApiOperation({ summary: 'Save GitLab Personal Access Token' })
  savePat(@Body() dto: SaveGitLabPatDto) {
    return this.gitlabService.savePat(dto);
  }

  @Post('sync-env')
  @ApiOperation({ summary: 'Connect GitLab using GITLAB_TOKEN from .env' })
  syncFromEnv() {
    return this.gitlabService.syncFromEnv();
  }

  @Delete('disconnect')
  @ApiOperation({ summary: 'Disconnect GitLab' })
  async disconnect() {
    await this.gitlabService.disconnect();
    return { disconnected: true };
  }

  @Get('repos')
  @ApiOperation({ summary: 'List GitLab projects for authenticated user' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'perPage', required: false })
  listRepos(@Query('page') page?: number, @Query('perPage') perPage?: number) {
    return this.gitlabService.listRepositories(
      page ? Number(page) : 1,
      perPage ? Number(perPage) : 30,
    );
  }

  @Get('repos/branches')
  @ApiOperation({ summary: 'List project branches' })
  @ApiQuery({ name: 'projectId', required: true })
  listBranches(@Query('projectId') projectId: string) {
    return this.gitlabService.listBranches(Number(projectId));
  }
}
