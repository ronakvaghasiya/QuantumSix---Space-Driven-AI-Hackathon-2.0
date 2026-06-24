import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { Plugin } from './plugin.entity';

@Entity('plugin_installations')
@Unique(['organizationId', 'pluginId'])
export class PluginInstallation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'plugin_id' })
  pluginId: string;

  @ManyToOne(() => Plugin, (p) => p.installations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plugin_id' })
  plugin: Plugin;

  @Column({ type: 'jsonb', default: {} })
  config: Record<string, unknown>;

  @Column({ default: true })
  enabled: boolean;

  @Column({ name: 'installed_at', type: 'timestamptz', default: () => 'NOW()' })
  installedAt: Date;
}
