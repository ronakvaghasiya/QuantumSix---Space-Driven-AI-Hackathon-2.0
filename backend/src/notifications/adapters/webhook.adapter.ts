import { Injectable } from '@nestjs/common';
import { NotificationDeliveryStatus } from '../enums/notification.enum';

export interface WebhookSendResult {
  status: NotificationDeliveryStatus;
  errorMessage?: string;
}

@Injectable()
export class SlackChannelAdapter {
  async send(webhookUrl: string, text: string): Promise<WebhookSendResult> {
    if (!webhookUrl?.startsWith('http')) {
      return { status: NotificationDeliveryStatus.FAILED, errorMessage: 'Invalid webhook URL' };
    }
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const err = await res.text();
        return { status: NotificationDeliveryStatus.FAILED, errorMessage: err.slice(0, 500) };
      }
      return { status: NotificationDeliveryStatus.SENT };
    } catch (error) {
      return { status: NotificationDeliveryStatus.FAILED, errorMessage: (error as Error).message };
    }
  }
}

@Injectable()
export class TeamsChannelAdapter {
  async send(webhookUrl: string, text: string, title: string): Promise<WebhookSendResult> {
    if (!webhookUrl?.startsWith('http')) {
      return { status: NotificationDeliveryStatus.FAILED, errorMessage: 'Invalid webhook URL' };
    }
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          '@type': 'MessageCard',
          '@context': 'http://schema.org/extensions',
          summary: title,
          themeColor: '0078D7',
          title,
          text,
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        return { status: NotificationDeliveryStatus.FAILED, errorMessage: err.slice(0, 500) };
      }
      return { status: NotificationDeliveryStatus.SENT };
    } catch (error) {
      return { status: NotificationDeliveryStatus.FAILED, errorMessage: (error as Error).message };
    }
  }
}
