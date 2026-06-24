import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plugin } from './entities/plugin.entity';
import { PluginInstallation } from './entities/plugin-installation.entity';
import { PluginRegistryService } from './plugin-registry.service';
import {
  PluginLoaderService,
  RiskGateValidatorHandler,
  CoverageValidatorHandler,
  AiReviewWorkflowNodeHandler,
} from './plugin-loader.service';
import { PluginsController } from './plugins.controller';
import { RiskAssessment } from '../risk/entities/risk-assessment.entity';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Plugin, PluginInstallation, RiskAssessment]),
    RbacModule,
  ],
  controllers: [PluginsController],
  providers: [
    PluginRegistryService,
    PluginLoaderService,
    RiskGateValidatorHandler,
    CoverageValidatorHandler,
    AiReviewWorkflowNodeHandler,
  ],
  exports: [PluginLoaderService, PluginRegistryService],
})
export class PluginsModule {}
