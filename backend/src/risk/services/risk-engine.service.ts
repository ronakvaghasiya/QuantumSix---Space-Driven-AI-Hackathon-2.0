import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RiskAssessment, RiskFactors } from '../entities/risk-assessment.entity';
import { Task } from '../../tasks/entities/task.entity';
import { TaskAnalysis } from '../../tasks/entities/task-analysis.entity';
import { RiskLevel } from '../../common/enums/task.enum';
import { SimilarTaskService } from '../../memory/services/similar-task.service';
import { AuditService } from '../../audit/audit.service';

const RISK_WEIGHTS = {
  llmRisk: 0.3,
  impactedFiles: 0.2,
  dependencyDepth: 0.15,
  securityExposure: 0.15,
  similarTaskFailureRate: 0.2,
};

@Injectable()
export class RiskEngineService {
  private readonly logger = new Logger(RiskEngineService.name);

  constructor(
    @InjectRepository(RiskAssessment)
    private readonly riskRepo: Repository<RiskAssessment>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(TaskAnalysis)
    private readonly analysisRepo: Repository<TaskAnalysis>,
    private readonly similarTasks: SimilarTaskService,
    private readonly audit: AuditService,
  ) {}

  async assessTask(taskId: string): Promise<RiskAssessment> {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException(`Task ${taskId} not found`);

    const analysis = await this.analysisRepo.findOne({
      where: { taskId },
      order: { createdAt: 'DESC' },
    });

    const impactedCount = analysis?.impactedFiles?.length || 0;
    const adjacency = analysis?.dependencyGraph || {};
    const maxDepth = this.computeMaxDepth(adjacency, impactedCount);

    const failureRate = await this.similarTasks.failureRateForSimilar(
      task.projectId,
      task.requirement,
    );

    const factors: RiskFactors = {
      llmRisk: this.mapLlmRisk(task.risk),
      impactedFiles: Math.min(impactedCount * 4, 25),
      dependencyDepth: Math.min(maxDepth * 5, 20),
      securityExposure: this.inferSecurityExposure(task.requirement, impactedCount),
      similarTaskFailureRate: Math.round(failureRate * 25),
      details: {
        impactedCount,
        maxDepth,
        failureRate: Math.round(failureRate * 100),
        llmRiskLevel: task.risk,
      },
    };

    const overallScore = Math.round(
      factors.llmRisk * RISK_WEIGHTS.llmRisk +
        factors.impactedFiles * RISK_WEIGHTS.impactedFiles +
        factors.dependencyDepth * RISK_WEIGHTS.dependencyDepth +
        factors.securityExposure * RISK_WEIGHTS.securityExposure +
        factors.similarTaskFailureRate * RISK_WEIGHTS.similarTaskFailureRate,
    );

    const riskLevel = this.scoreToLevel(overallScore);
    const summary = this.buildSummary(overallScore, riskLevel, factors);

    const existing = await this.riskRepo.findOne({
      where: { taskId },
      order: { computedAt: 'DESC' },
    });

    let assessment: RiskAssessment;
    if (existing) {
      existing.overallScore = overallScore;
      existing.riskLevel = riskLevel;
      existing.factors = factors;
      existing.summary = summary;
      existing.computedAt = new Date();
      assessment = await this.riskRepo.save(existing);
    } else {
      assessment = await this.riskRepo.save(
        this.riskRepo.create({
          taskId,
          overallScore,
          riskLevel,
          factors,
          summary,
        }),
      );
    }

    await this.taskRepo.update(taskId, { risk: riskLevel as RiskLevel });
    await this.audit.log('task', taskId, 'risk_assessed', {
      overallScore,
      riskLevel,
      factors,
    });
    this.logger.log(`Risk assessed for ${taskId}: ${overallScore} (${riskLevel})`);
    return assessment;
  }

  async getAssessment(taskId: string): Promise<RiskAssessment | null> {
    return this.riskRepo.findOne({
      where: { taskId },
      order: { computedAt: 'DESC' },
    });
  }

  async getProjectSummary(projectId: string): Promise<{
    averageScore: number;
    highRiskCount: number;
    totalAssessed: number;
    distribution: Record<string, number>;
  }> {
    const tasks = await this.taskRepo.find({ where: { projectId } });
    const taskIds = tasks.map((t) => t.id);
    if (taskIds.length === 0) {
      return { averageScore: 0, highRiskCount: 0, totalAssessed: 0, distribution: {} };
    }

    const assessments = await this.riskRepo
      .createQueryBuilder('r')
      .where('r.task_id IN (:...taskIds)', { taskIds })
      .getMany();

    const distribution: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    let total = 0;
    let highRisk = 0;

    for (const a of assessments) {
      distribution[a.riskLevel] = (distribution[a.riskLevel] || 0) + 1;
      total += a.overallScore;
      if (a.riskLevel === 'high' || a.riskLevel === 'critical') highRisk++;
    }

    return {
      averageScore: assessments.length ? Math.round(total / assessments.length) : 0,
      highRiskCount: highRisk,
      totalAssessed: assessments.length,
      distribution,
    };
  }

  private mapLlmRisk(risk: RiskLevel | string): number {
    switch (risk) {
      case RiskLevel.CRITICAL:
      case 'critical':
        return 100;
      case RiskLevel.HIGH:
      case 'high':
        return 75;
      case RiskLevel.MEDIUM:
      case 'medium':
        return 50;
      default:
        return 25;
    }
  }

  private scoreToLevel(score: number): string {
    if (score >= 75) return 'critical';
    if (score >= 55) return 'high';
    if (score >= 35) return 'medium';
    return 'low';
  }

  private computeMaxDepth(adjacency: Record<string, string[]>, seedCount: number): number {
    const keys = Object.keys(adjacency);
    if (keys.length === 0) return Math.min(seedCount, 3);

    let maxDepth = 0;
    const visited = new Set<string>();

    const dfs = (node: string, depth: number) => {
      if (visited.has(node) || depth > 10) return;
      visited.add(node);
      maxDepth = Math.max(maxDepth, depth);
      for (const child of adjacency[node] || []) {
        dfs(child, depth + 1);
      }
    };

    for (const key of keys.slice(0, 20)) {
      dfs(key, 1);
    }
    return maxDepth;
  }

  private inferSecurityExposure(requirement: string, impactedCount: number): number {
    const securityKeywords = ['auth', 'password', 'token', 'secret', 'payment', 'pii', 'encrypt'];
    const lower = requirement.toLowerCase();
    const hits = securityKeywords.filter((k) => lower.includes(k)).length;
    return Math.min(hits * 8 + impactedCount, 25);
  }

  private buildSummary(score: number, level: string, factors: RiskFactors): string {
    const top = Object.entries({
      'LLM risk': factors.llmRisk,
      'File impact': factors.impactedFiles,
      'Dependency depth': factors.dependencyDepth,
      'Security exposure': factors.securityExposure,
      'Similar task failures': factors.similarTaskFailureRate,
    }).sort((a, b) => b[1] - a[1])[0];
    return `Overall ${level} risk (score ${score}/100). Primary driver: ${top[0]} (${top[1]}).`;
  }
}
