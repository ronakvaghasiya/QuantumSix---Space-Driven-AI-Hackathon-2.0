import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plugin } from './entities/plugin.entity';
import { PluginInstallation } from './entities/plugin-installation.entity';
import {
  PluginHook,
  PluginHookContext,
  PluginHookResult,
  PluginHandler,
} from './plugin.types';
import { RiskAssessment } from '../risk/entities/risk-assessment.entity';

@Injectable()
export class RiskGateValidatorHandler implements PluginHandler {
  readonly slug = 'risk-gate-validator';

  constructor(
    @InjectRepository(RiskAssessment)
    private readonly riskRepo: Repository<RiskAssessment>,
  ) {}

  async execute(hook: PluginHook, context: PluginHookContext): Promise<PluginHookResult> {
    if (hook !== PluginHook.POST_ANALYSIS) {
      return { pluginSlug: this.slug, hook, status: 'ok', message: 'Skipped' };
    }
    const threshold = Number(context.payload?.riskThreshold ?? 75);
    const risk = await this.riskRepo.findOne({
      where: { taskId: context.taskId },
      order: { computedAt: 'DESC' },
    });
    if (!risk) {
      return { pluginSlug: this.slug, hook, status: 'ok', message: 'No risk assessment yet' };
    }
    if (risk.overallScore > threshold) {
      return {
        pluginSlug: this.slug,
        hook,
        status: 'warn',
        message: `Risk score ${risk.overallScore} exceeds threshold ${threshold}`,
        data: { overallScore: risk.overallScore, riskLevel: risk.riskLevel },
      };
    }
    return { pluginSlug: this.slug, hook, status: 'ok', message: 'Risk within threshold' };
  }
}

@Injectable()
export class CoverageValidatorHandler implements PluginHandler {
  readonly slug = 'coverage-validator';

  async execute(hook: PluginHook, context: PluginHookContext): Promise<PluginHookResult> {
    if (hook !== PluginHook.POST_VALIDATION) {
      return { pluginSlug: this.slug, hook, status: 'ok', message: 'Skipped' };
    }
    const minCoverage = Number(context.payload?.minCoverage ?? 50);
    const coverage = Number(context.payload?.regressionCoverage ?? 0);
    if (coverage < minCoverage) {
      return {
        pluginSlug: this.slug,
        hook,
        status: 'fail',
        message: `Regression coverage ${coverage}% below minimum ${minCoverage}%`,
        data: { coverage, minCoverage },
      };
    }
    return { pluginSlug: this.slug, hook, status: 'ok', message: 'Coverage acceptable' };
  }
}

@Injectable()
export class AiReviewWorkflowNodeHandler implements PluginHandler {
  readonly slug = 'ai-review-workflow-node';

  async execute(hook: PluginHook, context: PluginHookContext): Promise<PluginHookResult> {
    if (hook !== PluginHook.POST_CODE_GENERATION) {
      return { pluginSlug: this.slug, hook, status: 'ok', message: 'Skipped' };
    }
    return {
      pluginSlug: this.slug,
      hook,
      status: 'ok',
      message: 'AI review workflow node acknowledged',
      data: { taskId: context.taskId },
    };
  }
}

@Injectable()
export class PluginLoaderService {
  private readonly logger = new Logger(PluginLoaderService.name);
  private readonly handlers: Map<string, PluginHandler>;

  constructor(
    @InjectRepository(PluginInstallation)
    private readonly installRepo: Repository<PluginInstallation>,
    riskGate: RiskGateValidatorHandler,
    coverage: CoverageValidatorHandler,
    aiReviewNode: AiReviewWorkflowNodeHandler,
  ) {
    this.handlers = new Map<string, PluginHandler>([
      [riskGate.slug, riskGate],
      [coverage.slug, coverage],
      [aiReviewNode.slug, aiReviewNode],
    ]);
  }

  async listInstalled(organizationId: string) {
    return this.installRepo.find({
      where: { organizationId },
      relations: ['plugin'],
      order: { installedAt: 'DESC' },
    });
  }

  async install(organizationId: string, pluginId: string, config: Record<string, unknown> = {}) {
    const existing = await this.installRepo.findOne({
      where: { organizationId, pluginId },
      relations: ['plugin'],
    });
    if (existing) {
      existing.enabled = true;
      existing.config = { ...existing.config, ...config };
      return this.installRepo.save(existing);
    }
    return this.installRepo.save(
      this.installRepo.create({ organizationId, pluginId, config, enabled: true }),
    );
  }

  async uninstall(organizationId: string, pluginId: string): Promise<void> {
    await this.installRepo.delete({ organizationId, pluginId });
  }

  async setEnabled(organizationId: string, pluginId: string, enabled: boolean) {
    const inst = await this.installRepo.findOne({ where: { organizationId, pluginId } });
    if (!inst) throw new NotFoundException('Plugin not installed');
    inst.enabled = enabled;
    return this.installRepo.save(inst);
  }

  async runHook(
    organizationId: string,
    hook: PluginHook,
    context: Omit<PluginHookContext, 'organizationId'>,
  ): Promise<PluginHookResult[]> {
    const installations = await this.installRepo.find({
      where: { organizationId, enabled: true },
      relations: ['plugin'],
    });

    const results: PluginHookResult[] = [];
    for (const inst of installations) {
      const hooks = (inst.plugin.manifest?.hooks as string[]) || [];
      if (!hooks.includes(hook)) continue;

      const handler = this.handlers.get(inst.plugin.slug);
      if (!handler) {
        this.logger.debug(`No handler for plugin ${inst.plugin.slug}`);
        continue;
      }

      try {
        const result = await handler.execute(hook, {
          organizationId,
          ...context,
          payload: { ...context.payload, ...inst.config },
        });
        results.push(result);
      } catch (error) {
        results.push({
          pluginSlug: inst.plugin.slug,
          hook,
          status: 'fail',
          message: (error as Error).message,
        });
      }
    }
    return results;
  }
}
