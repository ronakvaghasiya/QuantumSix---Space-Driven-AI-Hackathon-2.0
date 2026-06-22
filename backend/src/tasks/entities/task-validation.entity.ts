import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Task } from './task.entity';

@Entity('task_validations')
export class TaskValidation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_id' })
  taskId: string;

  @ManyToOne(() => Task, (task) => task.validations)
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ name: 'lint_status', default: 'pending' })
  lintStatus: string;

  @Column({ name: 'prettier_status', default: 'pending' })
  prettierStatus: string;

  @Column({ name: 'build_status', default: 'pending' })
  buildStatus: string;

  @Column({ name: 'playwright_passed', default: 0 })
  playwrightPassed: number;

  @Column({ name: 'playwright_failed', default: 0 })
  playwrightFailed: number;

  @Column({ type: 'float', default: 0 })
  coverage: number;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
