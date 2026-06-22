import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Task } from './task.entity';

@Entity('task_analysis')
export class TaskAnalysis {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_id' })
  taskId: string;

  @ManyToOne(() => Task, (task) => task.analysis)
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ name: 'impacted_files', type: 'jsonb', default: [] })
  impactedFiles: { path: string; confidence: number }[];

  @Column({ name: 'regression_areas', type: 'jsonb', default: [] })
  regressionAreas: string[];

  @Column({ name: 'dependency_graph', type: 'jsonb', nullable: true })
  dependencyGraph: Record<string, string[]> | null;

  @Column({ name: 'api_dependencies', type: 'jsonb', default: [] })
  apiDependencies: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
