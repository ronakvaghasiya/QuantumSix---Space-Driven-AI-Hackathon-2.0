import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { VcsAuthType } from '../../common/enums/project.enum';

@Entity('gitlab_connections')
export class GitLabConnection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: VcsAuthType })
  authType: VcsAuthType;

  @Column({ name: 'access_token', type: 'text' })
  accessToken: string;

  @Column({ name: 'refresh_token', type: 'text', nullable: true })
  refreshToken: string | null;

  @Column({ name: 'gitlab_username', type: 'varchar', nullable: true })
  gitlabUsername: string | null;

  @Column({ name: 'gitlab_user_id', type: 'varchar', nullable: true })
  gitlabUserId: string | null;

  @Column({ name: 'gitlab_base_url', default: 'https://gitlab.com' })
  gitlabBaseUrl: string;

  @Column({ type: 'text', nullable: true })
  scopes: string | null;

  @Column({ name: 'token_expires_at', type: 'timestamptz', nullable: true })
  tokenExpiresAt: Date | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
