import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';

@Entity('repository_files')
@Index(['projectId', 'filePath'], { unique: true })
export class RepositoryFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @ManyToOne(() => Project, (project) => project.repositoryFiles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'file_path' })
  filePath: string;

  @Column({ type: 'jsonb', default: [] })
  imports: string[];

  @Column({ type: 'jsonb', default: [] })
  exports: string[];

  @Column({ type: 'jsonb', default: [] })
  functions: string[];

  @Column({ type: 'jsonb', default: [] })
  components: string[];

  @Column({ type: 'jsonb', default: [] })
  hooks: string[];

  @Column({ type: 'jsonb', default: [] })
  contexts: string[];

  @Column({ type: 'jsonb', default: [] })
  services: string[];

  @Column({ type: 'jsonb', default: [] })
  utilities: string[];

  @Column({ name: 'graphql_queries', type: 'jsonb', default: [] })
  graphqlQueries: string[];

  @Column({ type: 'jsonb', default: [] })
  keywords: string[];

  @Column({ name: 'line_count', default: 0 })
  lineCount: number;

  @Column({ name: 'chunk_count', default: 0 })
  chunkCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
