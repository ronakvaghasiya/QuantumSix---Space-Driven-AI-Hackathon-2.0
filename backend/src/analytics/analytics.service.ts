import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../tasks/entities/task.entity';
import { TaskValidation } from '../tasks/entities/task-validation.entity';
import { Project } from '../projects/entities/project.entity';
import { RiskAssessment } from '../risk/entities/risk-assessment.entity';
import { Release } from '../releases/entities/release.entity';
import { ReindexEvent } from '../memory/entities/reindex-event.entity';
import { TaskStatus } from '../common/enums/task.enum';
import { ProjectStatus } from '../common/enums/project.enum';

export interface RiskTrendPoint {
  date: string;
  averageScore: number;
  assessments: number;
  highRiskCount: number;
}

export interface RepositoryHealthItem {
  projectId: string;
  projectName: string;
  status: string;
  healthScore: number;
  filesIndexed: number;
  indexingProgress: number;
  lastScanAt: string | null;
  lastReindexAt: string | null;
  indexingError: string | null;
  taskSuccessRate: number;
  avgRiskScore: number;
  validationPassRate: number;
  recentReindexes: number;
}

export interface EngineeringDashboard {
  summary: {
    projects: number;
    indexedProjects: number;
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    mergedReleases: number;
    avgRiskScore: number;
    validationPassRate: number;
    taskSuccessRate: number;
  };
  riskTrends: RiskTrendPoint[];
  repositoryHealth: RepositoryHealthItem[];
  tasksPerDay: { date: string; count: number }[];
  releasesPerWeek: { week: string; count: number }[];
  riskDistribution: Record<string, number>;
  recentReleases: Array<{
    id: string;
    versionTag: string;
    projectName: string;
    taskId: string | null;
    createdAt: string;
  }>;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
    @InjectRepository(TaskValidation) private readonly validationRepo: Repository<TaskValidation>,
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
    @InjectRepository(RiskAssessment) private readonly riskRepo: Repository<RiskAssessment>,
    @InjectRepository(Release) private readonly releaseRepo: Repository<Release>,
    @InjectRepository(ReindexEvent) private readonly reindexRepo: Repository<ReindexEvent>,
  ) {}

  async getEngineeringDashboard(organizationId: string): Promise<EngineeringDashboard> {
    const [projects, tasks, validations, releases, riskAssessments] = await Promise.all([
      this.projectRepo.find({ where: { organizationId } }),
      this.taskRepo
        .createQueryBuilder('task')
        .innerJoin('task.project', 'project')
        .where('project.organization_id = :organizationId', { organizationId })
        .getMany(),
      this.validationRepo
        .createQueryBuilder('v')
        .innerJoin('v.task', 'task')
        .innerJoin('task.project', 'project')
        .where('project.organization_id = :organizationId', { organizationId })
        .getMany(),
      this.releaseRepo.find({
        where: { organizationId },
        order: { createdAt: 'DESC' },
        take: 10,
        relations: ['project', 'task'],
      }),
      this.riskRepo
        .createQueryBuilder('r')
        .innerJoin('r.task', 'task')
        .innerJoin('task.project', 'project')
        .where('project.organization_id = :organizationId', { organizationId })
        .orderBy('r.computed_at', 'DESC')
        .getMany(),
    ]);

    const projectIds = projects.map((p) => p.id);
    const taskIds = new Set(tasks.map((t) => t.id));
    const orgValidations = validations.filter((v) => taskIds.has(v.taskId));
    const orgRisks = riskAssessments.filter((r) => taskIds.has(r.taskId));

    const completedTasks = tasks.filter((t) => t.status === TaskStatus.COMPLETED).length;
    const failedTasks = tasks.filter((t) => t.status === TaskStatus.FAILED).length;
    const totalTasks = tasks.length;

    const validationPassRate =
      orgValidations.length > 0
        ? Math.round(
            (orgValidations.filter((v) => v.lintStatus !== 'fail' && v.buildStatus !== 'fail').length /
              orgValidations.length) *
              100,
          )
        : 100;

    const avgRiskScore =
      orgRisks.length > 0
        ? Math.round(orgRisks.reduce((s, r) => s + r.overallScore, 0) / orgRisks.length)
        : 0;

    const riskDistribution: Record<string, number> = {};
    for (const r of orgRisks) {
      riskDistribution[r.riskLevel] = (riskDistribution[r.riskLevel] || 0) + 1;
    }

    const repositoryHealth = await this.buildRepositoryHealth(projects, tasks, orgValidations, orgRisks);

    return {
      summary: {
        projects: projects.length,
        indexedProjects: projects.filter((p) => p.status === ProjectStatus.COMPLETED).length,
        totalTasks,
        completedTasks,
        failedTasks,
        mergedReleases: await this.releaseRepo.count({ where: { organizationId } }),
        avgRiskScore,
        validationPassRate,
        taskSuccessRate: totalTasks > 0 ? Math.round(((totalTasks - failedTasks) / totalTasks) * 100) : 0,
      },
      riskTrends: this.buildRiskTrends(orgRisks, 30),
      repositoryHealth,
      tasksPerDay: this.groupByDay(tasks.map((t) => t.createdAt)),
      releasesPerWeek: this.groupReleasesByWeek(releases),
      riskDistribution,
      recentReleases: releases.map((r) => ({
        id: r.id,
        versionTag: r.versionTag,
        projectName: r.project?.name || 'Unknown',
        taskId: r.task?.taskId || null,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async getRiskTrends(organizationId: string, days = 30): Promise<RiskTrendPoint[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const risks = await this.riskRepo
      .createQueryBuilder('r')
      .innerJoin('r.task', 'task')
      .innerJoin('task.project', 'project')
      .where('project.organization_id = :organizationId', { organizationId })
      .andWhere('r.computed_at >= :since', { since })
      .orderBy('r.computed_at', 'ASC')
      .getMany();

    return this.buildRiskTrends(risks, days);
  }

  async getRepositoryHealth(organizationId: string): Promise<RepositoryHealthItem[]> {
    const [projects, tasks, validations, risks] = await Promise.all([
      this.projectRepo.find({ where: { organizationId } }),
      this.taskRepo
        .createQueryBuilder('task')
        .innerJoin('task.project', 'project')
        .where('project.organization_id = :organizationId', { organizationId })
        .getMany(),
      this.validationRepo
        .createQueryBuilder('v')
        .innerJoin('v.task', 'task')
        .innerJoin('task.project', 'project')
        .where('project.organization_id = :organizationId', { organizationId })
        .getMany(),
      this.riskRepo
        .createQueryBuilder('r')
        .innerJoin('r.task', 'task')
        .innerJoin('task.project', 'project')
        .where('project.organization_id = :organizationId', { organizationId })
        .getMany(),
    ]);

    return this.buildRepositoryHealth(projects, tasks, validations, risks);
  }

  private async buildRepositoryHealth(
    projects: Project[],
    tasks: Task[],
    validations: TaskValidation[],
    risks: RiskAssessment[],
  ): Promise<RepositoryHealthItem[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const reindexCounts = new Map<string, number>();
    if (projects.length > 0) {
      const events = await this.reindexRepo
        .createQueryBuilder('e')
        .where('e.project_id IN (:...ids)', { ids: projects.map((p) => p.id) })
        .andWhere('e.created_at >= :since', { since: thirtyDaysAgo })
        .getMany();
      for (const e of events) {
        reindexCounts.set(e.projectId, (reindexCounts.get(e.projectId) || 0) + 1);
      }
    }

    return projects.map((project) => {
      const projectTasks = tasks.filter((t) => t.projectId === project.id);
      const projectTaskIds = new Set(projectTasks.map((t) => t.id));
      const projectValidations = validations.filter((v) => projectTaskIds.has(v.taskId));
      const projectRisks = risks.filter((r) => projectTaskIds.has(r.taskId));

      const failed = projectTasks.filter((t) => t.status === TaskStatus.FAILED).length;
      const total = projectTasks.length;
      const taskSuccessRate = total > 0 ? Math.round(((total - failed) / total) * 100) : 100;

      const validationPassRate =
        projectValidations.length > 0
          ? Math.round(
              (projectValidations.filter((v) => v.lintStatus !== 'fail' && v.buildStatus !== 'fail').length /
                projectValidations.length) *
                100,
            )
          : 100;

      const avgRiskScore =
        projectRisks.length > 0
          ? Math.round(projectRisks.reduce((s, r) => s + r.overallScore, 0) / projectRisks.length)
          : 0;

      let healthScore = 50;
      if (project.status === ProjectStatus.COMPLETED) healthScore += 25;
      if (project.indexingError) healthScore -= 20;
      healthScore += Math.round(taskSuccessRate * 0.15);
      healthScore += Math.round(validationPassRate * 0.1);
      healthScore -= Math.max(0, avgRiskScore - 50) * 0.2;
      healthScore = Math.min(100, Math.max(0, Math.round(healthScore)));

      return {
        projectId: project.id,
        projectName: project.name,
        status: project.status,
        healthScore,
        filesIndexed: project.filesIndexed || 0,
        indexingProgress: project.indexingProgress || 0,
        lastScanAt: project.lastScanAt?.toISOString() || null,
        lastReindexAt: project.lastReindexAt?.toISOString() || null,
        indexingError: project.indexingError,
        taskSuccessRate,
        avgRiskScore,
        validationPassRate,
        recentReindexes: reindexCounts.get(project.id) || 0,
      };
    });
  }

  private buildRiskTrends(risks: RiskAssessment[], days: number): RiskTrendPoint[] {
    const map = new Map<string, { total: number; count: number; high: number }>();
    const since = new Date();
    since.setDate(since.getDate() - days);

    for (const r of risks) {
      if (r.computedAt < since) continue;
      const date = r.computedAt.toISOString().split('T')[0];
      const entry = map.get(date) || { total: 0, count: 0, high: 0 };
      entry.total += r.overallScore;
      entry.count += 1;
      if (r.riskLevel === 'high' || r.riskLevel === 'critical') entry.high += 1;
      map.set(date, entry);
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date,
        averageScore: Math.round(v.total / v.count),
        assessments: v.count,
        highRiskCount: v.high,
      }));
  }

  private groupByDay(dates: Date[]): { date: string; count: number }[] {
    const map = new Map<string, number>();
    for (const d of dates) {
      const key = d.toISOString().split('T')[0];
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));
  }

  private groupReleasesByWeek(releases: Release[]): { week: string; count: number }[] {
    const map = new Map<string, number>();
    for (const r of releases) {
      const d = new Date(r.createdAt);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().split('T')[0];
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, count]) => ({ week, count }));
  }
}
