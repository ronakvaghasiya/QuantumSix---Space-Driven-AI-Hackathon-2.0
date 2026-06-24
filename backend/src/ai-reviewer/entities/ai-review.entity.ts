import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Task } from '../../tasks/entities/task.entity';

export interface AiReviewFinding {
  category: 'bug' | 'performance' | 'security' | 'testing' | 'smell';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  detail: string;
  filePath?: string;
}

@Entity('ai_reviews')
export class AiReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_id' })
  taskId: string;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ name: 'overall_score', type: 'float', default: 0 })
  overallScore: number;

  @Column({ type: 'jsonb', default: [] })
  findings: AiReviewFinding[];

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
