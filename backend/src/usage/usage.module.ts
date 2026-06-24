import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsageController } from './usage.controller';
import { UsageMeterService } from './services/usage-meter.service';
import { UsageEvent } from './entities/usage-event.entity';
import { UsageMetric } from './entities/usage-metric.entity';
import { Project } from '../projects/entities/project.entity';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [TypeOrmModule.forFeature([UsageEvent, UsageMetric, Project]), RbacModule],
  controllers: [UsageController],
  providers: [UsageMeterService],
  exports: [UsageMeterService],
})
export class UsageModule {}
