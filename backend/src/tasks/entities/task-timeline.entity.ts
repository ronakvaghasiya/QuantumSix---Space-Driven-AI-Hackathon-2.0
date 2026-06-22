import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Task } from './task.entity';
import { TimelineStep, TimelineStepStatus } from '../../common/enums/task.enum';

@Entity('task_timeline')
export class TaskTimeline {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_id' })
  taskId: string;

  @ManyToOne(() => Task, (task) => task.timeline)
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ type: 'enum', enum: TimelineStep })
  step: TimelineStep;

  @Column({ type: 'enum', enum: TimelineStepStatus, default: TimelineStepStatus.PENDING })
  status: TimelineStepStatus;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
