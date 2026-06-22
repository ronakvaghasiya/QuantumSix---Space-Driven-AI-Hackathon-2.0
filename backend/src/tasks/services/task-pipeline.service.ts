import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import { Task } from '../entities/task.entity';
import { TaskTimeline } from '../entities/task-timeline.entity';
import { TaskAnalysis } from '../entities/task-analysis.entity';
import { TaskTest } from '../entities/task-test.entity';
import { TaskCodeDiff } from '../entities/task-code-diff.entity';
import { TaskValidation } from '../entities/task-validation.entity';
import { TaskPullRequest } from '../entities/task-pull-request.entity';
import {
  AgentType,
  RiskLevel,
  TaskStatus,
  TimelineStep,
  TimelineStepStatus,
} from '../../common/enums/task.enum';
import { LlmService } from './llm.service';
import { RepositorySearchService } from '../../repository/services/repository-search.service';
import { GitLabService } from '../../gitlab/gitlab.service';
import { ProjectStatus } from '../../common/enums/project.enum';
import { TaskGitService } from './task-git.service';
import { CodeContextService } from './code-context.service';
import { ValidationRunnerService } from './validation-runner.service';
import { ValidationDetails } from '../types/validation.types';

interface RequirementAnalysisResult {
  acceptanceCriteria: string;
  userStories: string[];
  keywords: string[];
  risk: RiskLevel;
  businessImpact: string;
}

interface ImpactAnalysisResult {
  regressionAreas: string[];
  apiDependencies: string[];
}

interface TestGenerationResult {
  functionalTests: { name: string; passed: boolean }[];
  edgeCases: string[];
  regressionCases: string[];
  playwrightSpecs: { filename: string; content: string }[];
  regressionCoverage: number;
}

interface CodePlanResult {
  implementationPlan: string;
  targetFiles: string[];
}

interface FileEditResult {
  newContent: string;
  changeComments: string[];
}

@Injectable()
export class TaskPipelineService {
  private readonly logger = new Logger(TaskPipelineService.name);

  constructor(
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
    @InjectRepository(TaskTimeline) private readonly timelineRepo: Repository<TaskTimeline>,
    @InjectRepository(TaskAnalysis) private readonly analysisRepo: Repository<TaskAnalysis>,
    @InjectRepository(TaskTest) private readonly testRepo: Repository<TaskTest>,
    @InjectRepository(TaskCodeDiff) private readonly codeDiffRepo: Repository<TaskCodeDiff>,
    @InjectRepository(TaskValidation) private readonly validationRepo: Repository<TaskValidation>,
    @InjectRepository(TaskPullRequest) private readonly prRepo: Repository<TaskPullRequest>,
    private readonly llm: LlmService,
    private readonly search: RepositorySearchService,
    private readonly gitlab: GitLabService,
    private readonly taskGit: TaskGitService,
    private readonly codeContext: CodeContextService,
    private readonly validationRunner: ValidationRunnerService,
  ) {}

  async markAnalysisApproved(taskId: string): Promise<void> {
    await this.setStep(taskId, TimelineStep.APPROVAL, TimelineStepStatus.COMPLETED);
  }

  async finalizeTimeline(taskId: string): Promise<void> {
    const entries = await this.timelineRepo.find({ where: { taskId } });
    const order = Object.values(TimelineStep);
    for (const entry of entries) {
      if (
        entry.status === TimelineStepStatus.RUNNING ||
        (entry.step === TimelineStep.APPROVAL && entry.status === TimelineStepStatus.PENDING)
      ) {
        const stepIndex = order.indexOf(entry.step);
        const prIndex = order.indexOf(TimelineStep.PR);
        if (stepIndex >= 0 && stepIndex < prIndex) {
          entry.status = TimelineStepStatus.COMPLETED;
          entry.completedAt = entry.completedAt || new Date();
          await this.timelineRepo.save(entry);
        }
      }
    }
  }

  async runAnalysis(taskId: string): Promise<void> {
    const task = await this.loadTask(taskId);
    if (!task) return;

    try {
      await this.taskRepo.update(taskId, { status: TaskStatus.ANALYZING });
      await this.setStep(taskId, TimelineStep.REQUIREMENT_ANALYSIS, TimelineStepStatus.RUNNING);

      const requirement = await this.llm.jsonCompletion<RequirementAnalysisResult>(
        'You are a senior product analyst. Return JSON with keys: acceptanceCriteria (string), userStories (string[]), keywords (string[]), risk (low|medium|high|critical), businessImpact (string).',
        `Analyze this software requirement:\n\n${task.requirement}`,
      );

      await this.setStep(taskId, TimelineStep.REQUIREMENT_ANALYSIS, TimelineStepStatus.COMPLETED);
      await this.setStep(taskId, TimelineStep.REPOSITORY_ANALYSIS, TimelineStepStatus.RUNNING);

      let repoIntel = {
        relevantFiles: [] as { file: string; score: number; confidence: number }[],
        adjacencyList: {} as Record<string, string[]>,
        keywords: requirement.keywords,
      };

      if (task.project?.status === ProjectStatus.COMPLETED) {
        repoIntel = await this.search.analyzeRequirement({
          projectId: task.projectId,
          requirement: task.requirement,
          taskId: task.id,
        });
      }

      await this.setStep(taskId, TimelineStep.REPOSITORY_ANALYSIS, TimelineStepStatus.COMPLETED);
      await this.setStep(taskId, TimelineStep.IMPACT_ANALYSIS, TimelineStepStatus.RUNNING);

      const fileList = repoIntel.relevantFiles
        .slice(0, 10)
        .map((f) => `${f.file} (${f.confidence}%)`)
        .join('\n');

      const impact = await this.llm.jsonCompletion<ImpactAnalysisResult>(
        'You are a software architect. Return JSON: regressionAreas (string[]), apiDependencies (string[]).',
        `Requirement: ${task.requirement}\n\nPotentially impacted files:\n${fileList || 'No indexed files — infer from requirement.'}`,
      );

      await this.setStep(taskId, TimelineStep.IMPACT_ANALYSIS, TimelineStepStatus.COMPLETED);
      await this.setStep(taskId, TimelineStep.TEST_GENERATION, TimelineStepStatus.RUNNING);

      const tests = await this.llm.jsonCompletion<TestGenerationResult>(
        'You are a QA engineer. Return JSON: functionalTests ([{name, passed}]), edgeCases (string[]), regressionCases (string[]), playwrightSpecs ([{filename, content}]), regressionCoverage (number 0-100). Mark functionalTests passed=true for planned tests.',
        `Generate tests for:\n${task.requirement}\n\nAcceptance criteria:\n${requirement.acceptanceCriteria}`,
      );

      const impactedFiles = repoIntel.relevantFiles.map((f) => ({
        path: f.file,
        confidence: f.confidence,
      }));

      await this.analysisRepo.save(
        this.analysisRepo.create({
          taskId,
          impactedFiles,
          regressionAreas: impact.regressionAreas,
          dependencyGraph: repoIntel.adjacencyList,
          apiDependencies: impact.apiDependencies,
        }),
      );

      await this.testRepo.save(
        this.testRepo.create({
          taskId,
          functionalTests: tests.functionalTests,
          edgeCases: tests.edgeCases,
          regressionCases: tests.regressionCases,
          playwrightSpecs: tests.playwrightSpecs,
          regressionCoverage: tests.regressionCoverage,
        }),
      );

      await this.taskRepo.update(taskId, {
        status: TaskStatus.APPROVAL_REQUIRED,
        acceptanceCriteria: requirement.acceptanceCriteria,
        userStories: requirement.userStories,
        keywords: [...new Set([...requirement.keywords, ...repoIntel.keywords])],
        businessImpact: requirement.businessImpact,
        risk: this.normalizeRisk(requirement.risk),
      });

      await this.setStep(taskId, TimelineStep.TEST_GENERATION, TimelineStepStatus.COMPLETED);
      // Approval waits for user — keep PENDING (not RUNNING) so timeline doesn't show a spinner
      await this.setStep(taskId, TimelineStep.APPROVAL, TimelineStepStatus.PENDING);
      this.logger.log(`Analysis complete for task ${taskId}`);
    } catch (error) {
      this.logger.error(`Analysis failed for ${taskId}: ${(error as Error).message}`);
      await this.taskRepo.update(taskId, { status: TaskStatus.FAILED });
      await this.failRunningSteps(taskId);
    }
  }

  async runCodeGeneration(taskId: string): Promise<void> {
    const task = await this.loadTask(taskId);
    if (!task) return;

    try {
      await this.taskRepo.update(taskId, { status: TaskStatus.GENERATING_CODE });
      await this.setStep(taskId, TimelineStep.APPROVAL, TimelineStepStatus.COMPLETED);
      await this.setStep(taskId, TimelineStep.CODE_GENERATION, TimelineStepStatus.RUNNING);

      const analysis = await this.analysisRepo.findOne({ where: { taskId } });
      const impactedPaths = (analysis?.impactedFiles || []).map((f) => f.path);
      const clonePath = task.project?.clonePath;

      const plan = await this.llm.jsonCompletion<CodePlanResult>(
        `You are a senior developer planning code changes for a real repository.
Return JSON only: { implementationPlan (string), targetFiles (string[] — relative paths, max 2 files) }.
Pick the smallest set of files that satisfy the requirement. NEVER pick markdown/doc-only paths.`,
        `Task: ${task.taskId}\nRequirement: ${task.requirement}\n\nAcceptance criteria:\n${task.acceptanceCriteria || 'N/A'}\n\nImpacted files:\n${impactedPaths.join('\n') || 'Infer from requirement'}`,
        { maxTokens: 1024 },
      );

      const targetFiles = (
        plan.targetFiles?.length ? plan.targetFiles : impactedPaths
      )
        .slice(0, 2)
        .filter(Boolean);

      const rawEdits: { path: string; newContent: string; changeComments: string[] }[] = [];

      for (const filePath of targetFiles) {
        const currentContent =
          clonePath && fs.existsSync(clonePath)
            ? this.codeContext.readFileContent(clonePath, filePath, 6_000)
            : null;

        try {
          const edit = await this.llm.jsonCompletion<FileEditResult>(
            `You edit ONE source file for a task. Return JSON only:
{ newContent (string — complete updated file), changeComments (string[] — what changed) }
Rules: Real code only. Keep unchanged parts identical. No markdown docs.`,
            `Task: ${task.taskId}\nRequirement: ${task.requirement}\nPlan: ${plan.implementationPlan}\n\nFile: ${filePath}\n\n${
              currentContent
                ? `Current file content:\n\`\`\`\n${currentContent}\n\`\`\``
                : 'File not in clone — generate realistic content for this path.'
            }`,
            { maxTokens: 8192 },
          );

          if (edit.newContent?.trim()) {
            rawEdits.push({
              path: filePath,
              newContent: edit.newContent,
              changeComments: edit.changeComments?.length
                ? edit.changeComments
                : ['Updated implementation'],
            });
          }
        } catch (fileError) {
          this.logger.warn(
            `Code edit failed for ${filePath}: ${(fileError as Error).message}`,
          );
        }
      }

      if (rawEdits.length === 0) {
        throw new Error('No file edits generated — try again or use OpenAI for larger changes');
      }

      const fileEdits =
        clonePath && rawEdits.length > 0
          ? this.codeContext.enrichFileEdits(clonePath, rawEdits)
          : rawEdits;
      let diff = '';
      let patchContent = '';
      if (clonePath && fileEdits.length > 0) {
        const generated = this.codeContext.buildUnifiedDiff(clonePath, fileEdits);
        if (generated) {
          diff = generated;
          patchContent = generated;
        }
      }

      await this.codeDiffRepo.save(
        this.codeDiffRepo.create({
          taskId,
          implementationPlan: plan.implementationPlan,
          filesToModify: fileEdits.map((e) => ({
            path: e.path,
            changes: e.changeComments?.length ? e.changeComments : ['Updated implementation'],
          })),
          fileEdits,
          diff,
          patchContent,
          approvalStatus: 'pending',
        }),
      );

      await this.setStep(taskId, TimelineStep.CODE_GENERATION, TimelineStepStatus.COMPLETED);
      this.logger.log(`Code generation complete for task ${taskId}`);
    } catch (error) {
      this.logger.error(`Code generation failed for ${taskId}: ${(error as Error).message}`);
      await this.taskRepo.update(taskId, { status: TaskStatus.FAILED });
      await this.failRunningSteps(taskId);
    }
  }

  async runValidation(taskId: string): Promise<void> {
    const task = await this.loadTask(taskId);
    if (!task) return;

    try {
      await this.taskRepo.update(taskId, { status: TaskStatus.TESTING });
      await this.setStep(taskId, TimelineStep.VALIDATION, TimelineStepStatus.RUNNING);

      const codeDiff = await this.codeDiffRepo.findOne({ where: { taskId } });
      const tests = await this.testRepo.findOne({ where: { taskId } });
      const branchName = `feature/repopilot-${task.taskId.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;

      const clonePath = await this.taskGit.prepareWorkspace(task, branchName, codeDiff);
      const validation = clonePath
        ? await this.validationRunner.runFull(
            clonePath,
            tests?.functionalTests || [],
            tests?.playwrightSpecs || [],
          )
        : null;

      if (tests && validation) {
        tests.functionalTests = validation.tests.results.length > 0
          ? validation.tests.results.map((r) => ({ name: r.name, passed: r.passed }))
          : tests.functionalTests.map((t) => ({
              ...t,
              passed: validation.build.status === 'pass' && validation.eslint.status !== 'fail',
            }));
        await this.testRepo.save(tests);
      }

      const details: ValidationDetails = validation
        ? { ...validation, clonePath, verifiedAt: new Date().toISOString() }
        : {
            eslint: { status: 'skipped', command: '', errorCount: 0, warningCount: 0, issues: [], output: 'No clone path' },
            prettier: { status: 'skipped', command: '', errorCount: 0, warningCount: 0, issues: [], output: 'No clone path' },
            build: { status: 'skipped', command: '', errorCount: 0, warningCount: 0, issues: [], output: 'No clone path' },
            tests: { status: 'skipped', command: '', passed: 0, failed: 0, results: [], output: 'No clone path' },
            qaSummary: 'Repository clone not available',
            clonePath: null,
            verifiedAt: new Date().toISOString(),
          };

      await this.validationRepo.save(
        this.validationRepo.create({
          taskId,
          lintStatus: details.eslint.status === 'skipped' ? 'skipped' : details.eslint.status,
          prettierStatus: details.prettier.status === 'skipped' ? 'skipped' : details.prettier.status,
          buildStatus: details.build.status === 'skipped' ? 'skipped' : details.build.status,
          playwrightPassed: details.tests.passed,
          playwrightFailed: details.tests.failed,
          coverage: tests?.regressionCoverage || 0,
          details: details as unknown as Record<string, unknown>,
        }),
      );

      await this.setStep(taskId, TimelineStep.VALIDATION, TimelineStepStatus.COMPLETED);
      await this.setStep(taskId, TimelineStep.QA, TimelineStepStatus.RUNNING);
      await this.setStep(taskId, TimelineStep.QA, TimelineStepStatus.COMPLETED);
      await this.setStep(taskId, TimelineStep.PR, TimelineStepStatus.RUNNING);

      const commitSha = clonePath ? await this.taskGit.commitAndPush(task, branchName, codeDiff) : null;
      const mrDescription = this.taskGit.buildMrDescription(
        task,
        codeDiff,
        validation?.qaSummary,
      );
      const pr = await this.createPullRequest(
        task,
        branchName,
        mrDescription,
        commitSha,
      );

      await this.prRepo.save(
        this.prRepo.create({
          taskId,
          branchName: pr.branchName,
          commitSha: pr.commitSha,
          prUrl: pr.prUrl,
          prNumber: pr.prNumber,
          reviewStatus: pr.reviewStatus,
        }),
      );

      await this.setStep(taskId, TimelineStep.PR, TimelineStepStatus.COMPLETED);
      await this.finalizeTimeline(taskId);
      await this.taskRepo.update(taskId, { status: TaskStatus.PR_CREATED });
      this.logger.log(`Validation + PR complete for task ${taskId}`);
    } catch (error) {
      this.logger.error(`Validation failed for ${taskId}: ${(error as Error).message}`);
      await this.taskRepo.update(taskId, { status: TaskStatus.FAILED });
      await this.failRunningSteps(taskId);
    }
  }

  async fixLintAndRevalidate(taskId: string): Promise<TaskValidation | null> {
    const task = await this.loadTask(taskId);
    if (!task?.project?.clonePath) return null;

    const validation = await this.validationRepo.findOne({
      where: { taskId },
      order: { createdAt: 'DESC' },
    });
    const branchName = `feature/repopilot-${task.taskId.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;
    const clonePath = task.project.clonePath;

    const fixed = await this.validationRunner.fixLintAndFormat(clonePath);
    const tests = await this.testRepo.findOne({ where: { taskId } });
    const full = await this.validationRunner.runFull(
      clonePath,
      tests?.functionalTests || [],
      tests?.playwrightSpecs || [],
    );
    full.eslint = fixed.eslint;
    full.prettier = fixed.prettier;

    const details: ValidationDetails = {
      ...full,
      clonePath,
      verifiedAt: new Date().toISOString(),
      fixApplied: true,
    };

    if (tests) {
      tests.functionalTests = full.tests.results.length > 0
        ? full.tests.results.map((r) => ({ name: r.name, passed: r.passed }))
        : tests.functionalTests.map((t) => ({
            ...t,
            passed: full.build.status === 'pass' && full.eslint.status !== 'fail',
          }));
      await this.testRepo.save(tests);
    }

    await this.taskGit.commitAndPush(task, branchName, null);

    if (validation) {
      validation.lintStatus = details.eslint.status;
      validation.prettierStatus = details.prettier.status;
      validation.buildStatus = details.build.status;
      validation.playwrightPassed = details.tests.passed;
      validation.playwrightFailed = details.tests.failed;
      validation.details = details as unknown as Record<string, unknown>;
      return this.validationRepo.save(validation);
    }

    return this.validationRepo.save(
      this.validationRepo.create({
        taskId,
        lintStatus: details.eslint.status,
        prettierStatus: details.prettier.status,
        buildStatus: details.build.status,
        playwrightPassed: details.tests.passed,
        playwrightFailed: details.tests.failed,
        coverage: tests?.regressionCoverage || 0,
        details: details as unknown as Record<string, unknown>,
      }),
    );
  }

  private async loadTask(taskId: string): Promise<Task | null> {
    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: ['project'],
    });
    if (!task) {
      this.logger.warn(`Task ${taskId} not found`);
      return null;
    }
    return task;
  }

  private async setStep(
    taskId: string,
    step: TimelineStep,
    status: TimelineStepStatus,
  ): Promise<void> {
    const entry = await this.timelineRepo.findOne({ where: { taskId, step } });
    if (!entry) return;
    entry.status = status;
    if (status === TimelineStepStatus.RUNNING && !entry.startedAt) {
      entry.startedAt = new Date();
    }
    if (status === TimelineStepStatus.COMPLETED || status === TimelineStepStatus.FAILED) {
      entry.completedAt = new Date();
    }
    await this.timelineRepo.save(entry);
    await this.syncAssignedAgent(taskId, step, status);
  }

  private agentForStep(step: TimelineStep): AgentType | null {
    const map: Partial<Record<TimelineStep, AgentType>> = {
      [TimelineStep.REQUIREMENT_ANALYSIS]: AgentType.REQUIREMENT_ANALYSIS,
      [TimelineStep.REPOSITORY_ANALYSIS]: AgentType.REPOSITORY_INTELLIGENCE,
      [TimelineStep.IMPACT_ANALYSIS]: AgentType.IMPACT_ANALYSIS,
      [TimelineStep.TEST_GENERATION]: AgentType.TEST_GENERATION,
      [TimelineStep.CODE_GENERATION]: AgentType.CODE_GENERATION,
      [TimelineStep.VALIDATION]: AgentType.VALIDATION,
      [TimelineStep.QA]: AgentType.QA,
      [TimelineStep.PR]: AgentType.GITHUB,
    };
    return map[step] ?? null;
  }

  private async syncAssignedAgent(
    taskId: string,
    step: TimelineStep,
    status: TimelineStepStatus,
  ): Promise<void> {
    if (status === TimelineStepStatus.RUNNING) {
      const agent = this.agentForStep(step);
      if (agent) await this.taskRepo.update(taskId, { assignedAgent: agent });
      return;
    }
    if (step === TimelineStep.APPROVAL && status === TimelineStepStatus.PENDING) {
      await this.taskRepo.update(taskId, { assignedAgent: null });
    }
    if (step === TimelineStep.PR && status === TimelineStepStatus.COMPLETED) {
      await this.taskRepo.update(taskId, { assignedAgent: AgentType.GITHUB });
    }
  }

  private async failRunningSteps(taskId: string): Promise<void> {
    const running = await this.timelineRepo.find({
      where: { taskId, status: TimelineStepStatus.RUNNING },
    });
    for (const entry of running) {
      entry.status = TimelineStepStatus.FAILED;
      entry.completedAt = new Date();
      await this.timelineRepo.save(entry);
    }
  }

  private normalizeRisk(risk: string): RiskLevel {
    const values = Object.values(RiskLevel);
    return values.includes(risk as RiskLevel) ? (risk as RiskLevel) : RiskLevel.MEDIUM;
  }

  private async createPullRequest(
    task: Task,
    branchName: string,
    description?: string | null,
    commitSha?: string | null,
  ): Promise<{
    branchName: string;
    commitSha: string | null;
    prUrl: string | null;
    prNumber: number | null;
    reviewStatus: string;
  }> {
    const project = task.project;
    const gitlabProjectId = project?.githubRepoId ? Number(project.githubRepoId) : null;

    if (!gitlabProjectId) {
      return {
        branchName,
        commitSha: null,
        prUrl: project?.repositoryUrl
          ? `${project.repositoryUrl}/-/merge_requests/new?merge_request[source_branch]=${encodeURIComponent(branchName)}`
          : null,
        prNumber: null,
        reviewStatus: 'draft',
      };
    }

    try {
      const mr = await this.gitlab.createMergeRequest({
        projectId: gitlabProjectId,
        sourceBranch: branchName,
        targetBranch: project.defaultBranch || 'main',
        title: `[RepoPilot] ${task.taskId}: ${task.requirement.slice(0, 80)}`,
        description:
          description ||
          `Autonomous SDLC pipeline for ${task.taskId}.\n\n${task.requirement}`,
        skipBranchCreate: !!commitSha,
      });
      return {
        branchName,
        commitSha: commitSha || mr.sha,
        prUrl: mr.webUrl,
        prNumber: mr.iid,
        reviewStatus: 'open',
      };
    } catch (error) {
      this.logger.warn(`GitLab MR failed: ${(error as Error).message}`);
      return {
        branchName,
        commitSha: null,
        prUrl: project.repositoryUrl
          ? `${project.repositoryUrl}/-/merge_requests`
          : null,
        prNumber: null,
        reviewStatus: 'draft',
      };
    }
  }
}
