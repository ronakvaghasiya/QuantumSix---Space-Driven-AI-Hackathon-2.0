import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';

@Entity('reindex_events')
export class ReindexEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'trigger_source' })
  triggerSource: string;

  @Column({ type: 'varchar', nullable: true })
  branch: string | null;

  @Column({ name: 'commit_sha', type: 'varchar', nullable: true })
  commitSha: string | null;

  @Column({ name: 'changed_files', type: 'jsonb', default: [] })
  changedFiles: string[];

  @Column({ default: 'pending' })
  status: string;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
