import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Task } from '../../tasks/entities/task.entity';

@Entity('task_memory')
export class TaskMemory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_id' })
  taskId: string;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ name: 'project_id' })
  projectId: string;

  @Column({ type: 'text' })
  requirement: string;

  @Column({ default: 'pending' })
  outcome: string;

  @Column({ name: 'risk_level', type: 'varchar', nullable: true })
  riskLevel: string | null;

  @Column({ name: 'impacted_files', type: 'jsonb', default: [] })
  impactedFiles: string[];

  @Column({ type: 'jsonb', nullable: true })
  lessons: Record<string, unknown> | null;

  @Column({ name: 'qdrant_point_id', type: 'varchar', nullable: true })
  qdrantPointId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
