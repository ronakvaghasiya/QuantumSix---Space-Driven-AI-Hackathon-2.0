import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RepositoryController } from './repository.controller';
import { IndexingService } from './services/indexing.service';
import { ScannerService } from './services/scanner.service';
import { EmbeddingService } from './services/embedding.service';
import { DependencyGraphService } from './services/dependency-graph.service';
import { RepositorySearchService } from './services/repository-search.service';
import { Project } from '../projects/entities/project.entity';
import { RepositoryFile } from './entities/repository-file.entity';
import { DependencyEdge } from './entities/dependency-edge.entity';
import { IndexingJob } from './entities/indexing-job.entity';
import { GitLabModule } from '../gitlab/gitlab.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      RepositoryFile,
      DependencyEdge,
      IndexingJob,
    ]),
    GitLabModule,
  ],
  controllers: [RepositoryController],
  providers: [
    IndexingService,
    ScannerService,
    EmbeddingService,
    DependencyGraphService,
    RepositorySearchService,
  ],
  exports: [IndexingService, RepositorySearchService, EmbeddingService],
})
export class RepositoryModule {}
