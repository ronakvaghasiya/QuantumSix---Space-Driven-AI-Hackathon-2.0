import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { PlanLimits } from '../interfaces/plan-limits.interface';
import { OrganizationSubscription } from './organization-subscription.entity';

@Entity('subscription_plans')
export class SubscriptionPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ name: 'price_monthly_cents', default: 0 })
  priceMonthlyCents: number;

  @Column({ type: 'jsonb', default: {} })
  limits: PlanLimits;

  @OneToMany(() => OrganizationSubscription, (s) => s.plan)
  subscriptions: OrganizationSubscription[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
