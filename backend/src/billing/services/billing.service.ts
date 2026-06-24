import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';
import { OrganizationSubscription } from '../entities/organization-subscription.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { Project } from '../../projects/entities/project.entity';
import { OrganizationMember } from '../../organizations/entities/organization-member.entity';
import { UsageMeterService } from '../../usage/services/usage-meter.service';
import { PlanLimits, isUnlimited } from '../interfaces/plan-limits.interface';
import { QuotaMetric } from '../../common/enums/usage.enum';
import { OrganizationPlan } from '../../common/enums/organization.enum';

const DEFAULT_PLANS: Array<{
  code: OrganizationPlan;
  name: string;
  priceMonthlyCents: number;
  limits: PlanLimits;
}> = [
  {
    code: OrganizationPlan.FREE,
    name: 'Free',
    priceMonthlyCents: 0,
    limits: { projects: 1, repositories: 1, tasksPerMonth: 10, storageMb: 500, users: 2, tokensPerMonth: 50000 },
  },
  {
    code: OrganizationPlan.STARTER,
    name: 'Starter',
    priceMonthlyCents: 2900,
    limits: { projects: 5, repositories: 5, tasksPerMonth: 100, storageMb: 5120, users: 10, tokensPerMonth: 500000 },
  },
  {
    code: OrganizationPlan.PRO,
    name: 'Pro',
    priceMonthlyCents: 9900,
    limits: { projects: 25, repositories: 25, tasksPerMonth: 1000, storageMb: 51200, users: 50, tokensPerMonth: 5000000 },
  },
  {
    code: OrganizationPlan.ENTERPRISE,
    name: 'Enterprise',
    priceMonthlyCents: 0,
    limits: { projects: -1, repositories: -1, tasksPerMonth: -1, storageMb: -1, users: -1, tokensPerMonth: -1 },
  },
];

export interface QuotaCheckResult {
  metric: QuotaMetric;
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
}

@Injectable()
export class BillingService implements OnModuleInit {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectRepository(SubscriptionPlan)
    private readonly planRepo: Repository<SubscriptionPlan>,
    @InjectRepository(OrganizationSubscription)
    private readonly subRepo: Repository<OrganizationSubscription>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(OrganizationMember)
    private readonly memberRepo: Repository<OrganizationMember>,
    private readonly usage: UsageMeterService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    for (const p of DEFAULT_PLANS) {
      let plan = await this.planRepo.findOne({ where: { code: p.code } });
      if (!plan) {
        plan = await this.planRepo.save(
          this.planRepo.create({
            code: p.code,
            name: p.name,
            priceMonthlyCents: p.priceMonthlyCents,
            limits: p.limits,
          }),
        );
        this.logger.log(`Seeded plan: ${p.code}`);
      }
    }

    const orgs = await this.orgRepo.find();
    const freePlan = await this.planRepo.findOne({ where: { code: OrganizationPlan.FREE } });
    if (!freePlan) return;

    for (const org of orgs) {
      const existing = await this.subRepo.findOne({ where: { organizationId: org.id } });
      if (!existing) {
        const planCode = org.plan || OrganizationPlan.FREE;
        const plan = await this.planRepo.findOne({ where: { code: planCode } }) || freePlan;
        await this.subRepo.save(
          this.subRepo.create({
            organizationId: org.id,
            planId: plan.id,
            status: 'active',
          }),
        );
      }
    }
  }

  async getSubscription(organizationId: string) {
    const sub = await this.subRepo.findOne({
      where: { organizationId },
      relations: ['plan'],
    });
    if (!sub) throw new NotFoundException('No subscription for organization');

    return {
      status: sub.status,
      plan: {
        code: sub.plan.code,
        name: sub.plan.name,
        priceMonthlyCents: sub.plan.priceMonthlyCents,
        limits: sub.plan.limits,
      },
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
    };
  }

  async getQuotaSummary(organizationId: string) {
    const sub = await this.getSubscription(organizationId);
    const limits = sub.plan.limits as PlanLimits;
    const usage = await this.usage.getCurrentMonthUsage(organizationId);

    const projectCount = await this.projectRepo.count({ where: { organizationId } });
    const memberCount = await this.memberRepo.count({ where: { organizationId } });
    const tokensUsed = Number(usage.tokensUsed) + Number(usage.requestsUsed) * 100;

    const checks: QuotaCheckResult[] = [
      this.buildQuota(QuotaMetric.PROJECTS, projectCount, limits.projects),
      this.buildQuota(QuotaMetric.TASKS_PER_MONTH, usage.tasksProcessed, limits.tasksPerMonth),
      this.buildQuota(QuotaMetric.TOKENS_PER_MONTH, tokensUsed, limits.tokensPerMonth),
      this.buildQuota(
        QuotaMetric.STORAGE_MB,
        Math.round(Number(usage.storageUsed) / (1024 * 1024)),
        limits.storageMb,
      ),
      this.buildQuota(QuotaMetric.USERS, memberCount, limits.users),
      this.buildQuota(QuotaMetric.REPOSITORIES, projectCount, limits.repositories),
    ];

    return { plan: sub.plan, quotas: checks };
  }

  async getProjectedCost(organizationId: string) {
    const sub = await this.getSubscription(organizationId);
    const usage = await this.usage.getCurrentMonthUsage(organizationId);
    const limits = sub.plan.limits as PlanLimits;
    const tokensUsed = Number(usage.tokensUsed);

    const basePrice = sub.plan.priceMonthlyCents / 100;
    const tokenOverage =
      !isUnlimited(limits.tokensPerMonth) && tokensUsed > limits.tokensPerMonth
        ? ((tokensUsed - limits.tokensPerMonth) / 1000) * 0.002
        : 0;

    return {
      currency: 'USD',
      baseMonthly: basePrice,
      projectedOverage: Math.round(tokenOverage * 100) / 100,
      projectedTotal: Math.round((basePrice + tokenOverage) * 100) / 100,
      note: 'Overage estimate for token usage beyond plan limit (Pro/Enterprise may vary).',
    };
  }

  async assertQuota(organizationId: string, metric: QuotaMetric): Promise<void> {
    if (this.config.get('AUTH_ENABLED', 'false') !== 'true') {
      return;
    }
    const summary = await this.getQuotaSummary(organizationId);
    const check = summary.quotas.find((q) => q.metric === metric);
    if (check && !check.allowed) {
      throw new ForbiddenException(
        `Plan limit reached for ${metric}. Used ${check.used}/${check.limit}. Upgrade your plan.`,
      );
    }
  }

  async upgradePlan(organizationId: string, planCode: string) {
    const plan = await this.planRepo.findOne({ where: { code: planCode } });
    if (!plan) throw new NotFoundException(`Plan ${planCode} not found`);

    let sub = await this.subRepo.findOne({ where: { organizationId } });
    if (sub) {
      sub.planId = plan.id;
      sub.status = 'active';
      await this.subRepo.save(sub);
    } else {
      sub = await this.subRepo.save(
        this.subRepo.create({ organizationId, planId: plan.id, status: 'active' }),
      );
    }

    await this.orgRepo.update(organizationId, { plan: planCode as OrganizationPlan });
    return this.getSubscription(organizationId);
  }

  private buildQuota(metric: QuotaMetric, used: number, limit: number): QuotaCheckResult {
    if (isUnlimited(limit)) {
      return { metric, allowed: true, used, limit: -1, remaining: -1 };
    }
    const remaining = Math.max(0, limit - used);
    return {
      metric,
      allowed: used < limit,
      used,
      limit,
      remaining,
    };
  }
}
