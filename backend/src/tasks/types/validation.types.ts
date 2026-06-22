export interface ValidationIssue {
  file?: string;
  line?: number;
  column?: number;
  message: string;
  rule?: string;
  tool: 'eslint' | 'prettier' | 'build' | 'test';
  severity?: 'error' | 'warning';
}

export interface ToolValidationResult {
  status: 'pass' | 'fail' | 'skipped';
  command: string;
  errorCount: number;
  warningCount: number;
  issues: ValidationIssue[];
  output: string;
}

export interface TestVerificationResult {
  name: string;
  passed: boolean;
  message?: string;
  durationMs?: number;
}

export interface TestsValidationResult {
  status: 'pass' | 'fail' | 'skipped';
  command: string;
  passed: number;
  failed: number;
  results: TestVerificationResult[];
  output: string;
}

export interface FullValidationResult {
  eslint: ToolValidationResult;
  prettier: ToolValidationResult;
  build: ToolValidationResult;
  tests: TestsValidationResult;
  qaSummary: string;
}

export interface ValidationDetails extends FullValidationResult {
  clonePath: string | null;
  verifiedAt: string;
  fixApplied?: boolean;
}
