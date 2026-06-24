import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiReview, AiReviewFinding } from './entities/ai-review.entity';
import { Task } from '../tasks/entities/task.entity';
import { TaskCodeDiff } from '../tasks/entities/task-code-diff.entity';
import { TaskValidation } from '../tasks/entities/task-validation.entity';
import { RiskAssessment } from '../risk/entities/risk-assessment.entity';
import { LlmService } from '../tasks/services/llm.service';

interface AiReviewLlmResult {
  overallScore: number;
  summary: string;
  findings: AiReviewFinding[];
}

@Injectable()
export class AiReviewerService {
  private readonly logger = new Logger(AiReviewerService.name);

  constructor(
    @InjectRepository(AiReview)
    private readonly reviewRepo: Repository<AiReview>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(TaskCodeDiff)
    private readonly codeDiffRepo: Repository<TaskCodeDiff>,
    @InjectRepository(TaskValidation)
    private readonly validationRepo: Repository<TaskValidation>,
    @InjectRepository(RiskAssessment)
    private readonly riskRepo: Repository<RiskAssessment>,
    private readonly llm: LlmService,
  ) {}

  async getLatest(taskId: string): Promise<AiReview | null> {
    return this.reviewRepo.findOne({
      where: { taskId },
      order: { createdAt: 'DESC' },
    });
  }

  async reviewTask(taskId: string): Promise<AiReview> {
    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: ['project'],
    });
    if (!task) throw new NotFoundException(`Task ${taskId} not found`);

    const codeDiff = await this.codeDiffRepo.findOne({
      where: { taskId },
      order: { createdAt: 'DESC' },
    });
    if (!codeDiff) throw new NotFoundException('No code diff to review');

    const validation = await this.validationRepo.findOne({
      where: { taskId },
      order: { createdAt: 'DESC' },
    });
    const risk = await this.riskRepo.findOne({
      where: { taskId },
      order: { computedAt: 'DESC' },
    });

    const diffSnippet = (codeDiff.diff || codeDiff.patchContent || '').slice(0, 12_000);
    const fileList = (codeDiff.filesToModify || [])
      .map((f) => `- ${f.path}: ${f.changes.join('; ')}`)
      .join('\n');

    const validationSummary = validation
      ? `Lint: ${validation.lintStatus}, Build: ${validation.buildStatus}, Tests passed: ${validation.playwrightPassed}, failed: ${validation.playwrightFailed}`
      : 'Not yet validated';

    const riskSummary = risk
      ? `Risk score: ${risk.overallScore}/100 (${risk.riskLevel}) — ${risk.summary}`
      : 'No risk assessment';

    const result = await this.llm.jsonCompletion<AiReviewLlmResult>(
      `You are a senior code reviewer. Review generated code changes for bugs, security, performance, testing gaps, and code smells.
Return JSON only:
{
  "overallScore": number 0-100 (higher is better),
  "summary": string (2-4 sentences),
  "findings": [{ "category": "bug"|"performance"|"security"|"testing"|"smell", "severity": "low"|"medium"|"high"|"critical", "title": string, "detail": string, "filePath": string optional }]
}
Be specific and actionable. Max 8 findings.`,
      `Task: ${task.taskId}
Requirement: ${task.requirement}
Acceptance criteria: ${task.acceptanceCriteria || 'N/A'}

Implementation plan:
${codeDiff.implementationPlan || 'N/A'}

Files changed:
${fileList || 'See diff'}

Diff:
${diffSnippet || 'No unified diff available'}

Validation: ${validationSummary}
Risk: ${riskSummary}`,
      { maxTokens: 2048, projectId: task.projectId, taskId },
    );

    const findings = (result.findings || []).slice(0, 12);
    const overallScore = Math.min(100, Math.max(0, Number(result.overallScore) || 0));

    return this.reviewRepo.save(
      this.reviewRepo.create({
        taskId,
        overallScore,
        findings,
        summary: result.summary || 'AI review completed.',
      }),
    );
  }
}
