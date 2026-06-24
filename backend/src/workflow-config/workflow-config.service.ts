import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowConfig } from './entities/workflow-config.entity';
import {
  ApprovalGatesConfig,
  DEFAULT_APPROVAL_GATES,
  DEFAULT_VALIDATION_RULES,
  ValidationRulesConfig,
  AgentOrderConfig,
  NotificationRulesConfig,
} from './workflow-config.types';

@Injectable()
export class WorkflowConfigService {
  constructor(
    @InjectRepository(WorkflowConfig)
    private readonly configRepo: Repository<WorkflowConfig>,
  ) {}

  async getForOrganization(organizationId: string): Promise<WorkflowConfig> {
    let config = await this.configRepo.findOne({ where: { organizationId } });
    if (!config) {
      config = await this.configRepo.save(
        this.configRepo.create({
          organizationId,
          approvalGates: { ...DEFAULT_APPROVAL_GATES },
          validationRules: { ...DEFAULT_VALIDATION_RULES },
          agentOrder: {},
          notificationRules: {},
        }),
      );
    }
    return config;
  }

  async update(
    organizationId: string,
    data: {
      approvalGates?: Partial<ApprovalGatesConfig>;
      validationRules?: Partial<ValidationRulesConfig>;
      agentOrder?: AgentOrderConfig;
      notificationRules?: NotificationRulesConfig;
    },
  ): Promise<WorkflowConfig> {
    const config = await this.getForOrganization(organizationId);
    if (data.approvalGates) {
      config.approvalGates = { ...config.approvalGates, ...data.approvalGates };
    }
    if (data.validationRules) {
      config.validationRules = { ...config.validationRules, ...data.validationRules };
    }
    if (data.agentOrder) config.agentOrder = data.agentOrder;
    if (data.notificationRules) config.notificationRules = data.notificationRules;
    return this.configRepo.save(config);
  }

  async requiresAnalysisApproval(
    organizationId: string,
    riskScore?: number,
  ): Promise<boolean> {
    const config = await this.getForOrganization(organizationId);
    if (!config.approvalGates.analysis) return false;
    const max = config.approvalGates.riskAutoApproveMaxScore;
    if (max != null && riskScore != null && riskScore <= max) return false;
    return true;
  }

  async requiresCodeApproval(organizationId: string): Promise<boolean> {
    const config = await this.getForOrganization(organizationId);
    return config.approvalGates.code !== false;
  }

  async requiresPrApproval(organizationId: string): Promise<boolean> {
    const config = await this.getForOrganization(organizationId);
    return config.approvalGates.pr !== false;
  }

  async isStepDisabled(organizationId: string, step: string): Promise<boolean> {
    const config = await this.getForOrganization(organizationId);
    return config.agentOrder.disabledSteps?.includes(step) ?? false;
  }

  async getValidationRules(organizationId: string): Promise<ValidationRulesConfig> {
    const config = await this.getForOrganization(organizationId);
    return config.validationRules;
  }
}
