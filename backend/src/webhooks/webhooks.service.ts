import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../tasks/entities/task.entity';
import { TaskTimeline } from '../tasks/entities/task-timeline.entity';
import { TaskAnalysis } from '../tasks/entities/task-analysis.entity';
import { TaskTest } from '../tasks/entities/task-test.entity';
import { TaskCodeDiff } from '../tasks/entities/task-code-diff.entity';
import { TaskValidation } from '../tasks/entities/task-validation.entity';
import { TaskPullRequest } from '../tasks/entities/task-pull-request.entity';
import { TaskStatus } from '../common/enums/task.enum';

@Injectable()
export class WebhooksService {
  constructor(
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
    @InjectRepository(TaskTimeline) private readonly timelineRepo: Repository<TaskTimeline>,
    @InjectRepository(TaskAnalysis) private readonly analysisRepo: Repository<TaskAnalysis>,
    @InjectRepository(TaskTest) private readonly testRepo: Repository<TaskTest>,
    @InjectRepository(TaskCodeDiff) private readonly codeDiffRepo: Repository<TaskCodeDiff>,
    @InjectRepository(TaskValidation) private readonly validationRepo: Repository<TaskValidation>,
    @InjectRepository(TaskPullRequest) private readonly prRepo: Repository<TaskPullRequest>,
  ) {}

  async handleTaskUpdate(body: Record<string, unknown>) {
    const taskId = body.taskId as string;
    const status = body.status as TaskStatus;
    if (!taskId || !status) return { ok: false };

    await this.taskRepo.update(taskId, { status });
    return { ok: true };
  }

  async handleAnalysisComplete(body: Record<string, unknown>) {
    const taskId = body.taskId as string;
    if (!taskId) return { ok: false };

    await this.analysisRepo.save(
      this.analysisRepo.create({
        taskId,
        impactedFiles: (body.impactedFiles as { path: string; confidence: number }[]) || [],
        regressionAreas: (body.regressionAreas as string[]) || [],
        dependencyGraph: (body.dependencyGraph as Record<string, string[]>) || null,
        apiDependencies: (body.apiDependencies as string[]) || [],
      }),
    );

    if (body.tests) {
      await this.testRepo.save(
        this.testRepo.create({
          taskId,
          functionalTests: (body.functionalTests as { name: string; passed: boolean }[]) || [],
          edgeCases: (body.edgeCases as string[]) || [],
          regressionCases: (body.regressionCases as string[]) || [],
          playwrightSpecs: (body.playwrightSpecs as { filename: string; content: string }[]) || [],
          regressionCoverage: (body.regressionCoverage as number) || 0,
        }),
      );
    }

    await this.taskRepo.update(taskId, {
      status: TaskStatus.APPROVAL_REQUIRED,
      acceptanceCriteria: (body.acceptanceCriteria as string) || null,
      userStories: (body.userStories as string[]) || null,
      keywords: (body.keywords as string[]) || null,
      businessImpact: (body.businessImpact as string) || null,
      risk: (body.risk as Task['risk']) || undefined,
    });

    return { ok: true };
  }

  async handleValidationComplete(body: Record<string, unknown>) {
    const taskId = body.taskId as string;
    if (!taskId) return { ok: false };

    await this.validationRepo.save(
      this.validationRepo.create({
        taskId,
        lintStatus: (body.lintStatus as string) || 'pending',
        buildStatus: (body.buildStatus as string) || 'pending',
        playwrightPassed: (body.playwrightPassed as number) || 0,
        playwrightFailed: (body.playwrightFailed as number) || 0,
        coverage: (body.coverage as number) || 0,
        details: (body.details as Record<string, unknown>) || null,
      }),
    );

    if (body.codeDiff) {
      await this.codeDiffRepo.save(
        this.codeDiffRepo.create({
          taskId,
          implementationPlan: (body.implementationPlan as string) || null,
          filesToModify: (body.filesToModify as { path: string; changes: string[] }[]) || [],
          diff: (body.diff as string) || null,
          patchContent: (body.patchContent as string) || null,
        }),
      );
    }

    return { ok: true };
  }

  async handlePrCreated(body: Record<string, unknown>) {
    const taskId = body.taskId as string;
    if (!taskId) return { ok: false };

    await this.prRepo.save(
      this.prRepo.create({
        taskId,
        branchName: (body.branchName as string) || '',
        commitSha: (body.commitSha as string) || null,
        prUrl: (body.prUrl as string) || null,
        prNumber: (body.prNumber as number) || null,
        reviewStatus: (body.reviewStatus as string) || 'open',
      }),
    );

    await this.taskRepo.update(taskId, { status: TaskStatus.PR_CREATED });
    return { ok: true };
  }
}
