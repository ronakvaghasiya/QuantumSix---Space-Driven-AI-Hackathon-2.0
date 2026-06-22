import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { IndexingJobStatus } from '../../common/enums/project.enum';

@Entity('indexing_jobs')
export class IndexingJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @ManyToOne(() => Project, (project) => project.indexingJobs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ type: 'enum', enum: IndexingJobStatus, default: IndexingJobStatus.PENDING })
  status: IndexingJobStatus;

  @Column({ type: 'float', default: 0 })
  progress: number;

  @Column({ name: 'current_step', type: 'varchar', nullable: true })
  currentStep: string | null;

  @Column({ name: 'total_files', default: 0 })
  totalFiles: number;

  @Column({ name: 'processed_files', default: 0 })
  processedFiles: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
