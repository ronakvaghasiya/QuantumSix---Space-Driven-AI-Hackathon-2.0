import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { Project } from '../../projects/entities/project.entity';
import { Task } from '../../tasks/entities/task.entity';

export interface ReleaseChangelogEntry {
  type: 'feature' | 'fix' | 'refactor' | 'chore' | 'docs';
  description: string;
  taskId?: string;
  filePath?: string;
}

@Entity('releases')
export class Release {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'project_id' })
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'task_id', type: 'uuid', nullable: true })
  taskId: string | null;

  @ManyToOne(() => Task, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'task_id' })
  task: Task | null;

  @Column({ name: 'version_tag' })
  versionTag: string;

  @Column({ name: 'merge_commit_sha', type: 'varchar', nullable: true })
  mergeCommitSha: string | null;

  @Column({ name: 'release_notes', type: 'text', nullable: true })
  releaseNotes: string | null;

  @Column({ name: 'sprint_summary', type: 'text', nullable: true })
  sprintSummary: string | null;

  @Column({ type: 'jsonb', default: [] })
  changelog: ReleaseChangelogEntry[];

  @Column({ name: 'impact_summary', type: 'jsonb', default: {} })
  impactSummary: Record<string, unknown>;

  @Column({ name: 'risk_summary', type: 'jsonb', default: {} })
  riskSummary: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
