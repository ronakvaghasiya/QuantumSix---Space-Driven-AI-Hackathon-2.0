import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Task } from './task.entity';

@Entity('task_tests')
export class TaskTest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_id' })
  taskId: string;

  @ManyToOne(() => Task, (task) => task.tests)
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ name: 'functional_tests', type: 'jsonb', default: [] })
  functionalTests: { name: string; passed: boolean }[];

  @Column({ name: 'edge_cases', type: 'jsonb', default: [] })
  edgeCases: string[];

  @Column({ name: 'regression_cases', type: 'jsonb', default: [] })
  regressionCases: string[];

  @Column({ name: 'playwright_specs', type: 'jsonb', default: [] })
  playwrightSpecs: { filename: string; content: string }[];

  @Column({ name: 'regression_coverage', type: 'float', default: 0 })
  regressionCoverage: number;

  @Column({ name: 'qa_test_cases', type: 'jsonb', nullable: true })
  qaTestCases: {
    id: string;
    title: string;
    category: string;
    priority: string;
    preconditions: string;
    steps: string[];
    expectedResult: string;
    actualResult?: string;
    status: string;
    relatedFiles?: string[];
    linkedRequirement?: string;
    verificationMethod?: string;
  }[] | null;

  @Column({ name: 'qa_summary', type: 'text', nullable: true })
  qaSummary: string | null;

  @Column({ name: 'qa_verified_at', type: 'timestamp', nullable: true })
  qaVerifiedAt: Date | null;

  @Column({ name: 'qa_generated_at', type: 'timestamp', nullable: true })
  qaGeneratedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
