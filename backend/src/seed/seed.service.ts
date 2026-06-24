import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../projects/entities/project.entity';
import { Task } from '../tasks/entities/task.entity';
import { TaskTimeline } from '../tasks/entities/task-timeline.entity';
import { TaskAnalysis } from '../tasks/entities/task-analysis.entity';
import { TaskTest } from '../tasks/entities/task-test.entity';
import { TaskCodeDiff } from '../tasks/entities/task-code-diff.entity';
import { TaskValidation } from '../tasks/entities/task-validation.entity';
import { TaskPullRequest } from '../tasks/entities/task-pull-request.entity';
import { ProjectStatus, Framework, Language } from '../common/enums/project.enum';
import {
  TaskStatus,
  RiskLevel,
  AgentType,
  TimelineStep,
  TimelineStepStatus,
} from '../common/enums/task.enum';

@Injectable()
export class SeedService {
  constructor(
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
    @InjectRepository(TaskTimeline) private readonly timelineRepo: Repository<TaskTimeline>,
    @InjectRepository(TaskAnalysis) private readonly analysisRepo: Repository<TaskAnalysis>,
    @InjectRepository(TaskTest) private readonly testRepo: Repository<TaskTest>,
    @InjectRepository(TaskCodeDiff) private readonly codeDiffRepo: Repository<TaskCodeDiff>,
    @InjectRepository(TaskValidation) private readonly validationRepo: Repository<TaskValidation>,
    @InjectRepository(TaskPullRequest) private readonly prRepo: Repository<TaskPullRequest>,
  ) {}

  async seedDemoData() {
    let project = await this.projectRepo.findOne({ where: { name: 'BannerBuzz' } });
    if (!project) {
      project = await this.projectRepo.save(
        this.projectRepo.create({
          name: 'BannerBuzz',
          organizationId: null,
          repositoryUrl: 'https://gitlab.com/company/bannerbuzz-nextjs',
          defaultBranch: 'dev',
          framework: Framework.NEXTJS,
          language: Language.JAVASCRIPT,
          description: 'BannerBuzz e-commerce platform built with Next.js',
          status: ProjectStatus.COMPLETED,
          filesIndexed: 1247,
          lastScanAt: new Date(),
        }),
      );
    }

    const demoTasks = [
      {
        taskId: 'BB-14342',
        requirement: 'Upload artwork preview issue',
        status: TaskStatus.TESTING,
        risk: RiskLevel.MEDIUM,
        agent: AgentType.VALIDATION,
        acceptanceCriteria:
          'Preview should update after image removal.\nUnsaved artwork should not trigger saveDesign.',
        userStories: [
          'As a user, I want the preview to update when I remove an image',
          'As a user, I want unsaved artwork to not auto-save',
        ],
        keywords: ['upload', 'preview', 'artwork', 'saveDesign'],
        businessImpact: 'High — affects core upload flow used by 80% of customers',
        timeline: {
          [TimelineStep.REQUIREMENT_ANALYSIS]: TimelineStepStatus.COMPLETED,
          [TimelineStep.REPOSITORY_ANALYSIS]: TimelineStepStatus.COMPLETED,
          [TimelineStep.IMPACT_ANALYSIS]: TimelineStepStatus.COMPLETED,
          [TimelineStep.TEST_GENERATION]: TimelineStepStatus.COMPLETED,
          [TimelineStep.APPROVAL]: TimelineStepStatus.COMPLETED,
          [TimelineStep.CODE_GENERATION]: TimelineStepStatus.COMPLETED,
          [TimelineStep.VALIDATION]: TimelineStepStatus.RUNNING,
          [TimelineStep.QA]: TimelineStepStatus.PENDING,
          [TimelineStep.PR]: TimelineStepStatus.PENDING,
        },
        withFullData: true,
      },
      {
        taskId: 'BB-14343',
        requirement: 'Canvas synchronization issue',
        status: TaskStatus.ANALYZING,
        risk: RiskLevel.HIGH,
        agent: AgentType.REPOSITORY_INTELLIGENCE,
        acceptanceCriteria: null,
        userStories: null,
        keywords: null,
        businessImpact: null,
        timeline: {
          [TimelineStep.REQUIREMENT_ANALYSIS]: TimelineStepStatus.COMPLETED,
          [TimelineStep.REPOSITORY_ANALYSIS]: TimelineStepStatus.RUNNING,
        },
        withFullData: false,
      },
      {
        taskId: 'BB-14219',
        requirement: 'Save design regression in cart edit',
        status: TaskStatus.PENDING,
        risk: RiskLevel.LOW,
        agent: null,
        acceptanceCriteria: null,
        userStories: null,
        keywords: null,
        businessImpact: null,
        timeline: {},
        withFullData: false,
      },
    ];

    for (const demo of demoTasks) {
      const existing = await this.taskRepo.findOne({ where: { taskId: demo.taskId } });
      if (existing) continue;

      const task = await this.taskRepo.save(
        this.taskRepo.create({
          taskId: demo.taskId,
          projectId: project.id,
          requirement: demo.requirement,
          status: demo.status,
          risk: demo.risk,
          assignedAgent: demo.agent,
          acceptanceCriteria: demo.acceptanceCriteria,
          userStories: demo.userStories,
          keywords: demo.keywords,
          businessImpact: demo.businessImpact,
        }),
      );

      const steps = Object.values(TimelineStep);
      for (const step of steps) {
        const status = demo.timeline[step] || TimelineStepStatus.PENDING;
        await this.timelineRepo.save(
          this.timelineRepo.create({
            taskId: task.id,
            step,
            status,
            startedAt: status !== TimelineStepStatus.PENDING ? new Date() : null,
            completedAt: status === TimelineStepStatus.COMPLETED ? new Date() : null,
          }),
        );
      }

      if (demo.withFullData) {
        await this.analysisRepo.save(
          this.analysisRepo.create({
            taskId: task.id,
            impactedFiles: [
              { path: 'UploadV2.js', confidence: 95 },
              { path: 'UploadArtworkDesignTool.js', confidence: 88 },
              { path: 'PdpFabricContext.js', confidence: 92 },
              { path: 'ProductOptions.js', confidence: 76 },
            ],
            regressionAreas: ['Preview', 'Save Design', 'Cart Edit', 'DTPDP'],
            apiDependencies: ['/api/upload', '/api/design/save', '/api/cart/edit'],
          }),
        );

        await this.testRepo.save(
          this.testRepo.create({
            taskId: task.id,
            functionalTests: [
              { name: 'Upload Artwork', passed: true },
              { name: 'Remove Image', passed: true },
              { name: 'Save Design', passed: true },
              { name: 'Cart Edit', passed: true },
            ],
            edgeCases: ['Empty canvas upload', 'Multiple image removal', 'Network timeout during save'],
            regressionCases: ['Preview update on remove', 'No auto-save on unsaved artwork'],
            playwrightSpecs: [
              { filename: 'remove-image.spec.ts', content: '' },
              { filename: 'preview-sync.spec.ts', content: '' },
              { filename: 'save-design.spec.ts', content: '' },
            ],
            regressionCoverage: 87,
          }),
        );

        await this.codeDiffRepo.save(
          this.codeDiffRepo.create({
            taskId: task.id,
            implementationPlan:
              '1. Update updatePreviewState() in UploadV2.js\n2. Add syncRemovedArtwork() handler\n3. Guard saveDesign() against unsaved state in PdpFabricContext.js',
            filesToModify: [
              {
                path: 'UploadV2.js',
                changes: ['updatePreviewState()', 'syncRemovedArtwork()'],
              },
              {
                path: 'PdpFabricContext.js',
                changes: ['guard saveDesign() against unsaved artwork'],
              },
            ],
            diff: `--- a/UploadV2.js\n+++ b/UploadV2.js\n@@ -42,6 +42,14 @@\n+  updatePreviewState() {\n+    this.setState({ preview: this.getCurrentPreview() });\n+  }\n+\n+  syncRemovedArtwork(artworkId) {\n+    this.removeFromCanvas(artworkId);\n+    this.updatePreviewState();\n+  }`,
            approvalStatus: 'approved',
          }),
        );

        await this.validationRepo.save(
          this.validationRepo.create({
            taskId: task.id,
            lintStatus: 'pass',
            buildStatus: 'pass',
            playwrightPassed: 12,
            playwrightFailed: 0,
            coverage: 87,
          }),
        );
      }
    }

    return { message: 'Demo data seeded', projectId: project.id };
  }
}
