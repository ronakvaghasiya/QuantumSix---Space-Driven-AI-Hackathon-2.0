import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';

@Entity('usage_metrics')
@Index(['organizationId', 'year', 'month'], { unique: true })
export class UsageMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'int' })
  month: number;

  @Column({ name: 'tokens_used', type: 'bigint', default: 0 })
  tokensUsed: number;

  @Column({ name: 'requests_used', type: 'bigint', default: 0 })
  requestsUsed: number;

  @Column({ name: 'tasks_processed', type: 'int', default: 0 })
  tasksProcessed: number;

  @Column({ name: 'storage_used', type: 'bigint', default: 0 })
  storageUsed: number;

  @Column({ name: 'playwright_runs', type: 'int', default: 0 })
  playwrightRuns: number;
}
