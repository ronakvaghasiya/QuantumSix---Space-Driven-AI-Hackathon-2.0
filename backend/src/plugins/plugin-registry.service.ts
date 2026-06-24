import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plugin } from './entities/plugin.entity';
import { PluginType, PluginHook } from './plugin.types';

const BUILTIN_PLUGINS: Array<{
  slug: string;
  name: string;
  type: PluginType;
  description: string;
  manifest: Record<string, unknown>;
}> = [
  {
    slug: 'risk-gate-validator',
    name: 'Risk Gate Validator',
    type: PluginType.VALIDATOR,
    description: 'Warns when task risk score exceeds configured threshold after analysis.',
    manifest: {
      version: '1.0.0',
      hooks: [PluginHook.POST_ANALYSIS],
      configSchema: { riskThreshold: { type: 'number', default: 75 } },
    },
  },
  {
    slug: 'coverage-validator',
    name: 'Coverage Validator',
    type: PluginType.VALIDATOR,
    description: 'Fails validation hook when regression coverage is below minimum.',
    manifest: {
      version: '1.0.0',
      hooks: [PluginHook.POST_VALIDATION],
      configSchema: { minCoverage: { type: 'number', default: 50 } },
    },
  },
  {
    slug: 'ai-review-workflow-node',
    name: 'AI Review Workflow Node',
    type: PluginType.WORKFLOW_NODE,
    description: 'Ensures AI review step is acknowledged in workflow audit trail.',
    manifest: {
      version: '1.0.0',
      hooks: [PluginHook.POST_CODE_GENERATION],
    },
  },
  {
    slug: 'custom-openai-stub',
    name: 'Custom OpenAI Provider (stub)',
    type: PluginType.AI_PROVIDER,
    description: 'Marketplace stub for org-specific AI provider routing.',
    manifest: {
      version: '1.0.0',
      hooks: [],
      provider: 'openai',
    },
  },
];

@Injectable()
export class PluginRegistryService implements OnModuleInit {
  private readonly logger = new Logger(PluginRegistryService.name);

  constructor(
    @InjectRepository(Plugin)
    private readonly pluginRepo: Repository<Plugin>,
  ) {}

  async onModuleInit(): Promise<void> {
    for (const p of BUILTIN_PLUGINS) {
      const existing = await this.pluginRepo.findOne({ where: { slug: p.slug } });
      if (!existing) {
        await this.pluginRepo.save(this.pluginRepo.create(p));
        this.logger.log(`Registered plugin: ${p.slug}`);
      }
    }
  }

  async listCatalog(): Promise<Plugin[]> {
    return this.pluginRepo.find({ order: { name: 'ASC' } });
  }

  async findBySlug(slug: string): Promise<Plugin | null> {
    return this.pluginRepo.findOne({ where: { slug } });
  }
}
