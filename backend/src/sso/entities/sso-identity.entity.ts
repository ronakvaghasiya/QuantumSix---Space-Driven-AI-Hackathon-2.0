import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { SsoProvider } from './sso-provider.entity';

@Entity('sso_identities')
@Unique(['providerId', 'externalId'])
export class SsoIdentity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'provider_id' })
  providerId: string;

  @ManyToOne(() => SsoProvider, (p) => p.identities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider: SsoProvider;

  @Column({ name: 'external_id' })
  externalId: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
