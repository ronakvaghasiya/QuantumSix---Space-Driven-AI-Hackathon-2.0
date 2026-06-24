import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { ReportsModule } from './reports/reports.module';
import { RepositoryModule } from './repository/repository.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { HealthModule } from './health/health.module';
import { SeedModule } from './seed/seed.module';
import { GitLabModule } from './gitlab/gitlab.module';
import { SettingsModule } from './settings/settings.module';
import { MemoryModule } from './memory/memory.module';
import { RiskModule } from './risk/risk.module';
import { KnowledgeGraphModule } from './knowledge-graph/knowledge-graph.module';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { RbacModule } from './rbac/rbac.module';
import { TenancyModule } from './tenancy/tenancy.module';
import { UsageModule } from './usage/usage.module';
import { BillingModule } from './billing/billing.module';
import { NotificationModule } from './notifications/notification.module';
import { AiReviewerModule } from './ai-reviewer/ai-reviewer.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ReleasesModule } from './releases/releases.module';
import { VaultModule } from './vault/vault.module';
import { SessionsModule } from './sessions/sessions.module';
import { SsoModule } from './sso/sso.module';
import { WorkflowConfigModule } from './workflow-config/workflow-config.module';
import { PluginsModule } from './plugins/plugins.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TenancyModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: process.env.NODE_ENV !== 'production',
      }),
    }),
    AuthModule,
    OrganizationsModule,
    RbacModule,
    ProjectsModule,
    TasksModule,
    ReportsModule,
    RepositoryModule,
    WebhooksModule,
    HealthModule,
    SeedModule,
    GitLabModule,
    SettingsModule,
    MemoryModule,
    RiskModule,
    KnowledgeGraphModule,
    UsageModule,
    BillingModule,
    NotificationModule,
    AiReviewerModule,
    AnalyticsModule,
    ReleasesModule,
    VaultModule,
    SessionsModule,
    SsoModule,
    WorkflowConfigModule,
    PluginsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
