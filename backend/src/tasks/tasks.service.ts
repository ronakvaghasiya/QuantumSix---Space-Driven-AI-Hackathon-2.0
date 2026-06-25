import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { TaskTimeline } from './entities/task-timeline.entity';
import { CreateTaskDto, UploadTasksDto, ApprovalDto, RevertCodeDto } from './dto/task.dto';
import { TaskStatus, TimelineStep, TimelineStepStatus, RiskLevel } from '../common/enums/task.enum';
import { N8nService } from '../webhooks/n8n.service';
import { TaskPipelineService } from './services/task-pipeline.service';
import { TaskPullRequest } from './entities/task-pull-request.entity';
import { TaskAnalysis } from './entities/task-analysis.entity';
import { TaskTest } from './entities/task-test.entity';
import { TaskCodeDiff } from './entities/task-code-diff.entity';
import { TaskValidation } from './entities/task-validation.entity';
import { PlaywrightRun } from './entities/playwright-run.entity';
import { SecurityScan } from '../security/entities/security-scan.entity';
import { GitLabService } from '../gitlab/gitlab.service';
import { FeedbackService } from '../feedback/feedback.service';
import { AuditService } from '../audit/audit.service';
import { FeedbackGate, TaskFeedback } from './entities/task-feedback.entity';
import { Project } from '../projects/entities/project.entity';
import { RiskAssessment } from '../risk/entities/risk-assessment.entity';
import { TaskMemoryService } from '../memory/services/task-memory.service';

const DEFAULT_TIMELINE_STEPS: TimelineStep[] = [
  TimelineStep.REQUIREMENT_ANALYSIS,
  TimelineStep.REPOSITORY_ANALYSIS,
  TimelineStep.IMPACT_ANALYSIS,
  TimelineStep.TEST_GENERATION,
  TimelineStep.APPROVAL,
  TimelineStep.CODE_GENERATION,
  TimelineStep.VALIDATION,
  TimelineStep.QA,
  TimelineStep.PR,
];

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(TaskTimeline)
    private readonly timelineRepo: Repository<TaskTimeline>,
    @InjectRepository(TaskPullRequest)
    private readonly prRepo: Repository<TaskPullRequest>,
    @InjectRepository(TaskAnalysis)
    private readonly analysisRepo: Repository<TaskAnalysis>,
    @InjectRepository(TaskTest)
    private readonly testRepo: Repository<TaskTest>,
    @InjectRepository(TaskCodeDiff)
    private readonly codeDiffRepo: Repository<TaskCodeDiff>,
    @InjectRepository(TaskValidation)
    private readonly validationRepo: Repository<TaskValidation>,
    @InjectRepository(PlaywrightRun)
    private readonly playwrightRunRepo: Repository<PlaywrightRun>,
    @InjectRepository(SecurityScan)
    private readonly securityScanRepo: Repository<SecurityScan>,
    @InjectRepository(TaskFeedback)
    private readonly feedbackRepo: Repository<TaskFeedback>,
    @InjectRepository(RiskAssessment)
    private readonly riskRepo: Repository<RiskAssessment>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly n8nService: N8nService,
    private readonly pipeline: TaskPipelineService,
    private readonly gitlab: GitLabService,
    private readonly feedback: FeedbackService,
    private readonly audit: AuditService,
    private readonly taskMemory: TaskMemoryService,
    private readonly config: ConfigService,
  ) {}

  private async clearTaskArtifacts(taskId: string): Promise<void> {
    await this.analysisRepo.delete({ taskId });
    await this.testRepo.delete({ taskId });
    await this.codeDiffRepo.delete({ taskId });
    await this.validationRepo.delete({ taskId });
    await this.prRepo.delete({ taskId });
    await this.playwrightRunRepo.delete({ taskId });
    await this.securityScanRepo.delete({ taskId });
    await this.feedbackRepo.delete({ taskId });
    await this.riskRepo.delete({ taskId });
    await this.taskMemory.purgeTask(taskId);
  }

  private async recordApproval(
    taskId: string,
    gate: FeedbackGate,
    dto: ApprovalDto,
    actorId = 'user',
  ): Promise<void> {
    await this.feedback.record(
      taskId,
      gate,
      dto.action,
      dto.reason || null,
      dto.comment || null,
    );
    await this.audit.log(
      'task',
      taskId,
      `${gate}_${dto.action}`,
      { reason: dto.reason, comment: dto.comment },
      actorId,
    );
  }

  private pipelineMode(): string {
    return this.config.get('TASK_PIPELINE_MODE', 'backend');
  }

  private triggerAnalysis(task: Task): void {
    const mode = this.pipelineMode();
    if (mode === 'backend' || mode === 'both') {
      this.pipeline.runAnalysis(task.id).catch(console.error);
    }
    if (mode === 'n8n' || mode === 'both') {
      this.n8nService.triggerTaskWorkflow(task).catch(console.error);
    }
  }

  private triggerCodeGeneration(task: Task): void {
    const mode = this.pipelineMode();
    if (mode === 'backend' || mode === 'both') {
      this.pipeline.runCodeGeneration(task.id).catch(console.error);
    }
    if (mode === 'n8n' || mode === 'both') {
      this.n8nService.triggerCodeGeneration(task).catch(console.error);
    }
  }

  private triggerValidation(task: Task): void {
    const mode = this.pipelineMode();
    if (mode === 'backend' || mode === 'both') {
      this.pipeline.runValidation(task.id).catch(console.error);
    }
    if (mode === 'n8n' || mode === 'both') {
      this.n8nService.triggerValidation(task).catch(console.error);
    }
  }

  private async assertProjectExists(projectId: string): Promise<void> {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
  }

  async findAll(projectId?: string): Promise<Task[]> {
    const qb = this.taskRepo
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.project', 'project')
      .orderBy('task.created_at', 'DESC');

    if (projectId) {
      qb.andWhere('task.project_id = :projectId', { projectId });
    }

    return qb.getMany();
  }

  async findOne(id: string): Promise<Task> {
    const task = await this.taskRepo.findOne({
      where: { id },
      relations: [
        'project',
        'timeline',
        'analysis',
        'tests',
        'codeDiffs',
        'validations',
        'pullRequests',
      ],
    });
    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }
    return task;
  }

  async findByTaskId(taskId: string): Promise<Task | null> {
    return this.taskRepo.findOne({
      where: { taskId },
      relations: ['project'],
    });
  }

  private async assertTaskIdAvailable(taskId: string): Promise<void> {
    const existing = await this.taskRepo.findOne({ where: { taskId }, select: ['id'] });
    if (existing) {
      throw new BadRequestException(
        `Task ID "${taskId}" already exists. Use a unique task_id.`,
      );
    }
  }

  async create(dto: CreateTaskDto): Promise<Task> {
    await this.assertProjectExists(dto.projectId);
    await this.assertTaskIdAvailable(dto.taskId);

    const task = this.taskRepo.create({
      ...dto,
      status: TaskStatus.PENDING,
    });
    const saved = await this.taskRepo.save(task);

    const timelineEntries = DEFAULT_TIMELINE_STEPS.map((step) =>
      this.timelineRepo.create({
        taskId: saved.id,
        step,
        status: TimelineStepStatus.PENDING,
      }),
    );
    await this.timelineRepo.save(timelineEntries);

    this.triggerAnalysis(saved);

    return this.findOne(saved.id);
  }

  async uploadCsv(dto: UploadTasksDto): Promise<Task[]> {
    await this.assertProjectExists(dto.projectId);

    const lines = dto.csvContent.trim().split('\n');
    if (!lines.length) {
      throw new BadRequestException('CSV content is empty');
    }

    const header = lines[0].toLowerCase();
    const hasHeader = header.includes('task_id');
    const dataLines = hasHeader ? lines.slice(1) : lines;

    const rows: { taskId: string; requirement: string }[] = [];
    for (const line of dataLines) {
      const [taskId, ...rest] = line.split(',');
      const requirement = rest.join(',').trim();
      if (!taskId?.trim() || !requirement) continue;
      rows.push({ taskId: taskId.trim(), requirement });
    }

    if (!rows.length) {
      throw new BadRequestException(
        'No valid task rows found. CSV must include task_id and requirement columns.',
      );
    }

    const seen = new Set<string>();
    const csvDupes: string[] = [];
    for (const row of rows) {
      if (seen.has(row.taskId)) csvDupes.push(row.taskId);
      seen.add(row.taskId);
    }
    if (csvDupes.length) {
      throw new BadRequestException(
        `Duplicate task IDs in CSV: ${[...new Set(csvDupes)].join(', ')}`,
      );
    }

    const taskIds = rows.map((r) => r.taskId);
    const existing = await this.taskRepo.find({
      where: { taskId: In(taskIds) },
      select: ['taskId'],
    });
    if (existing.length) {
      throw new BadRequestException(
        `Task ID(s) already exist: ${existing.map((t) => t.taskId).join(', ')}. Use unique IDs.`,
      );
    }

    const tasks: Task[] = [];
    for (const row of rows) {
      const task = await this.create({
        taskId: row.taskId,
        projectId: dto.projectId,
        requirement: row.requirement,
      });
      tasks.push(task);
    }
    return tasks;
  }

  async approveAnalysis(id: string, dto: ApprovalDto): Promise<Task> {
    const task = await this.findOne(id);
    await this.recordApproval(id, 'analysis', dto);

    if (dto.action === 'approve') {
      task.status = TaskStatus.GENERATING_CODE;
      await this.pipeline.markAnalysisApproved(id);
      this.triggerCodeGeneration(task);
    } else if (dto.action === 'reject') {
      task.status = TaskStatus.FAILED;
    } else {
      task.status = TaskStatus.ANALYZING;
      this.triggerAnalysis(task);
    }
    await this.taskRepo.save(task);
    return this.findOne(id);
  }

  async fixLint(id: string): Promise<Task> {
    await this.findOne(id);
    try {
      await this.pipeline.fixLintAndRevalidate(id);
    } catch (error) {
      throw new BadRequestException((error as Error).message || 'Fix lint failed');
    }
    return this.findOne(id);
  }

  async retryPr(id: string): Promise<Task> {
    await this.findOne(id);
    try {
      await this.pipeline.retryPrCreation(id);
    } catch (error) {
      throw new BadRequestException((error as Error).message || 'PR creation failed');
    }
    return this.findOne(id);
  }

  async retryCodegen(id: string): Promise<Task> {
    const task = await this.findOne(id);
    if (task.status !== TaskStatus.FAILED) {
      throw new BadRequestException('Only failed tasks can retry code generation');
    }
    task.status = TaskStatus.GENERATING_CODE;
    await this.taskRepo.save(task);
    this.triggerCodeGeneration(task);
    return this.findOne(id);
  }

  async revertCode(id: string, dto: RevertCodeDto): Promise<Task> {
    await this.findOne(id);
    try {
      await this.pipeline.revertCodeChanges(id, dto.paths);
    } catch (error) {
      throw new BadRequestException((error as Error).message || 'Revert failed');
    }
    return this.findOne(id);
  }

  async restartByTaskId(taskId: string): Promise<Task> {
    const task = await this.findByTaskId(taskId);
    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }
    return this.restart(task.id);
  }

  /** Clear pipeline artifacts and re-run analysis from step 1 */
  async restart(id: string): Promise<Task> {
    const task = await this.findOne(id);

    await this.clearTaskArtifacts(id);

    const timeline = await this.timelineRepo.find({ where: { taskId: id } });
    for (const entry of timeline) {
      entry.status = TimelineStepStatus.PENDING;
      entry.startedAt = null;
      entry.completedAt = null;
      entry.message = null;
      await this.timelineRepo.save(entry);
    }

    await this.taskRepo.update(id, {
      status: TaskStatus.PENDING,
      assignedAgent: null,
      acceptanceCriteria: null,
      userStories: null,
      businessImpact: null,
      keywords: null,
      risk: RiskLevel.MEDIUM,
    });

    await this.audit.log('task', id, 'task_restarted', { taskId: task.taskId });

    const refreshed = await this.findOne(id);
    this.triggerAnalysis(refreshed);
    return refreshed;
  }

  async deleteByTaskId(taskId: string): Promise<{ deleted: boolean; taskId: string }> {
    const task = await this.findByTaskId(taskId);
    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }
    return this.delete(task.id);
  }

  /** Permanently remove task and all related records from the database */
  async delete(id: string): Promise<{ deleted: boolean; taskId: string }> {
    const task = await this.findOne(id);
    const displayId = task.taskId;

    await this.clearTaskArtifacts(id);
    await this.timelineRepo.delete({ taskId: id });
    await this.taskRepo.delete(id);

    await this.audit.log('task', id, 'task_deleted', { taskId: displayId });

    return { deleted: true, taskId: displayId };
  }

  async approveCode(id: string, dto: ApprovalDto): Promise<Task> {
    const task = await this.findOne(id);
    await this.recordApproval(id, 'code', dto);

    if (dto.action === 'approve') {
      task.status = TaskStatus.VALIDATING;
      this.triggerValidation(task);
    } else if (dto.action === 'reject') {
      task.status = TaskStatus.FAILED;
    } else {
      task.status = TaskStatus.GENERATING_CODE;
      this.triggerCodeGeneration(task);
    }
    await this.taskRepo.save(task);
    return this.findOne(id);
  }

  async getAuditLogs(id: string) {
    await this.findOne(id);
    return this.audit.findByEntity('task', id);
  }

  async getFeedback(id: string) {
    await this.findOne(id);
    return this.feedback.findByTask(id);
  }

  async getRecent(limit = 5): Promise<Task[]> {
    const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 5;
    const tasks = await this.findAll();
    return tasks.slice(0, safeLimit);
  }

  private resolveGitlabProjectId(task: Task): number {
    const id = task.project?.githubRepoId ? Number(task.project.githubRepoId) : NaN;
    if (!Number.isFinite(id)) {
      throw new BadRequestException('Project is not linked to GitLab');
    }
    return id;
  }

  private async getOpenPr(task: Task): Promise<TaskPullRequest> {
    const pr = task.pullRequests?.[0];
    if (!pr?.prNumber) {
      throw new BadRequestException('No GitLab merge request found for this task');
    }
    if (!['open', 'approved'].includes(pr.reviewStatus)) {
      throw new BadRequestException(`MR is already ${pr.reviewStatus}`);
    }
    return pr;
  }

  private buildApprovalNote(
    task: Task,
    codeDiff: { fileEdits?: { path: string; changeComments?: string[] }[] | null; filesToModify?: { path: string; changes: string[] }[] } | undefined,
  ): string {
    const lines = [
      '✅ **RepoPilot approval**',
      '',
      `Task \`${task.taskId}\` reviewed and approved from the dashboard.`,
      '',
      '**Code changes:**',
    ];
    const edits = codeDiff?.fileEdits || [];
    if (edits.length) {
      for (const edit of edits) {
        lines.push(`- \`${edit.path}\``);
        for (const c of edit.changeComments || []) lines.push(`  - ${c}`);
      }
    } else if (codeDiff?.filesToModify?.length) {
      for (const f of codeDiff.filesToModify) {
        lines.push(`- \`${f.path}\`: ${f.changes.join('; ')}`);
      }
    } else {
      lines.push('- See MR description for implementation details.');
    }
    return lines.join('\n');
  }

  async mergePr(id: string): Promise<Task> {
    const task = await this.findOne(id);
    const pr = await this.getOpenPr(task);
    const projectId = this.resolveGitlabProjectId(task);
    await this.gitlab.mergeMergeRequest(projectId, pr.prNumber!);
    pr.reviewStatus = 'merged';
    await this.prRepo.save(pr);
    task.status = TaskStatus.COMPLETED;
    await this.taskRepo.save(task);
    await this.audit.log('task', id, 'mr_merged', { prNumber: pr.prNumber });
    return this.findOne(id);
  }

  async closePr(id: string): Promise<Task> {
    const task = await this.findOne(id);
    const pr = await this.getOpenPr(task);
    const projectId = this.resolveGitlabProjectId(task);
    await this.gitlab.closeMergeRequest(projectId, pr.prNumber!);
    pr.reviewStatus = 'closed';
    await this.prRepo.save(pr);
    await this.audit.log('task', id, 'mr_closed', { prNumber: pr.prNumber });
    return this.findOne(id);
  }

  async approvePr(id: string): Promise<Task> {
    const task = await this.findOne(id);
    const pr = await this.getOpenPr(task);
    const projectId = this.resolveGitlabProjectId(task);
    const codeDiff = task.codeDiffs?.[0];
    await this.gitlab.approveMergeRequest(projectId, pr.prNumber!);
    await this.gitlab.addMergeRequestNote(
      projectId,
      pr.prNumber!,
      this.buildApprovalNote(task, codeDiff),
    );
    pr.reviewStatus = 'approved';
    await this.prRepo.save(pr);
    await this.audit.log('task', id, 'mr_approved', { prNumber: pr.prNumber });
    return this.findOne(id);
  }
}
