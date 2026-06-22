import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Task } from './task.entity';

@Entity('task_pull_requests')
export class TaskPullRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_id' })
  taskId: string;

  @ManyToOne(() => Task, (task) => task.pullRequests)
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ name: 'branch_name' })
  branchName: string;

  @Column({ name: 'commit_sha', type: 'varchar', nullable: true })
  commitSha: string | null;

  @Column({ name: 'pr_url', type: 'varchar', nullable: true })
  prUrl: string | null;

  @Column({ name: 'pr_number', type: 'int', nullable: true })
  prNumber: number | null;

  @Column({ name: 'review_status', default: 'open' })
  reviewStatus: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
