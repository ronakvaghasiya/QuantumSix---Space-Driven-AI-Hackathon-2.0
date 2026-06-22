import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Task } from './task.entity';

@Entity('task_code_diffs')
export class TaskCodeDiff {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_id' })
  taskId: string;

  @ManyToOne(() => Task, (task) => task.codeDiffs)
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ name: 'implementation_plan', type: 'text', nullable: true })
  implementationPlan: string | null;

  @Column({ name: 'files_to_modify', type: 'jsonb', default: [] })
  filesToModify: { path: string; changes: string[] }[];

  @Column({ name: 'file_edits', type: 'jsonb', nullable: true })
  fileEdits: { path: string; originalContent?: string; newContent: string; changeComments: string[] }[] | null;

  @Column({ type: 'text', nullable: true })
  diff: string | null;

  @Column({ name: 'patch_content', type: 'text', nullable: true })
  patchContent: string | null;

  @Column({ default: 'pending' })
  approvalStatus: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
