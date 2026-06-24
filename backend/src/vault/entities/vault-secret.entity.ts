import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';

@Entity('secrets_vault')
@Unique(['organizationId', 'keyName'])
export class VaultSecret {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'key_name' })
  keyName: string;

  @Column({ name: 'encrypted_value', type: 'text' })
  encryptedValue: string;

  @Column()
  iv: string;

  @Column({ name: 'key_version', default: 1 })
  keyVersion: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
