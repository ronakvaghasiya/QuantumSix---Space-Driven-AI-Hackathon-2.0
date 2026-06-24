import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MemoryController } from './memory.controller';
import { RepositoryMemorySnapshot } from './entities/repository-memory-snapshot.entity';
import { TaskMemory } from './entities/task-memory.entity';
import { ReindexEvent } from './entities/reindex-event.entity';
import { RepositoryMemoryService } from './services/repository-memory.service';
import { TaskMemoryService } from './services/task-memory.service';
import { SimilarTaskService } from './services/similar-task.service';
import { AutoReindexService } from './services/auto-reindex.service';
import { RepositoryModule } from '../repository/repository.module';
import { AuditModule } from '../audit/audit.module';
import { Task } from '../tasks/entities/task.entity';
import { TaskAnalysis } from '../tasks/entities/task-analysis.entity';
import { Project } from '../projects/entities/project.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RepositoryMemorySnapshot,
      TaskMemory,
      ReindexEvent,
      Task,
      TaskAnalysis,
      Project,
    ]),
    forwardRef(() => RepositoryModule),
    AuditModule,
  ],
  controllers: [MemoryController],
  providers: [
    RepositoryMemoryService,
    TaskMemoryService,
    SimilarTaskService,
    AutoReindexService,
  ],
  exports: [
    RepositoryMemoryService,
    TaskMemoryService,
    SimilarTaskService,
    AutoReindexService,
  ],
})
export class MemoryModule {}
