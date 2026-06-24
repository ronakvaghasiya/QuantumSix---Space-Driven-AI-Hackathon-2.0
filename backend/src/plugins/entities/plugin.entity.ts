import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { PluginInstallation } from './plugin-installation.entity';
import { PluginType } from '../plugin.types';

@Entity('plugins')
export class Plugin {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  name: string;

  @Column({ type: 'varchar' })
  type: PluginType;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'jsonb', default: {} })
  manifest: Record<string, unknown>;

  @OneToMany(() => PluginInstallation, (i) => i.plugin)
  installations: PluginInstallation[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
