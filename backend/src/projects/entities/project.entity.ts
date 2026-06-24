import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Task } from '../../tasks/entities/task.entity';
import { ProjectStatus, Framework, Language } from '../../common/enums/project.enum';
import { AiProvider } from '../../common/enums/ai.enum';
import { RepositoryFile } from '../../repository/entities/repository-file.entity';
import { DependencyEdge } from '../../repository/entities/dependency-edge.entity';
import { IndexingJob } from '../../repository/entities/indexing-job.entity';
import { Organization } from '../../organizations/entities/organization.entity';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', nullable: true })
  organizationId: string | null;

  @ManyToOne(() => Organization, (org) => org.projects, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column()
  name: string;

  @Column({ name: 'repository_url' })
  repositoryUrl: string;

  @Column({ name: 'default_branch', default: 'main' })
  defaultBranch: string;

  @Column({ type: 'enum', enum: Framework, default: Framework.OTHER })
  framework: Framework;

  @Column({ type: 'enum', enum: Language, default: Language.OTHER })
  language: Language;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: ProjectStatus, default: ProjectStatus.PENDING })
  status: ProjectStatus;

  @Column({ name: 'files_indexed', default: 0 })
  filesIndexed: number;

  @Column({ name: 'indexing_progress', type: 'float', default: 0 })
  indexingProgress: number;

  @Column({ name: 'last_scan_at', type: 'timestamptz', nullable: true })
  lastScanAt: Date | null;

  @Column({ name: 'github_repo_id', type: 'varchar', nullable: true })
  githubRepoId: string | null;

  @Column({ name: 'github_owner', type: 'varchar', nullable: true })
  githubOwner: string | null;

  @Column({ name: 'github_repo_name', type: 'varchar', nullable: true })
  githubRepoName: string | null;

  @Column({ name: 'clone_path', type: 'varchar', nullable: true })
  clonePath: string | null;

  @Column({ name: 'indexing_error', type: 'text', nullable: true })
  indexingError: string | null;

  @Column({ name: 'ai_provider', type: 'enum', enum: AiProvider, default: AiProvider.OPENAI })
  aiProvider: AiProvider;

  @Column({ name: 'ai_model', type: 'varchar', nullable: true })
  aiModel: string | null;

  @Column({ name: 'ai_temperature', type: 'float', default: 0.2 })
  aiTemperature: number;

  @Column({ name: 'ai_max_tokens', type: 'int', default: 4096 })
  aiMaxTokens: number;

  @Column({ name: 'vcs_provider', type: 'varchar', default: 'gitlab' })
  vcsProvider: string;

  @Column({ name: 'last_commit_sha', type: 'varchar', nullable: true })
  lastCommitSha: string | null;

  @Column({ name: 'auto_reindex_enabled', default: true })
  autoReindexEnabled: boolean;

  @Column({ name: 'last_reindex_at', type: 'timestamptz', nullable: true })
  lastReindexAt: Date | null;

  @OneToMany(() => Task, (task) => task.project)
  tasks: Task[];

  @OneToMany(() => RepositoryFile, (file) => file.project)
  repositoryFiles: RepositoryFile[];

  @OneToMany(() => DependencyEdge, (edge) => edge.project)
  dependencyEdges: DependencyEdge[];

  @OneToMany(() => IndexingJob, (job) => job.project)
  indexingJobs: IndexingJob[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
