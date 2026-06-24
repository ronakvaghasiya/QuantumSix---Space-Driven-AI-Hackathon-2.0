import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import {
  AgentOrderConfig,
  ApprovalGatesConfig,
  NotificationRulesConfig,
  ValidationRulesConfig,
} from '../workflow-config.types';

@Entity('workflow_configs')
export class WorkflowConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', unique: true })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'approval_gates', type: 'jsonb' })
  approvalGates: ApprovalGatesConfig;

  @Column({ name: 'agent_order', type: 'jsonb', default: {} })
  agentOrder: AgentOrderConfig;

  @Column({ name: 'notification_rules', type: 'jsonb', default: {} })
  notificationRules: NotificationRulesConfig;

  @Column({ name: 'validation_rules', type: 'jsonb' })
  validationRules: ValidationRulesConfig;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
