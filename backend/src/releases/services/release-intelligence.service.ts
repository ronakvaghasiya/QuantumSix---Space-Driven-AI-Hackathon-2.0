import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Release, ReleaseChangelogEntry } from '../entities/release.entity';
import { Task } from '../../tasks/entities/task.entity';
import { TaskCodeDiff } from '../../tasks/entities/task-code-diff.entity';
import { TaskValidation } from '../../tasks/entities/task-validation.entity';
import { RiskAssessment } from '../../risk/entities/risk-assessment.entity';
import { AiReview } from '../../ai-reviewer/entities/ai-review.entity';
import { LlmService } from '../../tasks/services/llm.service';

interface ReleaseLlmResult {
  releaseNotes: string;
  sprintSummary: string;
  changelog: ReleaseChangelogEntry[];
  impactSummary: Record<string, unknown>;
  riskSummary: Record<string, unknown>;
}

@Injectable()
export class ReleaseIntelligenceService {
  private readonly logger = new Logger(ReleaseIntelligenceService.name);

  constructor(
    @InjectRepository(Release)
    private readonly releaseRepo: Repository<Release>,
    @InjectRepository(TaskCodeDiff)
    private readonly codeDiffRepo: Repository<TaskCodeDiff>,
    @InjectRepository(TaskValidation)
    private readonly validationRepo: Repository<TaskValidation>,
    @InjectRepository(RiskAssessment)
    private readonly riskRepo: Repository<RiskAssessment>,
    @InjectRepository(AiReview)
    private readonly aiReviewRepo: Repository<AiReview>,
    private readonly llm: LlmService,
  ) {}

  async createReleaseFromMerge(
    task: Task,
    organizationId: string,
    mergeCommitSha?: string | null,
  ): Promise<Release> {
    const versionTag = await this.nextVersionTag(task.projectId);
    const context = await this.buildContext(task);

    let generated: ReleaseLlmResult;
    try {
      generated = await this.llm.jsonCompletion<ReleaseLlmResult>(
        `You are a release manager generating release artifacts for a merged software task.
Return JSON only:
{
  "releaseNotes": string (markdown, user-facing, 3-8 bullet points),
  "sprintSummary": string (2-4 sentences for stakeholders),
  "changelog": [{ "type": "feature"|"fix"|"refactor"|"chore"|"docs", "description": string, "taskId": string optional, "filePath": string optional }],
  "impactSummary": { "areas": string[], "filesChanged": number, "highlights": string[] },
  "riskSummary": { "level": string, "score": number, "notes": string }
}`,
        context,
        { maxTokens: 2048, projectId: task.projectId, taskId: task.id },
      );
    } catch (error) {
      this.logger.warn(`LLM release generation failed: ${(error as Error).message}`);
      generated = this.fallbackRelease(task, context);
    }

    return this.releaseRepo.save(
      this.releaseRepo.create({
        organizationId,
        projectId: task.projectId,
        taskId: task.id,
        versionTag,
        mergeCommitSha: mergeCommitSha || null,
        releaseNotes: generated.releaseNotes,
        sprintSummary: generated.sprintSummary,
        changelog: generated.changelog || [],
        impactSummary: generated.impactSummary || {},
        riskSummary: generated.riskSummary || {},
      }),
    );
  }

  private async nextVersionTag(projectId: string): Promise<string> {
    const count = await this.releaseRepo.count({ where: { projectId } });
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
    return `v${date}.${count + 1}`;
  }

  private async buildContext(task: Task): Promise<string> {
    const codeDiff = await this.codeDiffRepo.findOne({
      where: { taskId: task.id },
      order: { createdAt: 'DESC' },
    });
    const validation = await this.validationRepo.findOne({
      where: { taskId: task.id },
      order: { createdAt: 'DESC' },
    });
    const risk = await this.riskRepo.findOne({
      where: { taskId: task.id },
      order: { computedAt: 'DESC' },
    });
    const aiReview = await this.aiReviewRepo.findOne({
      where: { taskId: task.id },
      order: { createdAt: 'DESC' },
    });

    const files = (codeDiff?.filesToModify || [])
      .map((f) => `- ${f.path}: ${f.changes.join('; ')}`)
      .join('\n');

    return `Task: ${task.taskId}
Requirement: ${task.requirement}
Acceptance criteria: ${task.acceptanceCriteria || 'N/A'}
Business impact: ${task.businessImpact || 'N/A'}
Risk level: ${task.risk}

Implementation plan:
${codeDiff?.implementationPlan || 'N/A'}

Files changed:
${files || 'See diff'}

Validation: lint=${validation?.lintStatus || 'n/a'}, build=${validation?.buildStatus || 'n/a'}, tests passed=${validation?.playwrightPassed ?? 0}

Risk assessment: ${risk ? `${risk.overallScore}/100 (${risk.riskLevel}) — ${risk.summary}` : 'N/A'}

AI review: ${aiReview ? `score ${aiReview.overallScore}/100 — ${aiReview.summary}` : 'N/A'}
AI findings: ${aiReview?.findings?.slice(0, 5).map((f) => f.title).join('; ') || 'none'}`;
  }

  private fallbackRelease(task: Task, context: string): ReleaseLlmResult {
    return {
      releaseNotes: `## ${task.taskId}\n\n- ${task.requirement}\n- Merged via RepoPilot AI pipeline`,
      sprintSummary: `Task ${task.taskId} completed and merged. ${task.businessImpact || ''}`.trim(),
      changelog: [
        {
          type: 'feature',
          description: task.requirement.slice(0, 200),
          taskId: task.taskId,
        },
      ],
      impactSummary: { areas: [], filesChanged: 0, highlights: [task.taskId] },
      riskSummary: { level: task.risk, score: 0, notes: context.slice(0, 300) },
    };
  }
}
