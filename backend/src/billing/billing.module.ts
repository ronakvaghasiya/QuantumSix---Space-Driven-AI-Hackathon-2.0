import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingController } from './billing.controller';
import { BillingService } from './services/billing.service';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { OrganizationSubscription } from './entities/organization-subscription.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { Project } from '../projects/entities/project.entity';
import { OrganizationMember } from '../organizations/entities/organization-member.entity';
import { UsageModule } from '../usage/usage.module';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SubscriptionPlan,
      OrganizationSubscription,
      Organization,
      Project,
      OrganizationMember,
    ]),
    UsageModule,
    RbacModule,
  ],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
