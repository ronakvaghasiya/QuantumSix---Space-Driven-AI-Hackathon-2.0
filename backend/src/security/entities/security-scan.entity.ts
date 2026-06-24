import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Task } from '../../tasks/entities/task.entity';

@Entity('security_scans')
export class SecurityScan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_id' })
  taskId: string;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ default: 'pass' })
  status: string;

  @Column({ name: 'secrets_found', default: 0 })
  secretsFound: number;

  @Column({ type: 'jsonb', default: [] })
  vulnerabilities: Record<string, unknown>[];

  @Column({ name: 'unsafe_patterns', type: 'jsonb', default: [] })
  unsafePatterns: Record<string, unknown>[];

  @Column({ name: 'blocked_pr', default: false })
  blockedPr: boolean;

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @CreateDateColumn({ name: 'scanned_at' })
  scannedAt: Date;
}
