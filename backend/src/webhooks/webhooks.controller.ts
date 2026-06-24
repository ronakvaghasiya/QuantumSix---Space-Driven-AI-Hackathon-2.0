import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { VcsWebhookService } from './vcs-webhook.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly vcsWebhook: VcsWebhookService,
  ) {}

  @Post('gitlab')
  @ApiOperation({ summary: 'GitLab push webhook — triggers incremental reindex' })
  handleGitLab(@Body() body: Record<string, unknown>) {
    return this.vcsWebhook.handleGitLabPush(body);
  }

  @Post('github')
  @ApiOperation({ summary: 'GitHub push webhook — triggers incremental reindex' })
  handleGitHub(@Body() body: Record<string, unknown>) {
    return this.vcsWebhook.handleGitHubPush(body);
  }

  @Post('n8n/task-update')
  @ApiOperation({ summary: 'Receive task status updates from n8n' })
  handleTaskUpdate(@Body() body: Record<string, unknown>) {
    return this.webhooksService.handleTaskUpdate(body);
  }

  @Post('n8n/analysis-complete')
  @ApiOperation({ summary: 'Receive analysis results from n8n' })
  handleAnalysisComplete(@Body() body: Record<string, unknown>) {
    return this.webhooksService.handleAnalysisComplete(body);
  }

  @Post('n8n/validation-complete')
  @ApiOperation({ summary: 'Receive validation results from n8n' })
  handleValidationComplete(@Body() body: Record<string, unknown>) {
    return this.webhooksService.handleValidationComplete(body);
  }

  @Post('n8n/pr-created')
  @ApiOperation({ summary: 'Receive PR creation notification from n8n' })
  handlePrCreated(@Body() body: Record<string, unknown>) {
    return this.webhooksService.handlePrCreated(body);
  }
}
