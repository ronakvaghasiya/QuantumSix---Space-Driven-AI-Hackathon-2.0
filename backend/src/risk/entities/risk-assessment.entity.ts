import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Task } from '../../tasks/entities/task.entity';

export interface RiskFactors {
  llmRisk: number;
  impactedFiles: number;
  dependencyDepth: number;
  securityExposure: number;
  similarTaskFailureRate: number;
  details?: Record<string, unknown>;
}

@Entity('risk_assessments')
export class RiskAssessment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_id' })
  taskId: string;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ name: 'overall_score', type: 'float', default: 0 })
  overallScore: number;

  @Column({ name: 'risk_level', default: 'medium' })
  riskLevel: string;

  @Column({ type: 'jsonb', default: {} })
  factors: RiskFactors;

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @Column({ name: 'computed_at', type: 'timestamptz', default: () => 'NOW()' })
  computedAt: Date;
}
