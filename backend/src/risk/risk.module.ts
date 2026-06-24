import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RiskController } from './risk.controller';
import { RiskAssessment } from './entities/risk-assessment.entity';
import { RiskEngineService } from './services/risk-engine.service';
import { Task } from '../tasks/entities/task.entity';
import { TaskAnalysis } from '../tasks/entities/task-analysis.entity';
import { MemoryModule } from '../memory/memory.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RiskAssessment, Task, TaskAnalysis]),
    forwardRef(() => MemoryModule),
    AuditModule,
  ],
  controllers: [RiskController],
  providers: [RiskEngineService],
  exports: [RiskEngineService],
})
export class RiskModule {}
