import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationDeliveryStatus } from '../enums/notification.enum';

export interface EmailSendResult {
  status: NotificationDeliveryStatus;
  errorMessage?: string;
}

@Injectable()
export class EmailChannelAdapter {
  private readonly logger = new Logger(EmailChannelAdapter.name);

  constructor(private readonly config: ConfigService) {}

  async send(
    recipients: string[],
    subject: string,
    body: string,
  ): Promise<EmailSendResult> {
    const to = recipients.filter(Boolean);
    if (to.length === 0) {
      return { status: NotificationDeliveryStatus.FAILED, errorMessage: 'No recipients' };
    }

    const resendKey = this.config.get<string>('RESEND_API_KEY');
    const from = this.config.get<string>('NOTIFICATION_EMAIL_FROM') || 'RepoPilot <noreply@repopilot.local>';

    if (resendKey) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ from, to, subject, text: body }),
        });
        if (!res.ok) {
          const err = await res.text();
          return { status: NotificationDeliveryStatus.FAILED, errorMessage: err.slice(0, 500) };
        }
        return { status: NotificationDeliveryStatus.SENT };
      } catch (error) {
        return {
          status: NotificationDeliveryStatus.FAILED,
          errorMessage: (error as Error).message,
        };
      }
    }

    this.logger.log(`[email] To: ${to.join(', ')} | ${subject}\n${body}`);
    return { status: NotificationDeliveryStatus.LOGGED };
  }
}
