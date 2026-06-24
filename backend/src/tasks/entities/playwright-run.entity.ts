import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Task } from './task.entity';

@Entity('playwright_runs')
export class PlaywrightRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_id' })
  taskId: string;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ name: 'spec_path' })
  specPath: string;

  @Column({ default: 'skipped' })
  status: string;

  @Column({ name: 'duration_ms', type: 'int', nullable: true })
  durationMs: number | null;

  @Column({ name: 'error_log', type: 'text', nullable: true })
  errorLog: string | null;

  @Column({ name: 'screenshot_path', type: 'varchar', nullable: true })
  screenshotPath: string | null;

  @Column({ name: 'video_path', type: 'varchar', nullable: true })
  videoPath: string | null;

  @Column({ name: 'html_report_path', type: 'varchar', nullable: true })
  htmlReportPath: string | null;

  @CreateDateColumn({ name: 'ran_at' })
  ranAt: Date;
}
