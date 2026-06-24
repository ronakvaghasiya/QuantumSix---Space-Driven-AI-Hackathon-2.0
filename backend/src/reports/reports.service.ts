import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../tasks/entities/task.entity';
import { TaskPullRequest } from '../tasks/entities/task-pull-request.entity';
import { TaskValidation } from '../tasks/entities/task-validation.entity';
import { TaskTimeline } from '../tasks/entities/task-timeline.entity';
import { TaskTest } from '../tasks/entities/task-test.entity';
import { Project } from '../projects/entities/project.entity';
import { TaskStatus, TimelineStep } from '../common/enums/task.enum';
import { ProjectStatus } from '../common/enums/project.enum';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
    @InjectRepository(TaskPullRequest) private readonly prRepo: Repository<TaskPullRequest>,
    @InjectRepository(TaskValidation) private readonly validationRepo: Repository<TaskValidation>,
    @InjectRepository(TaskTimeline) private readonly timelineRepo: Repository<TaskTimeline>,
    @InjectRepository(TaskTest) private readonly testRepo: Repository<TaskTest>,
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
  ) {}

  async getDashboardStats() {
    const [
      projects,
      tasks,
      completedTasks,
      prs,
      failedTasks,
      awaitingApproval,
      analyzing,
      generatingCode,
      validating,
      testing,
      prCreated,
      indexedProjects,
    ] = await Promise.all([
      this.projectRepo.count(),
      this.taskRepo.count(),
      this.taskRepo.count({ where: { status: TaskStatus.COMPLETED } }),
      this.prRepo.count(),
      this.taskRepo.count({ where: { status: TaskStatus.FAILED } }),
      this.taskRepo.count({
        where: [
          { status: TaskStatus.ANALYSIS_APPROVAL_REQUIRED },
          { status: TaskStatus.CODE_APPROVAL_REQUIRED },
          { status: TaskStatus.APPROVAL_REQUIRED },
        ],
      }),
      this.taskRepo.count({ where: { status: TaskStatus.ANALYZING } }),
      this.taskRepo.count({ where: { status: TaskStatus.GENERATING_CODE } }),
      this.taskRepo.count({ where: { status: TaskStatus.VALIDATING } }),
      this.taskRepo.count({ where: { status: TaskStatus.TESTING } }),
      this.taskRepo.count({ where: { status: TaskStatus.PR_CREATED } }),
      this.projectRepo.count({ where: { status: ProjectStatus.COMPLETED } }),
    ]);

    const validations = await this.validationRepo.find();
    const lintFailures = validations.filter((v) => v.lintStatus === 'fail').length;
    const buildFailures = validations.filter((v) => v.buildStatus === 'fail').length;
    const validationPassRate =
      validations.length > 0
        ? Math.round(
            (validations.filter((v) => v.lintStatus !== 'fail' && v.buildStatus !== 'fail').length /
              validations.length) *
              100,
          )
        : 100;

    const agentRuns = tasks;
    const successRate = tasks > 0 ? Math.round(((tasks - failedTasks) / tasks) * 100) : 0;
    const inProgress = analyzing + generatingCode + validating + testing;

    return {
      projects,
      tasks,
      completedTasks,
      pullRequests: prs,
      successRate,
      agentRuns,
      awaitingApproval,
      inProgress,
      failedTasks,
      prCreated,
      validationPassRate,
      lintFailures,
      buildFailures,
      indexedProjects,
    };
  }

  async getAnalytics() {
    const [tasks, prs, validations, timelines, tests, projects] = await Promise.all([
      this.taskRepo.find({ relations: ['project'], order: { createdAt: 'DESC' } }),
      this.prRepo.find({ relations: ['task'], order: { createdAt: 'ASC' } }),
      this.validationRepo.find({ order: { createdAt: 'DESC' } }),
      this.timelineRepo.find(),
      this.testRepo.find(),
      this.projectRepo.find(),
    ]);

    const tasksPerDay = this.groupByDay(tasks.map((t) => t.createdAt));
    const prTrend = this.groupByDay(prs.map((p) => p.createdAt));

    const failed = tasks.filter((t) => t.status === TaskStatus.FAILED).length;
    const total = tasks.length;
    const prCreated = tasks.filter((t) => t.status === TaskStatus.PR_CREATED).length;
    const awaitingApproval = tasks.filter((t) =>
      [
        TaskStatus.ANALYSIS_APPROVAL_REQUIRED,
        TaskStatus.CODE_APPROVAL_REQUIRED,
        TaskStatus.APPROVAL_REQUIRED,
      ].includes(t.status as TaskStatus),
    ).length;
    const inProgress = tasks.filter((t) =>
      [
        TaskStatus.ANALYZING,
        TaskStatus.GENERATING_TESTS,
        TaskStatus.GENERATING_CODE,
        TaskStatus.VALIDATING,
        TaskStatus.TESTING,
        TaskStatus.PLAYWRIGHT_EXECUTION,
        TaskStatus.QA_VERIFICATION,
        TaskStatus.SECURITY_SCAN,
        TaskStatus.CREATING_PR,
      ].includes(t.status as TaskStatus),
    ).length;

    const validationByTask = new Map(validations.map((v) => [v.taskId, v]));
    const testsByTask = new Map(tests.map((t) => [t.taskId, t]));
    const prByTask = new Map(prs.map((p) => [p.taskId, p]));
    const timelinesByTask = new Map<string, TaskTimeline[]>();
    for (const tl of timelines) {
      const list = timelinesByTask.get(tl.taskId) || [];
      list.push(tl);
      timelinesByTask.set(tl.taskId, list);
    }

    const analysisTimes: number[] = [];
    const validationTimes: number[] = [];
    for (const task of tasks) {
      const tls = timelinesByTask.get(task.id) || [];
      const req = tls.find((t) => t.step === TimelineStep.REQUIREMENT_ANALYSIS);
      const testGen = tls.find((t) => t.step === TimelineStep.TEST_GENERATION);
      if (req?.startedAt && testGen?.completedAt) {
        analysisTimes.push(
          (testGen.completedAt.getTime() - req.startedAt.getTime()) / 1000,
        );
      }
      const val = tls.find((t) => t.step === TimelineStep.VALIDATION);
      const qa = tls.find((t) => t.step === TimelineStep.QA);
      if (val?.startedAt && qa?.completedAt) {
        validationTimes.push((qa.completedAt.getTime() - val.startedAt.getTime()) / 1000);
      }
    }

    const countStatus = (field: keyof TaskValidation, value: string) =>
      validations.filter((v) => v[field] === value).length;

    const testsPassedTotal = validations.reduce((s, v) => s + (v.playwrightPassed || 0), 0);
    const testsFailedTotal = validations.reduce((s, v) => s + (v.playwrightFailed || 0), 0);
    const avgCoverage =
      tests.length > 0
        ? Math.round(tests.reduce((s, t) => s + (t.regressionCoverage || 0), 0) / tests.length)
        : 0;

    const agentCounts = new Map<string, number>();
    for (const task of tasks) {
      if (task.assignedAgent) {
        agentCounts.set(task.assignedAgent, (agentCounts.get(task.assignedAgent) || 0) + 1);
      }
    }
    const agentPerformance = Array.from(agentCounts.entries())
      .map(([agent, count]) => ({ agent, count }))
      .sort((a, b) => b.count - a.count);

    const statusBreakdown = Object.values(TaskStatus)
      .map((status) => ({
        status,
        count: tasks.filter((t) => t.status === status).length,
      }))
      .filter((s) => s.count > 0);

    const taskSummaries = tasks.map((task) => {
      const v = validationByTask.get(task.id);
      const t = testsByTask.get(task.id);
      const pr = prByTask.get(task.id);
      const functionalPassed = t?.functionalTests?.filter((f) => f.passed).length ?? 0;
      const functionalTotal = t?.functionalTests?.length ?? 0;
      return {
        id: task.id,
        taskId: task.taskId,
        projectName: task.project?.name || 'Unknown',
        status: task.status,
        assignedAgent: task.assignedAgent,
        risk: task.risk,
        lintStatus: v?.lintStatus || '—',
        prettierStatus: v?.prettierStatus || '—',
        buildStatus: v?.buildStatus || '—',
        testsPassed: v?.playwrightPassed ?? functionalPassed,
        testsFailed: v?.playwrightFailed ?? functionalTotal - functionalPassed,
        regressionCoverage: t?.regressionCoverage ?? 0,
        prUrl: pr?.prUrl || null,
        prNumber: pr?.prNumber || null,
        createdAt: task.createdAt,
      };
    });

    const validationPassRate =
      validations.length > 0
        ? Math.round(
            (validations.filter((v) => v.lintStatus !== 'fail' && v.buildStatus !== 'fail').length /
              validations.length) *
              100,
          )
        : 100;

    return {
      totalTasks: total,
      completedTasks: tasks.filter((t) => t.status === TaskStatus.COMPLETED).length,
      failedTasks: failed,
      prsCreated: prs.length,
      prCreated,
      awaitingApproval,
      inProgress,
      indexedProjects: projects.filter((p) => p.status === ProjectStatus.COMPLETED).length,
      totalProjects: projects.length,
      averageAnalysisTime: analysisTimes.length
        ? Math.round(analysisTimes.reduce((a, b) => a + b, 0) / analysisTimes.length)
        : 0,
      averageValidationTime: validationTimes.length
        ? Math.round(validationTimes.reduce((a, b) => a + b, 0) / validationTimes.length)
        : 0,
      agentSuccessRate: total > 0 ? Math.round(((total - failed) / total) * 100) : 0,
      validationPassRate,
      tasksPerDay,
      prCreationTrend: prTrend,
      qa: {
        testsPassedTotal,
        testsFailedTotal,
        averageRegressionCoverage: avgCoverage,
        functionalTestsTotal: tests.reduce((s, t) => s + (t.functionalTests?.length || 0), 0),
        playwrightSpecsTotal: tests.reduce((s, t) => s + (t.playwrightSpecs?.length || 0), 0),
      },
      validation: {
        eslint: { pass: countStatus('lintStatus', 'pass'), fail: countStatus('lintStatus', 'fail'), skipped: countStatus('lintStatus', 'skipped') },
        prettier: { pass: countStatus('prettierStatus', 'pass'), fail: countStatus('prettierStatus', 'fail'), skipped: countStatus('prettierStatus', 'skipped') },
        build: { pass: countStatus('buildStatus', 'pass'), fail: countStatus('buildStatus', 'fail'), skipped: countStatus('buildStatus', 'skipped') },
        totalRuns: validations.length,
      },
      agentPerformance,
      statusBreakdown,
      taskSummaries,
    };
  }

  async getRecentPullRequests(limit = 5) {
    return this.prRepo.find({
      relations: ['task'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  private groupByDay(dates: Date[]): { date: string; count: number }[] {
    const map = new Map<string, number>();
    for (const d of dates) {
      const key = d.toISOString().split('T')[0];
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
  }
}
