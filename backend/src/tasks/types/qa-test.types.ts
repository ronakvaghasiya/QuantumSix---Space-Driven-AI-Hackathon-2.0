export type QaTestCategory =
  | 'functional'
  | 'regression'
  | 'edge'
  | 'integration'
  | 'ui'
  | 'negative'
  | 'smoke'
  | 'acceptance';

export type QaTestPriority = 'critical' | 'high' | 'medium' | 'low';

export type QaTestStatus = 'pending' | 'pass' | 'fail' | 'skipped' | 'needs_review';

export interface QaTestCase {
  id: string;
  title: string;
  category: QaTestCategory;
  priority: QaTestPriority;
  preconditions: string;
  steps: string[];
  expectedResult: string;
  actualResult?: string;
  status: QaTestStatus;
  relatedFiles?: string[];
  linkedRequirement?: string;
  verificationMethod?: 'automated' | 'build' | 'playwright' | 'heuristic' | 'lint';
}

export interface QaGenerationResult {
  qaTestCases: QaTestCase[];
  edgeCases: string[];
  regressionCases: string[];
  playwrightSpecs: { filename: string; content: string }[];
  regressionCoverage: number;
  qaSummary: string;
}
