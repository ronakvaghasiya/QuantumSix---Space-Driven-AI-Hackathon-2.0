import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import {
  TaskStatus,
  RiskLevel,
  AgentType,
} from '../../common/enums/task.enum';
import { TaskTimeline } from './task-timeline.entity';
import { TaskAnalysis } from './task-analysis.entity';
import { TaskTest } from './task-test.entity';
import { TaskCodeDiff } from './task-code-diff.entity';
import { TaskValidation } from './task-validation.entity';
import { TaskPullRequest } from './task-pull-request.entity';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_id', unique: true })
  taskId: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @ManyToOne(() => Project, (project) => project.tasks)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ type: 'text' })
  requirement: string;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.PENDING })
  status: TaskStatus;

  @Column({ type: 'enum', enum: RiskLevel, default: RiskLevel.MEDIUM })
  risk: RiskLevel;

  @Column({ name: 'assigned_agent', type: 'enum', enum: AgentType, nullable: true })
  assignedAgent: AgentType | null;

  @Column({ type: 'text', nullable: true })
  acceptanceCriteria: string | null;

  @Column({ type: 'jsonb', nullable: true })
  userStories: string[] | null;

  @Column({ name: 'business_impact', type: 'text', nullable: true })
  businessImpact: string | null;

  @Column({ type: 'jsonb', nullable: true })
  keywords: string[] | null;

  @OneToMany(() => TaskTimeline, (timeline) => timeline.task, { cascade: true })
  timeline: TaskTimeline[];

  @OneToMany(() => TaskAnalysis, (analysis) => analysis.task, { cascade: true })
  analysis: TaskAnalysis[];

  @OneToMany(() => TaskTest, (test) => test.task, { cascade: true })
  tests: TaskTest[];

  @OneToMany(() => TaskCodeDiff, (diff) => diff.task, { cascade: true })
  codeDiffs: TaskCodeDiff[];

  @OneToMany(() => TaskValidation, (validation) => validation.task, { cascade: true })
  validations: TaskValidation[];

  @OneToMany(() => TaskPullRequest, (pr) => pr.task, { cascade: true })
  pullRequests: TaskPullRequest[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
