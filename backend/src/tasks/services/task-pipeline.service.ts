import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Task } from '../entities/task.entity';
import { TaskTimeline } from '../entities/task-timeline.entity';
import { TaskAnalysis } from '../entities/task-analysis.entity';
import { TaskTest } from '../entities/task-test.entity';
import { TaskCodeDiff } from '../entities/task-code-diff.entity';
import { TaskValidation } from '../entities/task-validation.entity';
import { TaskPullRequest } from '../entities/task-pull-request.entity';
import { SecurityScan } from '../../security/entities/security-scan.entity';
import { FeedbackService } from '../../feedback/feedback.service';
import { AuditService } from '../../audit/audit.service';
import { SecurityScanService } from '../../security/security-scan.service';
import { SimilarTaskService } from '../../memory/services/similar-task.service';
import { RiskEngineService } from '../../risk/services/risk-engine.service';
import { TaskMemoryService } from '../../memory/services/task-memory.service';
import { RepositoryMemoryService } from '../../memory/services/repository-memory.service';
import {
  AgentType,
  RiskLevel,
  TaskStatus,
  TimelineStep,
  TimelineStepStatus,
} from '../../common/enums/task.enum';
import { LlmService } from './llm.service';
import { RepositorySearchService } from '../../repository/services/repository-search.service';
import { IndexingService } from '../../repository/services/indexing.service';
import { GitLabService } from '../../gitlab/gitlab.service';
import { ProjectStatus } from '../../common/enums/project.enum';
import { TaskGitService } from './task-git.service';
import { CodeContextService } from './code-context.service';
import { ValidationRunnerService } from './validation-runner.service';
import { QaTestService } from './qa-test.service';
import { ValidationDetails } from '../types/validation.types';
import { RepositoryFile } from '../../repository/entities/repository-file.entity';
import { ReplaceIntent } from './code-context.service';
import {
  CODE_EDIT_SYSTEM,
  CODE_PLAN_SYSTEM,
  buildCodeEditUserPrompt,
  buildCodePlanUserPrompt,
} from '../prompts/code-generation.prompts';

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

interface CodePlanResult {
  implementationPlan: string;
  targetFiles: string[];
  verificationChecks?: string[];
}

interface FileEditResult {
  newContent: string;
  changeComments: string[];
  addressesCriteria?: string[];
}

@Injectable()
export class TaskPipelineService {
  private readonly logger = new Logger(TaskPipelineService.name);

  constructor(
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
    @InjectRepository(RepositoryFile) private readonly fileRepo: Repository<RepositoryFile>,
    @InjectRepository(TaskTimeline) private readonly timelineRepo: Repository<TaskTimeline>,
    @InjectRepository(TaskAnalysis) private readonly analysisRepo: Repository<TaskAnalysis>,
    @InjectRepository(TaskTest) private readonly testRepo: Repository<TaskTest>,
    @InjectRepository(TaskCodeDiff) private readonly codeDiffRepo: Repository<TaskCodeDiff>,
    @InjectRepository(TaskValidation) private readonly validationRepo: Repository<TaskValidation>,
    @InjectRepository(TaskPullRequest) private readonly prRepo: Repository<TaskPullRequest>,
    @InjectRepository(SecurityScan) private readonly securityScanRepo: Repository<SecurityScan>,
    private readonly llm: LlmService,
    private readonly search: RepositorySearchService,
    private readonly indexing: IndexingService,
    private readonly gitlab: GitLabService,
    private readonly taskGit: TaskGitService,
    private readonly codeContext: CodeContextService,
    private readonly qaTest: QaTestService,
    private readonly validationRunner: ValidationRunnerService,
    private readonly feedback: FeedbackService,
    private readonly audit: AuditService,
    private readonly securityScan: SecurityScanService,
    private readonly similarTasks: SimilarTaskService,
    private readonly riskEngine: RiskEngineService,
    private readonly taskMemory: TaskMemoryService,
    private readonly repoMemory: RepositoryMemoryService,
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
        `You are a senior product analyst for a production software team.
Return JSON with keys:
- acceptanceCriteria (string — specific, testable, mention exact UI text / file areas when known)
- userStories (string[])
- keywords (string[] — search terms to find code: labels, component names, API paths)
- risk (low|medium|high|critical)
- businessImpact (string)

Make acceptance criteria precise enough that an engineer can verify them in source files.`,
        `Analyze this software requirement:\n\n${task.requirement}`,
        { projectId: task.projectId },
      );

      await this.setStep(taskId, TimelineStep.REQUIREMENT_ANALYSIS, TimelineStepStatus.COMPLETED);
      await this.setStep(taskId, TimelineStep.REPOSITORY_ANALYSIS, TimelineStepStatus.RUNNING);

      const similar = await this.similarTasks.findSimilarForTask(taskId, 3);
      const memoryContext = task.project?.status === ProjectStatus.COMPLETED
        ? await this.repoMemory.retrieveContext(task.projectId, task.requirement, 5)
        : null;

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

      const similarContext = similar.length
        ? `\n\nSimilar past tasks:\n${similar.map((s) => `- ${s.taskDisplayId || s.taskId}: ${s.requirement.slice(0, 80)} (outcome: ${s.outcome}, similarity: ${s.similarity}%)`).join('\n')}`
        : '';
      const memorySnippet = memoryContext?.semanticMatches?.length
        ? `\n\nRepository memory matches:\n${memoryContext.semanticMatches.slice(0, 5).map((m) => `- ${m.filePath} (score ${m.score.toFixed(2)})`).join('\n')}`
        : '';

      const impact = await this.llm.jsonCompletion<ImpactAnalysisResult>(
        'You are a software architect. Return JSON: regressionAreas (string[]), apiDependencies (string[]).',
        `Requirement: ${task.requirement}\n\nPotentially impacted files:\n${fileList || 'No indexed files — infer from requirement.'}${similarContext}${memorySnippet}`,
        { projectId: task.projectId },
      );

      await this.setStep(taskId, TimelineStep.IMPACT_ANALYSIS, TimelineStepStatus.COMPLETED);

      await this.taskRepo.update(taskId, {
        acceptanceCriteria: requirement.acceptanceCriteria,
        userStories: requirement.userStories,
        keywords: [...new Set([...requirement.keywords, ...repoIntel.keywords])],
        businessImpact: requirement.businessImpact,
        risk: this.normalizeRisk(requirement.risk),
      });

      await this.setStep(taskId, TimelineStep.TEST_GENERATION, TimelineStepStatus.RUNNING);
      await this.taskRepo.update(taskId, { status: TaskStatus.GENERATING_TESTS });

      const impactedFiles = repoIntel.relevantFiles.map((f) => ({
        path: f.file,
        confidence: f.confidence,
      }));

      const feedbackContext = await this.feedback.contextForTask(taskId);
      const qaResult = await this.qaTest.generateBeforeCodeGen(
        { ...task, acceptanceCriteria: requirement.acceptanceCriteria },
        requirement.acceptanceCriteria,
        impactedFiles.map((f) => f.path),
        feedbackContext,
      );

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
          functionalTests: this.qaTest.toFunctionalTests(qaResult.qaTestCases || []),
          edgeCases: qaResult.edgeCases || [],
          regressionCases: qaResult.regressionCases || [],
          playwrightSpecs: qaResult.playwrightSpecs || [],
          regressionCoverage: qaResult.regressionCoverage || 0,
          qaTestCases: (qaResult.qaTestCases || []).map((tc) => ({
            ...tc,
            status: tc.status || 'pending',
          })),
          qaSummary: qaResult.qaSummary,
          qaGeneratedAt: new Date(),
        }),
      );

      const taskFields = {
        acceptanceCriteria: requirement.acceptanceCriteria,
        userStories: requirement.userStories,
        keywords: [...new Set([...requirement.keywords, ...repoIntel.keywords])],
        businessImpact: requirement.businessImpact,
        risk: this.normalizeRisk(requirement.risk),
      };

      await this.setStep(taskId, TimelineStep.TEST_GENERATION, TimelineStepStatus.COMPLETED);

      await this.riskEngine.assessTask(taskId);

      await this.taskRepo.update(taskId, {
        ...taskFields,
        status: TaskStatus.ANALYSIS_APPROVAL_REQUIRED,
      });
      await this.setStep(taskId, TimelineStep.APPROVAL, TimelineStepStatus.PENDING);

      await this.audit.log('task', taskId, 'similar_tasks_found', {
        count: similar.length,
        tasks: similar.map((s) => s.taskId),
      });
      await this.audit.log('task', taskId, 'analysis_completed', {
        testCases: qaResult.qaTestCases?.length || 0,
      });
      this.logger.log(`Analysis + QA test cases complete for task ${taskId}`);
    } catch (error) {
      const message = (error as Error).message || 'Analysis failed';
      this.logger.error(`Analysis failed for ${taskId}: ${message}`);
      await this.taskRepo.update(taskId, { status: TaskStatus.FAILED });
      await this.failRunningSteps(taskId, message);
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
      const testRecord = await this.testRepo.findOne({ where: { taskId } });
      const impactedPaths = (analysis?.impactedFiles || []).map((f) => f.path);
      let clonePath = task.project?.clonePath;
      if ((!clonePath || !fs.existsSync(clonePath)) && task.project) {
        clonePath = await this.indexing.ensureProjectCloned(task.project.id);
        if (clonePath) task.project.clonePath = clonePath;
      }
      const testCasesContext = this.formatTestCasesForPrompt(testRecord);
      const feedbackContext = await this.feedback.contextForTask(taskId);
      const replaceIntent = this.codeContext.parseReplaceIntent(task.requirement);

      if (!clonePath) {
        throw new Error('Repository not cloned — re-index the project before code generation');
      }

      const indexedHints = task.project
        ? await this.findIndexedFileHints(task.project.id, task.requirement, replaceIntent)
        : [];
      const allHints = [...new Set([...indexedHints, ...impactedPaths])];

      const discoveredFiles = this.codeContext.discoverFilesForRequirement(
        clonePath,
        task.requirement,
        allHints,
        replaceIntent,
      );

      if (task.project?.status === ProjectStatus.COMPLETED) {
        try {
          const intel = await this.search.analyzeRequirement({
            projectId: task.projectId,
            requirement: task.requirement,
            taskId: task.id,
          });
          for (const f of intel.relevantFiles.slice(0, 15)) {
            if (!discoveredFiles.includes(f.file)) discoveredFiles.push(f.file);
          }
        } catch {
          // semantic search optional
        }
      }

      const candidateFiles = this.resolveExistingTargetFiles(
        clonePath,
        discoveredFiles,
        allHints,
      );

      let fileEdits: {
        path: string;
        originalContent: string;
        newContent: string;
        changeComments: string[];
      }[] = [];
      let implementationPlan = '';

      if (replaceIntent) {
        const accurate = this.codeContext.generateAccurateEdits(
          clonePath,
          task.requirement,
          candidateFiles,
        );
        implementationPlan = accurate.plan;
        fileEdits = accurate.edits;

        if (!accurate.verified) {
          throw new Error(
            accurate.verificationErrors.join(' · ') ||
              `Could not apply change "${replaceIntent.from}" → "${replaceIntent.to}"`,
          );
        }
      } else {
        const plan = await this.llm.jsonCompletion<CodePlanResult>(
          CODE_PLAN_SYSTEM,
          buildCodePlanUserPrompt({
            taskId: task.taskId,
            requirement: task.requirement,
            acceptanceCriteria: task.acceptanceCriteria || 'N/A',
            userStories: task.userStories || [],
            testCases: testCasesContext,
            candidateFiles: candidateFiles.slice(0, 30).join('\n') || 'Infer from requirement',
            impactedFiles: impactedPaths.join('\n') || 'None',
            indexedHints: indexedHints.join('\n') || 'None',
            feedback: feedbackContext || undefined,
          }),
          { maxTokens: 2048, projectId: task.projectId },
        );
        implementationPlan = [
          plan.implementationPlan,
          plan.verificationChecks?.length
            ? `\nVerification:\n${plan.verificationChecks.map((c, i) => `${i + 1}. ${c}`).join('\n')}`
            : '',
        ]
          .filter(Boolean)
          .join('\n');

        const targetFiles = this.resolveExistingTargetFiles(
          clonePath,
          plan.targetFiles?.length ? plan.targetFiles : candidateFiles,
          allHints,
        ).slice(0, 10);

        if (!targetFiles.length) {
          throw new Error('No valid target files found in repository for this requirement');
        }

        const verificationChecks = (plan.verificationChecks || []).join('\n');
        const rawEdits: { path: string; newContent: string; changeComments: string[] }[] = [];

        for (const filePath of targetFiles) {
          const currentContent = this.codeContext.readFullFileForEdit(clonePath, filePath);
          if (!currentContent) continue;

          const relatedContext = this.codeContext.buildRelatedFileContext(
            clonePath,
            candidateFiles,
            filePath,
          );

          try {
            const edit = await this.llm.jsonCompletion<FileEditResult>(
              CODE_EDIT_SYSTEM,
              buildCodeEditUserPrompt({
                taskId: task.taskId,
                requirement: task.requirement,
                acceptanceCriteria: task.acceptanceCriteria || 'N/A',
                implementationPlan: plan.implementationPlan,
                verificationChecks,
                filePath,
                fileContent: currentContent,
                relatedContext,
                feedback: feedbackContext || undefined,
              }),
              { maxTokens: 16384, projectId: task.projectId },
            );

            let newContent = edit.newContent?.trim() || '';

            if (newContent && newContent !== currentContent) {
              rawEdits.push({
                path: filePath,
                newContent,
                changeComments: edit.changeComments?.length
                  ? edit.changeComments
                  : edit.addressesCriteria?.length
                    ? edit.addressesCriteria
                    : ['Updated per requirement'],
              });
            }
          } catch (fileError) {
            this.logger.warn(`Code edit failed for ${filePath}: ${(fileError as Error).message}`);
          }
        }

        if (!rawEdits.length) {
          throw new Error('No file edits generated — requirement may need a clearer format or more specific acceptance criteria');
        }

        fileEdits = this.codeContext.enrichFileEdits(clonePath, rawEdits);
      }

      fileEdits = this.codeContext.filterMeaningfulEdits(fileEdits);
      const verification = this.codeContext.verifyEditsAgainstRequirement(
        fileEdits,
        task.requirement,
        replaceIntent,
        task.acceptanceCriteria || undefined,
      );
      if (!verification.ok) {
        throw new Error(`Verification failed: ${verification.errors.join(' · ')}`);
      }

      if (fileEdits.length === 0) {
        throw new Error('No actual code changes produced after verification');
      }

      const applyResult = this.codeContext.applyEditsToClone(clonePath, fileEdits);
      if (applyResult.errors.length > 0) {
        throw new Error(`Failed to write changes to repository: ${applyResult.errors.join(' · ')}`);
      }
      this.logger.log(
        `Applied ${applyResult.applied.length} file edit(s) to clone for task ${taskId}`,
      );

      if (replaceIntent) {
        const remaining = this.codeContext.scanRepoForUnresolvedText(
          clonePath,
          replaceIntent.from,
          replaceIntent.to,
          fileEdits,
        );
        if (remaining.length > 0) {
          throw new Error(
            `Changes written but requirement incomplete — still found "${replaceIntent.from}" in: ${remaining.slice(0, 5).join(', ')}`,
          );
        }
      }
      let diff = '';
      let patchContent = '';
      if (clonePath && fileEdits.length > 0) {
        const generated = this.codeContext.buildUnifiedDiff(clonePath, fileEdits);
        if (generated) {
          diff = generated;
          patchContent = generated;
        }
      }

      const savedDiff = await this.codeDiffRepo.save(
        this.codeDiffRepo.create({
          taskId,
          implementationPlan,
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

      await this.setStep(taskId, TimelineStep.TEST_GENERATION, TimelineStepStatus.RUNNING);
      try {
        const detailedQa = await this.qaTest.generateAfterCodeGen(
          task,
          savedDiff,
          task.acceptanceCriteria,
        );
        const existingTest = testRecord || (await this.testRepo.findOne({ where: { taskId } }));
        const testPayload = {
          taskId,
          functionalTests: this.qaTest.toFunctionalTests(detailedQa.qaTestCases),
          edgeCases: detailedQa.edgeCases,
          regressionCases: detailedQa.regressionCases,
          playwrightSpecs: detailedQa.playwrightSpecs,
          regressionCoverage: detailedQa.regressionCoverage,
          qaTestCases: detailedQa.qaTestCases.map((tc) => ({
            ...tc,
            status: tc.status || 'pending',
          })),
          qaSummary: `${detailedQa.qaSummary} · ${detailedQa.qaTestCases.length} detailed cases with Playwright automation`,
          qaGeneratedAt: new Date(),
        };

        if (existingTest) {
          Object.assign(existingTest, testPayload);
          await this.testRepo.save(existingTest);
        } else {
          await this.testRepo.save(this.testRepo.create(testPayload));
        }

        await this.audit.log('task', taskId, 'qa_test_cases_regenerated', {
          count: detailedQa.qaTestCases.length,
          playwrightSpecs: detailedQa.playwrightSpecs.length,
        });
        this.logger.log(
          `Post-code QA: ${detailedQa.qaTestCases.length} cases, ${detailedQa.playwrightSpecs.length} Playwright specs for ${taskId}`,
        );
      } catch (qaError) {
        this.logger.warn(
          `Post-code QA generation failed for ${taskId}: ${(qaError as Error).message}`,
        );
      }
      await this.setStep(taskId, TimelineStep.TEST_GENERATION, TimelineStepStatus.COMPLETED);

      await this.setStep(taskId, TimelineStep.CODE_GENERATION, TimelineStepStatus.COMPLETED);

      await this.taskRepo.update(taskId, { status: TaskStatus.CODE_APPROVAL_REQUIRED });
      await this.setStep(taskId, TimelineStep.APPROVAL, TimelineStepStatus.PENDING);

      await this.audit.log('task', taskId, 'code_generation_completed', {
        files: fileEdits.map((e) => e.path),
      });
      this.logger.log(`Code generation complete for task ${taskId}`);
    } catch (error) {
      const message = (error as Error).message || 'Code generation failed';
      this.logger.error(`Code generation failed for ${taskId}: ${message}`);
      await this.taskRepo.update(taskId, { status: TaskStatus.FAILED });
      await this.failRunningSteps(taskId, message);
    }
  }

  async runValidation(taskId: string): Promise<void> {
    const task = await this.loadTask(taskId);
    if (!task) return;

    try {
      await this.taskRepo.update(taskId, { status: TaskStatus.VALIDATING });
      await this.setStep(taskId, TimelineStep.VALIDATION, TimelineStepStatus.RUNNING);

      const codeDiff = await this.codeDiffRepo.findOne({ where: { taskId } });
      const tests = await this.testRepo.findOne({ where: { taskId } });
      const branchName = `feature/repopilot-${task.taskId.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;

      const clonePath = await this.taskGit.prepareWorkspace(task, branchName, codeDiff);

      if (clonePath && codeDiff) {
        const hasChanges = await this.taskGit.hasWorkingTreeChanges(clonePath, branchName);
        if (!hasChanges) {
          throw new Error(
            'No actual file changes applied to repository — MR would be empty. Re-run code generation.',
          );
        }
      }

      const changedFiles = this.extractChangedFiles(codeDiff);

      await this.taskRepo.update(taskId, { status: TaskStatus.PLAYWRIGHT_EXECUTION });
      const validation = clonePath
        ? await this.validationRunner.runFull(
            clonePath,
            tests?.qaTestCases
              ? this.qaTest.toFunctionalTests(this.qaTest.fromEntity(tests.qaTestCases))
              : tests?.functionalTests || [],
            tests?.playwrightSpecs || [],
            changedFiles,
          )
        : null;

      await this.setStep(taskId, TimelineStep.VALIDATION, TimelineStepStatus.COMPLETED);
      await this.taskRepo.update(taskId, { status: TaskStatus.QA_VERIFICATION });
      await this.setStep(taskId, TimelineStep.QA, TimelineStepStatus.RUNNING);

      let qaSummary = validation?.qaSummary || 'No validation';
      if (tests?.qaTestCases?.length && validation) {
        const verified = this.qaTest.verifyTestCases(
          this.qaTest.fromEntity(tests.qaTestCases),
          validation,
        );
        tests.qaTestCases = verified.cases;
        tests.qaSummary = verified.summary;
        tests.qaVerifiedAt = new Date();
        tests.functionalTests = this.qaTest.toFunctionalTests(verified.cases);
        tests.regressionCoverage = verified.cases.length
          ? Math.round((verified.cases.filter((c) => c.status === 'pass').length / verified.cases.length) * 100)
          : tests.regressionCoverage;
        await this.testRepo.save(tests);
        qaSummary = verified.summary;
      } else if (tests && validation) {
        tests.functionalTests = validation.tests.results.length > 0
          ? validation.tests.results.map((r) => ({ name: r.name, passed: r.passed }))
          : tests.functionalTests.map((t) => ({
              ...t,
              passed: validation.build.status === 'pass' && validation.eslint.status !== 'fail',
            }));
        tests.qaVerifiedAt = new Date();
        tests.qaSummary = validation.qaSummary;
        await this.testRepo.save(tests);
      }

      const details: ValidationDetails = validation
        ? { ...validation, qaSummary, clonePath, verifiedAt: new Date().toISOString() }
        : {
            eslint: { status: 'skipped', command: '', errorCount: 0, warningCount: 0, issues: [], output: 'No clone path' },
            prettier: { status: 'skipped', command: '', errorCount: 0, warningCount: 0, issues: [], output: 'No clone path' },
            build: { status: 'skipped', command: '', errorCount: 0, warningCount: 0, issues: [], output: 'No clone path' },
            tests: { status: 'skipped', command: '', passed: 0, failed: 0, results: [], output: 'No clone path' },
            qaSummary,
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

      if (details.eslint.status === 'fail') {
        throw new Error('Lint validation failed');
      }

      await this.completePrAfterValidation(
        taskId,
        task,
        clonePath,
        branchName,
        codeDiff,
        qaSummary,
      );
      this.logger.log(`Validation + PR complete for task ${taskId}`);
    } catch (error) {
      const message = (error as Error).message;
      this.logger.error(`Validation failed for ${taskId}: ${message}`);
      await this.taskRepo.update(taskId, { status: TaskStatus.FAILED });
      await this.taskMemory.indexTask(taskId, 'failed').catch(() => undefined);
      await this.failRunningSteps(taskId, message);
    }
  }

  /** Resume PR creation after validation passes (e.g. after Auto-fix). Code must already be approved. */
  async retryPrCreation(taskId: string): Promise<void> {
    const task = await this.loadTask(taskId);
    if (!task) throw new Error('Task not found');

    const existingPr = await this.prRepo.findOne({ where: { taskId } });
    if (existingPr?.prUrl) {
      throw new Error('Pull request already exists for this task');
    }

    const validation = await this.validationRepo.findOne({
      where: { taskId },
      order: { createdAt: 'DESC' },
    });
    if (!validation) {
      throw new Error('No validation record — approve code changes first');
    }

    const details = validation.details as unknown as ValidationDetails | undefined;
    const lintStatus = validation.lintStatus || details?.eslint?.status;
    if (lintStatus === 'fail') {
      throw new Error('ESLint still failing — use Auto-fix ESLint & Prettier on the Validation tab');
    }

    const codeDiff = await this.codeDiffRepo.findOne({ where: { taskId } });
    if (!codeDiff) {
      throw new Error('No code changes to publish');
    }

    const branchName = `feature/repopilot-${task.taskId.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;
    const clonePath =
      details?.clonePath ||
      (await this.taskGit.prepareWorkspace(task, branchName, codeDiff));
    if (!clonePath) {
      throw new Error('Repository clone not available — re-index the project');
    }

    const qaSummary = details?.qaSummary || 'Validation passed — creating merge request';

    try {
      await this.completePrAfterValidation(
        taskId,
        task,
        clonePath,
        branchName,
        codeDiff,
        qaSummary,
      );
      this.logger.log(`PR retry complete for task ${taskId}`);
    } catch (error) {
      const message = (error as Error).message;
      this.logger.error(`PR retry failed for ${taskId}: ${message}`);
      await this.taskRepo.update(taskId, { status: TaskStatus.FAILED });
      await this.failRunningSteps(taskId, message);
      throw error;
    }
  }

  private async completePrAfterValidation(
    taskId: string,
    task: Task,
    clonePath: string | null,
    branchName: string,
    codeDiff: TaskCodeDiff | null,
    qaSummary: string,
  ): Promise<void> {
    await this.setStep(taskId, TimelineStep.QA, TimelineStepStatus.COMPLETED);
    await this.taskRepo.update(taskId, { status: TaskStatus.SECURITY_SCAN });

    if (clonePath) {
      const scanResult = await this.securityScan.scanRepository(clonePath);
      await this.securityScanRepo.save(
        this.securityScanRepo.create({
          taskId,
          status: scanResult.status,
          secretsFound: scanResult.secretsFound,
          vulnerabilities: scanResult.vulnerabilities,
          unsafePatterns: scanResult.unsafePatterns,
          blockedPr: scanResult.blockedPr,
          summary: scanResult.summary,
        }),
      );
      await this.audit.log('task', taskId, 'security_scan_completed', {
        status: scanResult.status,
        blocked: scanResult.blockedPr,
        summary: scanResult.summary,
      });
      if (scanResult.blockedPr) {
        throw new Error(`Security scan blocked PR creation: ${scanResult.summary}`);
      }
    }

    await this.taskRepo.update(taskId, { status: TaskStatus.CREATING_PR });
    await this.setStep(taskId, TimelineStep.PR, TimelineStepStatus.RUNNING);

    const commitSha = clonePath ? await this.taskGit.commitAndPush(task, branchName, codeDiff) : null;
    if (clonePath && !commitSha) {
      throw new Error('Git commit failed — no changes pushed to branch. Check code diff matches repository files.');
    }
    const mrDescription = this.taskGit.buildMrDescription(task, codeDiff, qaSummary);
    const pr = await this.createPullRequest(task, branchName, mrDescription, commitSha);

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
    await this.taskMemory.indexTask(taskId, 'success');
    await this.audit.log('task', taskId, 'pr_created', {
      prUrl: pr.prUrl,
      prNumber: pr.prNumber,
    });
  }

  async fixLintAndRevalidate(taskId: string): Promise<TaskValidation | null> {
    const task = await this.loadTask(taskId);
    if (!task?.project?.clonePath) {
      throw new Error('Repository clone not available — re-index the project first');
    }

    try {
      const validation = await this.validationRepo.findOne({
        where: { taskId },
        order: { createdAt: 'DESC' },
      });
      const branchName = `feature/repopilot-${task.taskId.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;
      const clonePath = task.project.clonePath;
      const tests = await this.testRepo.findOne({ where: { taskId } });

      let playwrightSpecs = tests?.playwrightSpecs || [];
      if (tests?.qaTestCases?.length) {
        const cases = this.qaTest.fromEntity(tests.qaTestCases);
        playwrightSpecs = this.qaTest.ensurePlaywrightCoverage({
          qaTestCases: cases,
          edgeCases: tests.edgeCases || [],
          regressionCases: tests.regressionCases || [],
          playwrightSpecs: [],
          regressionCoverage: tests.regressionCoverage || 0,
          qaSummary: tests.qaSummary || '',
        }).playwrightSpecs;
        tests.playwrightSpecs = playwrightSpecs;
        await this.testRepo.save(tests);
      }

      const codeDiff = await this.codeDiffRepo.findOne({ where: { taskId } });
      const changedFiles = this.extractChangedFiles(codeDiff);

      const fixed = await this.validationRunner.fixLintAndFormat(clonePath, changedFiles);
      const full = await this.validationRunner.runFull(
        clonePath,
        tests?.qaTestCases
          ? this.qaTest.toFunctionalTests(this.qaTest.fromEntity(tests.qaTestCases))
          : tests?.functionalTests || [],
        playwrightSpecs,
        changedFiles,
      );
      full.eslint = fixed.eslint;
      full.prettier = fixed.prettier;

      let qaSummary = full.qaSummary;
      if (tests?.qaTestCases?.length) {
        const verified = this.qaTest.verifyTestCases(
          this.qaTest.fromEntity(tests.qaTestCases),
          full,
        );
        tests.qaTestCases = verified.cases;
        tests.qaSummary = verified.summary;
        tests.qaVerifiedAt = new Date();
        tests.functionalTests = this.qaTest.toFunctionalTests(verified.cases);
        qaSummary = verified.summary;
        await this.testRepo.save(tests);
      } else if (tests) {
        tests.functionalTests = full.tests.results.length > 0
          ? full.tests.results.map((r) => ({ name: r.name, passed: r.passed }))
          : tests.functionalTests.map((t) => ({
              ...t,
              passed: full.build.status === 'pass' && full.eslint.status !== 'fail',
            }));
        tests.qaVerifiedAt = new Date();
        tests.qaSummary = full.qaSummary;
        await this.testRepo.save(tests);
      }

      const details: ValidationDetails = {
        ...full,
        qaSummary,
        clonePath,
        verifiedAt: new Date().toISOString(),
        fixApplied: true,
      };

      await this.taskGit.commitAndPush(task, branchName, null);

      if (validation) {
        validation.lintStatus = details.eslint.status;
        validation.prettierStatus = details.prettier.status;
        validation.buildStatus = details.build.status;
        validation.playwrightPassed = details.tests.passed;
        validation.playwrightFailed = details.tests.failed;
        validation.details = details as unknown as Record<string, unknown>;
        await this.validationRepo.save(validation);
      } else {
        await this.validationRepo.save(
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

      if (details.eslint.status !== 'fail') {
        const existingPr = await this.prRepo.findOne({ where: { taskId } });
        if (!existingPr?.prUrl) {
          await this.retryPrCreation(taskId);
        }
      }

      return this.validationRepo.findOne({
        where: { taskId },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      const message = (error as Error).message || 'Fix lint failed';
      this.logger.error(`fixLintAndRevalidate failed for ${taskId}: ${message}`);
      throw error;
    }
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
    if (status === TimelineStepStatus.COMPLETED) {
      entry.message = null;
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

  private async failRunningSteps(taskId: string, message?: string): Promise<void> {
    const running = await this.timelineRepo.find({
      where: { taskId, status: TimelineStepStatus.RUNNING },
    });
    for (const entry of running) {
      entry.status = TimelineStepStatus.FAILED;
      entry.completedAt = new Date();
      if (message) entry.message = message.slice(0, 500);
      await this.timelineRepo.save(entry);
    }
  }

  private extractChangedFiles(codeDiff: TaskCodeDiff | null): string[] {
    if (!codeDiff) return [];
    const fromEdits = (codeDiff.fileEdits || []).map((e) => e.path);
    const fromModify = (codeDiff.filesToModify || []).map((f) => f.path);
    return [...new Set([...fromEdits, ...fromModify])];
  }

  private formatTestCasesForPrompt(testRecord: TaskTest | null): string {
    if (!testRecord?.qaTestCases?.length) return 'No approved test cases on record.';
    return testRecord.qaTestCases
      .map(
        (tc) =>
          `${tc.id}: ${tc.title} [${tc.category}/${tc.priority}]\nSteps: ${tc.steps?.join(' → ') || 'N/A'}\nExpected: ${tc.expectedResult}`,
      )
      .join('\n\n');
  }

  private normalizeRisk(risk: string): RiskLevel {
    const values = Object.values(RiskLevel);
    return values.includes(risk as RiskLevel) ? (risk as RiskLevel) : RiskLevel.MEDIUM;
  }

  private async findIndexedFileHints(
    projectId: string,
    requirement: string,
    intent: ReplaceIntent | null,
  ): Promise<string[]> {
    const terms = this.codeContext.extractSearchTerms(requirement, intent);
    if (!terms.length) return [];

    const paths = new Set<string>();
    for (const term of terms.slice(0, 4)) {
      const rows = await this.fileRepo
        .createQueryBuilder('f')
        .select(['f.filePath'])
        .where('f.project_id = :projectId', { projectId })
        .andWhere(
          `(f.file_path ILIKE :term OR f.keywords::text ILIKE :term OR f.components::text ILIKE :term OR f.functions::text ILIKE :term)`,
          { term: `%${term}%` },
        )
        .limit(15)
        .getMany();
      for (const row of rows) paths.add(row.filePath);
    }
    return [...paths];
  }

  private resolveExistingTargetFiles(
    clonePath: string,
    candidates: string[],
    hints: string[],
  ): string[] {
    const resolved: string[] = [];
    const tryPath = (p: string) => {
      const normalized = p.replace(/^\.\//, '');
      const full = path.join(clonePath, normalized);
      if (fs.existsSync(full) && fs.statSync(full).isFile() && !resolved.includes(normalized)) {
        resolved.push(normalized);
      }
    };
    for (const p of candidates) tryPath(p);
    for (const p of hints) tryPath(p);
    return resolved;
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
