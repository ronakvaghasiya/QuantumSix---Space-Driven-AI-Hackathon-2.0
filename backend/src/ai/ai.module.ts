import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from '../projects/entities/project.entity';
import { SettingsModule } from '../settings/settings.module';
import { ProjectAiService } from './project-ai.service';

@Module({
  imports: [TypeOrmModule.forFeature([Project]), SettingsModule],
  providers: [ProjectAiService],
  exports: [ProjectAiService],
})
export class AiModule {}
