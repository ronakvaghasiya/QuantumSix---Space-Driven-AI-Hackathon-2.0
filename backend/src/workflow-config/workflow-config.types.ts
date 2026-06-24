export interface ApprovalGatesConfig {
  analysis: boolean;
  code: boolean;
  pr: boolean;
  riskAutoApproveMaxScore?: number | null;
}

export interface ValidationRulesConfig {
  blockOnLintFail: boolean;
  blockOnSecurityScan: boolean;
  minRegressionCoverage?: number;
}

export interface NotificationRulesConfig {
  mutedEvents?: string[];
}

export interface AgentOrderConfig {
  disabledSteps?: string[];
}

export const DEFAULT_APPROVAL_GATES: ApprovalGatesConfig = {
  analysis: true,
  code: true,
  pr: true,
  riskAutoApproveMaxScore: null,
};

export const DEFAULT_VALIDATION_RULES: ValidationRulesConfig = {
  blockOnLintFail: true,
  blockOnSecurityScan: true,
};
