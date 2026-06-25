import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
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
import { PlatformModule } from './platform/platform.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
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
    PlatformModule,
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
  ],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
