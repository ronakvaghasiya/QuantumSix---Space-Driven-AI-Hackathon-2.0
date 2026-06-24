import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../projects/entities/project.entity';
import { AutoReindexService } from '../memory/services/auto-reindex.service';

@Injectable()
export class VcsWebhookService {
  private readonly logger = new Logger(VcsWebhookService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly autoReindex: AutoReindexService,
  ) {}

  async handleGitLabPush(body: Record<string, unknown>): Promise<{ ok: boolean; projectId?: string }> {
    if (body.object_kind !== 'push') return { ok: true };

    const projectPayload = body.project as Record<string, unknown> | undefined;
    const repoUrl = (projectPayload?.git_http_url || projectPayload?.http_url) as string | undefined;
    if (!repoUrl) return { ok: false };

    const project = await this.findProjectByUrl(repoUrl);
    if (!project || !project.autoReindexEnabled) return { ok: true };

    const commits = (body.commits as Array<Record<string, unknown>>) || [];
    const changedFiles = new Set<string>();
    for (const commit of commits) {
      for (const key of ['added', 'modified', 'removed']) {
        for (const file of (commit[key] as string[]) || []) {
          changedFiles.add(file);
        }
      }
    }

    const ref = (body.ref as string) || '';
    const branch = ref.replace('refs/heads/', '');
    const after = (body.after as string) || null;

    await this.autoReindex.triggerReindex(project.id, 'gitlab_webhook', {
      changedFiles: [...changedFiles],
      commitSha: after || undefined,
      branch: branch || project.defaultBranch,
    });

    this.logger.log(`GitLab webhook triggered reindex for ${project.name} (${changedFiles.size} files)`);
    return { ok: true, projectId: project.id };
  }

  async handleGitHubPush(body: Record<string, unknown>): Promise<{ ok: boolean; projectId?: string }> {
    const repo = body.repository as Record<string, unknown> | undefined;
    const repoUrl = (repo?.html_url || repo?.clone_url) as string | undefined;
    if (!repoUrl) return { ok: false };

    const project = await this.findProjectByUrl(repoUrl);
    if (!project || !project.autoReindexEnabled) return { ok: true };

    const commits = (body.commits as Array<Record<string, unknown>>) || [];
    const changedFiles = new Set<string>();
    for (const commit of commits) {
      for (const key of ['added', 'modified', 'removed']) {
        for (const file of (commit[key] as string[]) || []) {
          changedFiles.add(file);
        }
      }
    }

    const ref = (body.ref as string) || '';
    const branch = ref.replace('refs/heads/', '');
    const after = (body.after as string) || null;

    await this.autoReindex.triggerReindex(project.id, 'github_webhook', {
      changedFiles: [...changedFiles],
      commitSha: after || undefined,
      branch: branch || project.defaultBranch,
    });

    this.logger.log(`GitHub webhook triggered reindex for ${project.name} (${changedFiles.size} files)`);
    return { ok: true, projectId: project.id };
  }

  private async findProjectByUrl(repoUrl: string): Promise<Project | null> {
    const normalized = this.normalizeRepoUrl(repoUrl);
    const projects = await this.projectRepo.find();
    return (
      projects.find((p) => this.normalizeRepoUrl(p.repositoryUrl) === normalized) || null
    );
  }

  private normalizeRepoUrl(url: string): string {
    return url
      .replace(/\.git$/, '')
      .replace(/\/$/, '')
      .toLowerCase()
      .replace(/^https?:\/\/gitlab\.com/, 'https://gitlab.com')
      .replace(/^git@gitlab\.com:/, 'https://gitlab.com/');
  }
}
