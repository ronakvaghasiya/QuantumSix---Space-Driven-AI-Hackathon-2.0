export interface PlanLimits {
  projects: number;
  repositories: number;
  tasksPerMonth: number;
  storageMb: number;
  users: number;
  tokensPerMonth: number;
}

export const UNLIMITED = -1;

export function isUnlimited(value: number): boolean {
  return value < 0;
}
