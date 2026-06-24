import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { NotificationChannel } from './notification-channel.entity';
import { NotificationDeliveryStatus } from '../enums/notification.enum';

@Entity('notification_deliveries')
export class NotificationDelivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'channel_id', type: 'uuid', nullable: true })
  channelId: string | null;

  @ManyToOne(() => NotificationChannel, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'channel_id' })
  channel: NotificationChannel | null;

  @Column({ name: 'event_type' })
  eventType: string;

  @Column({ name: 'channel_type' })
  channelType: string;

  @Column({ default: NotificationDeliveryStatus.PENDING })
  status: string;

  @Column({ type: 'varchar', nullable: true })
  subject: string | null;

  @Column({ type: 'text', nullable: true })
  body: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
