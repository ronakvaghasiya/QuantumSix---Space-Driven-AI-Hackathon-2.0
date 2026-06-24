import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { OrganizationPlan } from '../../common/enums/organization.enum';
import { OrganizationMember } from './organization-member.entity';
import { Project } from '../../projects/entities/project.entity';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'varchar', default: OrganizationPlan.FREE })
  plan: OrganizationPlan;

  @Column({ type: 'jsonb', default: {} })
  settings: Record<string, unknown>;

  @OneToMany(() => OrganizationMember, (m) => m.organization)
  members: OrganizationMember[];

  @OneToMany(() => Project, (p) => p.organization)
  projects: Project[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
