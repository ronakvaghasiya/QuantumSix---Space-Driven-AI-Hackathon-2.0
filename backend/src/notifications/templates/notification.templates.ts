import { NotificationEventType } from '../enums/notification.enum';

export interface NotificationContext {
  taskId: string;
  taskHumanId?: string;
  projectName?: string;
  requirement?: string;
  prUrl?: string;
  prNumber?: number;
  errorMessage?: string;
  appUrl?: string;
}

export interface NotificationTemplate {
  subject: string;
  body: string;
  slackText: string;
}

export function buildNotificationTemplate(
  event: NotificationEventType,
  ctx: NotificationContext,
): NotificationTemplate {
  const taskLabel = ctx.taskHumanId || ctx.taskId;
  const taskLink = `${ctx.appUrl || 'http://localhost:3000'}/tasks/${ctx.taskId}`;
  const project = ctx.projectName ? ` (${ctx.projectName})` : '';

  switch (event) {
    case NotificationEventType.ANALYSIS_READY:
      return {
        subject: `[RepoPilot] Analysis ready — ${taskLabel}`,
        body: `Analysis and QA test cases are ready for review.\n\nTask: ${taskLabel}${project}\nRequirement: ${ctx.requirement || '—'}\n\nOpen: ${taskLink}`,
        slackText: `:mag: *Analysis ready* — \`${taskLabel}\`${project}\n<${taskLink}|Review analysis>`,
      };
    case NotificationEventType.CODE_READY:
      return {
        subject: `[RepoPilot] Code ready for approval — ${taskLabel}`,
        body: `Generated code is ready for your approval.\n\nTask: ${taskLabel}${project}\n\nOpen: ${taskLink}`,
        slackText: `:computer: *Code ready* — \`${taskLabel}\`${project}\n<${taskLink}|Approve code>`,
      };
    case NotificationEventType.VALIDATION_FAILED:
      return {
        subject: `[RepoPilot] Validation failed — ${taskLabel}`,
        body: `Validation failed for task ${taskLabel}${project}.\n\nError: ${ctx.errorMessage || 'See task details'}\n\nOpen: ${taskLink}`,
        slackText: `:x: *Validation failed* — \`${taskLabel}\`\n${ctx.errorMessage || 'See task details'}\n<${taskLink}|View task>`,
      };
    case NotificationEventType.SECURITY_SCAN_FAILED:
      return {
        subject: `[RepoPilot] Security scan blocked PR — ${taskLabel}`,
        body: `Security scan blocked PR creation for ${taskLabel}${project}.\n\n${ctx.errorMessage || 'See security tab'}\n\nOpen: ${taskLink}`,
        slackText: `:shield: *Security scan failed* — \`${taskLabel}\`\n${ctx.errorMessage || 'Blocked'}\n<${taskLink}|View task>`,
      };
    case NotificationEventType.PR_CREATED:
      return {
        subject: `[RepoPilot] Pull request created — ${taskLabel}`,
        body: `PR created for ${taskLabel}${project}.\n\n${ctx.prUrl ? `PR: ${ctx.prUrl}` : ''}\n\nOpen: ${taskLink}`,
        slackText: `:rocket: *PR created* — \`${taskLabel}\`${ctx.prUrl ? `\n<${ctx.prUrl}|View PR>` : ''}`,
      };
    case NotificationEventType.MR_READY:
      return {
        subject: `[RepoPilot] MR ready for review — ${taskLabel}`,
        body: `Merge request is ready for review.\n\nTask: ${taskLabel}${project}\n${ctx.prUrl ? `MR: ${ctx.prUrl}` : ''}\n\nOpen: ${taskLink}`,
        slackText: `:eyes: *MR ready for review* — \`${taskLabel}\`${ctx.prUrl ? `\n<${ctx.prUrl}|Review MR>` : ''}`,
      };
    case NotificationEventType.TASK_COMPLETED:
      return {
        subject: `[RepoPilot] Task completed — ${taskLabel}`,
        body: `Task ${taskLabel}${project} has been merged and completed.\n\nOpen: ${taskLink}`,
        slackText: `:white_check_mark: *Task completed* — \`${taskLabel}\`${project}`,
      };
    default:
      return {
        subject: `[RepoPilot] ${event}`,
        body: `Event ${event} for task ${taskLabel}\n${taskLink}`,
        slackText: `*${event}* — \`${taskLabel}\``,
      };
  }
}
