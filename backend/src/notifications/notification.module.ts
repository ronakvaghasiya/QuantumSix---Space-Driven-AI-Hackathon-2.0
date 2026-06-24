import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationChannel } from './entities/notification-channel.entity';
import { NotificationDelivery } from './entities/notification-delivery.entity';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { EmailChannelAdapter } from './adapters/email.adapter';
import { SlackChannelAdapter, TeamsChannelAdapter } from './adapters/webhook.adapter';
import { Task } from '../tasks/entities/task.entity';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationChannel, NotificationDelivery, Task]),
    RbacModule,
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    EmailChannelAdapter,
    SlackChannelAdapter,
    TeamsChannelAdapter,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
