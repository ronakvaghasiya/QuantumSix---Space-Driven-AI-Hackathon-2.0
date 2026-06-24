import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeGraphController } from './knowledge-graph.controller';
import { KnowledgeGraphService } from './services/knowledge-graph.service';
import { DependencyEdge } from '../repository/entities/dependency-edge.entity';
import { Task } from '../tasks/entities/task.entity';
import { TaskAnalysis } from '../tasks/entities/task-analysis.entity';
import { TaskTest } from '../tasks/entities/task-test.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([DependencyEdge, Task, TaskAnalysis, TaskTest]),
  ],
  controllers: [KnowledgeGraphController],
  providers: [KnowledgeGraphService],
  exports: [KnowledgeGraphService],
})
export class KnowledgeGraphModule {}
