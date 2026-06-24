import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationChannel } from './entities/notification-channel.entity';
import { NotificationDelivery } from './entities/notification-delivery.entity';
import {
  NotificationChannelType,
  NotificationDeliveryStatus,
  NotificationEventType,
} from './enums/notification.enum';
import {
  buildNotificationTemplate,
  NotificationContext,
} from './templates/notification.templates';
import { EmailChannelAdapter } from './adapters/email.adapter';
import { SlackChannelAdapter, TeamsChannelAdapter } from './adapters/webhook.adapter';
import { Task } from '../tasks/entities/task.entity';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(NotificationChannel)
    private readonly channelRepo: Repository<NotificationChannel>,
    @InjectRepository(NotificationDelivery)
    private readonly deliveryRepo: Repository<NotificationDelivery>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    private readonly email: EmailChannelAdapter,
    private readonly slack: SlackChannelAdapter,
    private readonly teams: TeamsChannelAdapter,
    private readonly config: ConfigService,
  ) {}

  async notifyTask(
    taskId: string,
    event: NotificationEventType,
    extra: Partial<NotificationContext> = {},
  ): Promise<void> {
    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: ['project'],
    });
    if (!task?.project?.organizationId) return;

    const ctx: NotificationContext = {
      taskId,
      taskHumanId: task.taskId,
      projectName: task.project.name,
      requirement: task.requirement,
      appUrl: this.config.get('FRONTEND_URL') || 'http://localhost:3000',
      ...extra,
    };

    await this.notifyOrganization(task.project.organizationId, event, ctx);
  }

  async notifyOrganization(
    organizationId: string,
    event: NotificationEventType,
    ctx: NotificationContext,
  ): Promise<void> {
    const template = buildNotificationTemplate(event, ctx);
    const channels = await this.channelRepo.find({
      where: { organizationId, enabled: true },
    });

    const targets = channels.length > 0 ? channels : this.envFallbackChannels(organizationId);

    for (const channel of targets) {
      if (!this.channelSubscribed(channel, event)) continue;
      await this.deliver(channel, organizationId, event, template);
    }
  }

  async listChannels(organizationId: string): Promise<NotificationChannel[]> {
    return this.channelRepo.find({
      where: { organizationId },
      order: { createdAt: 'ASC' },
    });
  }

  async createChannel(
    organizationId: string,
    data: Pick<NotificationChannel, 'type' | 'name' | 'config' | 'enabled'>,
  ): Promise<NotificationChannel> {
    return this.channelRepo.save(
      this.channelRepo.create({ organizationId, ...data }),
    );
  }

  async updateChannel(
    organizationId: string,
    channelId: string,
    data: Partial<Pick<NotificationChannel, 'name' | 'config' | 'enabled'>>,
  ): Promise<NotificationChannel> {
    const channel = await this.channelRepo.findOne({
      where: { id: channelId, organizationId },
    });
    if (!channel) throw new Error('Channel not found');
    Object.assign(channel, data);
    return this.channelRepo.save(channel);
  }

  async deleteChannel(organizationId: string, channelId: string): Promise<void> {
    await this.channelRepo.delete({ id: channelId, organizationId });
  }

  async listDeliveries(organizationId: string, limit = 50): Promise<NotificationDelivery[]> {
    return this.deliveryRepo.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  private channelSubscribed(
    channel: Pick<NotificationChannel, 'config'>,
    event: NotificationEventType,
  ): boolean {
    const events = channel.config?.events as string[] | undefined;
    if (!events?.length) return true;
    return events.includes(event);
  }

  private envFallbackChannels(organizationId: string): Pick<
    NotificationChannel,
    'id' | 'organizationId' | 'type' | 'name' | 'config' | 'enabled'
  >[] {
    const fallbacks: Pick<
      NotificationChannel,
      'id' | 'organizationId' | 'type' | 'name' | 'config' | 'enabled'
    >[] = [];
    const emailTo = this.config.get<string>('NOTIFICATION_EMAIL_TO');
    const slackUrl = this.config.get<string>('SLACK_WEBHOOK_URL');
    const teamsUrl = this.config.get<string>('TEAMS_WEBHOOK_URL');

    if (emailTo) {
      fallbacks.push({
        id: 'env-email',
        organizationId,
        type: NotificationChannelType.EMAIL,
        name: 'Env email',
        config: { recipients: emailTo.split(',').map((s) => s.trim()) },
        enabled: true,
      });
    }
    if (slackUrl) {
      fallbacks.push({
        id: 'env-slack',
        organizationId,
        type: NotificationChannelType.SLACK,
        name: 'Env Slack',
        config: { webhookUrl: slackUrl },
        enabled: true,
      });
    }
    if (teamsUrl) {
      fallbacks.push({
        id: 'env-teams',
        organizationId,
        type: NotificationChannelType.TEAMS,
        name: 'Env Teams',
        config: { webhookUrl: teamsUrl },
        enabled: true,
      });
    }
    return fallbacks;
  }

  private async deliver(
    channel: Pick<NotificationChannel, 'id' | 'type' | 'config'>,
    organizationId: string,
    event: NotificationEventType,
    template: ReturnType<typeof buildNotificationTemplate>,
  ): Promise<void> {
    const delivery = this.deliveryRepo.create({
      organizationId,
      channelId: channel.id?.startsWith('env-') ? null : channel.id,
      eventType: event,
      channelType: channel.type,
      status: NotificationDeliveryStatus.PENDING,
      subject: template.subject,
      body: template.body,
    });

    let result: { status: NotificationDeliveryStatus; errorMessage?: string };

    try {
      switch (channel.type) {
        case NotificationChannelType.EMAIL: {
          const recipients = (channel.config.recipients as string[]) || [];
          result = await this.email.send(recipients, template.subject, template.body);
          break;
        }
        case NotificationChannelType.SLACK: {
          const webhookUrl = String(channel.config.webhookUrl || '');
          result = await this.slack.send(webhookUrl, template.slackText);
          break;
        }
        case NotificationChannelType.TEAMS: {
          const webhookUrl = String(channel.config.webhookUrl || '');
          result = await this.teams.send(webhookUrl, template.body, template.subject);
          break;
        }
        default:
          result = { status: NotificationDeliveryStatus.FAILED, errorMessage: 'Unknown channel' };
      }
    } catch (error) {
      result = { status: NotificationDeliveryStatus.FAILED, errorMessage: (error as Error).message };
    }

    delivery.status = result.status;
    delivery.errorMessage = result.errorMessage || null;
    delivery.sentAt =
      result.status === NotificationDeliveryStatus.SENT ||
      result.status === NotificationDeliveryStatus.LOGGED
        ? new Date()
        : null;

    await this.deliveryRepo.save(delivery);

    if (result.status === NotificationDeliveryStatus.FAILED) {
      this.logger.warn(
        `Notification ${event} via ${channel.type} failed: ${result.errorMessage}`,
      );
    }
  }
}
