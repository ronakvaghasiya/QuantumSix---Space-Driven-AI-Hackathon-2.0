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
import { DependencyRelationType } from '../../common/enums/project.enum';

@Entity('dependency_edges')
@Index(['projectId', 'sourceFile', 'targetFile', 'relationType'])
export class DependencyEdge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @ManyToOne(() => Project, (project) => project.dependencyEdges, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'source_file' })
  sourceFile: string;

  @Column({ name: 'target_file' })
  targetFile: string;

  @Column({ name: 'relation_type', type: 'enum', enum: DependencyRelationType })
  relationType: DependencyRelationType;

  @Column({ name: 'symbol_name', type: 'varchar', nullable: true })
  symbolName: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
