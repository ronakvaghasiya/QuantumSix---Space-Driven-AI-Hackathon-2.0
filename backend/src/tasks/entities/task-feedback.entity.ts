import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Task } from './task.entity';

export type FeedbackGate = 'analysis' | 'code' | 'qa' | 'pr';
export type FeedbackAction = 'approve' | 'reject' | 'request_changes';

@Entity('task_feedback')
export class TaskFeedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_id' })
  taskId: string;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ type: 'varchar' })
  gate: FeedbackGate;

  @Column({ type: 'varchar' })
  action: FeedbackAction;

  @Column({ type: 'varchar', nullable: true })
  reason: string | null;

  @Column({ type: 'text', nullable: true })
  comments: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
