import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';

@Entity('repository_memory_snapshots')
export class RepositoryMemorySnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'commit_sha', type: 'varchar', nullable: true })
  commitSha: string | null;

  @Column({ type: 'varchar', nullable: true })
  branch: string | null;

  @Column({ name: 'files_count', default: 0 })
  filesCount: number;

  @Column({ name: 'chunks_count', default: 0 })
  chunksCount: number;

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
