import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Task } from '../tasks/entities/task.entity';
import { Project } from '../projects/entities/project.entity';

@Injectable()
export class N8nService {
  private readonly logger = new Logger(N8nService.name);
  private readonly webhookBase: string;

  constructor(private readonly config: ConfigService) {
    this.webhookBase = this.config.get('N8N_WEBHOOK_BASE', 'http://localhost:5678/webhook');
  }

  async triggerTaskWorkflow(task: Task): Promise<void> {
    await this.callWebhook('task-created', {
      taskId: task.id,
      externalTaskId: task.taskId,
      projectId: task.projectId,
      requirement: task.requirement,
    });
  }

  async triggerCodeGeneration(task: Task): Promise<void> {
    await this.callWebhook('code-generation', {
      taskId: task.id,
      externalTaskId: task.taskId,
      projectId: task.projectId,
    });
  }

  async triggerValidation(task: Task): Promise<void> {
    await this.callWebhook('validation', {
      taskId: task.id,
      externalTaskId: task.taskId,
      projectId: task.projectId,
    });
  }

  async triggerRepositoryIndex(project: Project): Promise<void> {
    await this.callWebhook('repository-index', {
      projectId: project.id,
      repositoryUrl: project.repositoryUrl,
      branch: project.defaultBranch,
    });
  }

  private async callWebhook(path: string, payload: Record<string, unknown>): Promise<void> {
    const url = `${this.webhookBase}/${path}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        this.logger.warn(`n8n webhook ${path} returned ${response.status}`);
      }
    } catch (error) {
      this.logger.debug(`n8n webhook ${path} unavailable: ${(error as Error).message}`);
    }
  }
}
