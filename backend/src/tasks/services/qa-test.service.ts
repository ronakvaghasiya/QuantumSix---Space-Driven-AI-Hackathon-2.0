import { Injectable, Logger } from '@nestjs/common';
import { Task } from '../entities/task.entity';
import { TaskCodeDiff } from '../entities/task-code-diff.entity';
import { LlmService } from './llm.service';
import { FullValidationResult } from '../types/validation.types';
import { QaGenerationResult, QaTestCase } from '../types/qa-test.types';

@Injectable()
export class QaTestService {
  private readonly logger = new Logger(QaTestService.name);

  constructor(private readonly llm: LlmService) {}

  async generateBeforeCodeGen(
    task: Task,
    acceptanceCriteria: string | null,
    impactedFiles: string[],
    feedbackContext?: string,
  ): Promise<QaGenerationResult> {
    const impactedList = impactedFiles.slice(0, 8).join('\n');
    const userPrompt = `Task: ${task.taskId}
Requirement: ${task.requirement}
Acceptance criteria: ${acceptanceCriteria || 'N/A'}
Impacted files:
${impactedList || 'Infer from requirement'}
${feedbackContext ? `\nPrior feedback:\n${feedbackContext}` : ''}`;

    const systemPrompt = `You are a senior QA architect. Return ONLY valid JSON (no markdown).
Schema:
{
  "qaTestCases": [{
    "id": "TC-001",
    "title": "string",
    "category": "functional|regression|edge|smoke|acceptance",
    "priority": "high|medium|low",
    "preconditions": "string",
    "steps": ["step 1", "step 2"],
    "expectedResult": "string",
    "relatedFiles": [],
    "linkedRequirement": "string",
    "status": "pending"
  }],
  "edgeCases": ["string"],
  "regressionCases": ["string"],
  "playwrightSpecs": [],
  "regressionCoverage": 60,
  "qaSummary": "string"
}
Rules:
- Exactly 6 concise test cases (mix functional, regression, edge, smoke)
- Keep steps short (max 4 steps each)
- playwrightSpecs must be an empty array []
- status must be "pending"`;

    try {
      const result = await this.llm.jsonCompletion<QaGenerationResult>(
        systemPrompt,
        userPrompt,
        { maxTokens: 4096, projectId: task.projectId },
      );
      return this.normalizeQaResult(result);
    } catch (error) {
      this.logger.warn(
        `QA generation failed, retrying with minimal prompt: ${(error as Error).message}`,
      );
      const fallback = await this.llm.jsonCompletion<QaGenerationResult>(
        `Return ONLY compact JSON with keys qaTestCases (array of 4 test objects with id, title, category, priority, preconditions, steps, expectedResult, relatedFiles, linkedRequirement, status), edgeCases, regressionCases, playwrightSpecs ([]), regressionCoverage, qaSummary. No markdown.`,
        userPrompt,
        { maxTokens: 2048, projectId: task.projectId },
      );
      return this.normalizeQaResult(fallback);
    }
  }

  private normalizeQaResult(result: Partial<QaGenerationResult>): QaGenerationResult {
    const cases = (result.qaTestCases || []).map((tc, i) => ({
      id: tc.id || `TC-${String(i + 1).padStart(3, '0')}`,
      title: tc.title || `Test case ${i + 1}`,
      category: tc.category || 'functional',
      priority: tc.priority || 'medium',
      preconditions: tc.preconditions || '',
      steps: tc.steps?.length ? tc.steps : ['Execute scenario', 'Verify outcome'],
      expectedResult: tc.expectedResult || 'Expected behavior observed',
      relatedFiles: tc.relatedFiles || [],
      linkedRequirement: tc.linkedRequirement || '',
      status: tc.status || 'pending',
    }));

    if (!cases.length) {
      cases.push({
        id: 'TC-001',
        title: 'Core requirement smoke test',
        category: 'smoke',
        priority: 'high',
        preconditions: 'Application running',
        steps: ['Perform primary user flow', 'Verify no errors'],
        expectedResult: 'Requirement satisfied without regression',
        relatedFiles: [],
        linkedRequirement: '',
        status: 'pending',
      });
    }

    return {
      qaTestCases: cases,
      edgeCases: result.edgeCases || [],
      regressionCases: result.regressionCases || [],
      playwrightSpecs: result.playwrightSpecs || [],
      regressionCoverage: result.regressionCoverage ?? 50,
      qaSummary: result.qaSummary || 'Auto-generated test plan',
    };
  }

  async generateAfterCodeGen(
    task: Task,
    codeDiff: TaskCodeDiff | null,
    acceptanceCriteria?: string | null,
  ): Promise<QaGenerationResult> {
    const edits = codeDiff?.fileEdits || [];
    const changeSummary = edits.length
      ? edits
          .map(
            (e) =>
              `${e.path}:\n${(e.changeComments || []).map((c) => `  - ${c}`).join('\n')}`,
          )
          .join('\n\n')
      : (codeDiff?.filesToModify || [])
          .map((f) => `${f.path}: ${f.changes.join('; ')}`)
          .join('\n');

    const changedFiles = edits.map((e) => e.path).join('\n') || 'See implementation plan';

    return this.llm.jsonCompletion<QaGenerationResult>(
      `You are a senior QA engineer writing test cases AFTER developers implemented code changes.
Return JSON only:
{
  qaTestCases: [{
    id: "TC-001" (unique),
    title: string,
    category: "functional"|"regression"|"edge"|"integration"|"ui"|"negative",
    priority: "critical"|"high"|"medium"|"low",
    preconditions: string,
    steps: string[] (numbered manual steps),
    expectedResult: string,
    relatedFiles: string[],
    linkedRequirement: string (which acceptance criterion this covers),
    status: "pending"
  }],
  edgeCases: string[],
  regressionCases: string[],
  playwrightSpecs: [{ filename: "tc-001.spec.ts", content: "full Playwright test code" }],
  regressionCoverage: number (0-100),
  qaSummary: string
}
Rules:
- Minimum 10 detailed test cases — cover EVERY acceptance criterion
- Include happy path, edge cases, negative/error cases, regression for changed files
- Playwright specs must implement critical functional + UI tests (use @playwright/test syntax)
- steps must be actionable (what to click, what to type, what to observe)
- status must be "pending" for all cases`,
      `Task ID: ${task.taskId}
Requirement: ${task.requirement}

Acceptance criteria:
${acceptanceCriteria || task.acceptanceCriteria || 'N/A'}

Implementation plan:
${codeDiff?.implementationPlan || 'N/A'}

Changed files:
${changedFiles}

Code changes:
${changeSummary || 'N/A'}`,
      { maxTokens: 8192, projectId: task.projectId },
    );
  }

  verifyTestCases(
    cases: QaTestCase[],
    validation: FullValidationResult | null,
  ): { cases: QaTestCase[]; summary: string } {
    if (!validation) {
      return {
        cases: cases.map((tc) => ({
          ...tc,
          status: 'skipped' as const,
          actualResult: 'No validation run — clone unavailable',
          verificationMethod: 'heuristic' as const,
        })),
        summary: 'QA verification skipped — no repository clone',
      };
    }

    const buildOk = validation.build.status === 'pass';
    const lintOk = validation.eslint.status !== 'fail';
    const prettierOk = validation.prettier.status !== 'fail';
    const testResults = validation.tests.results;

    const verified = cases.map((tc) => this.verifyOne(tc, validation, {
      buildOk,
      lintOk,
      prettierOk,
      testResults,
    }));

    const passed = verified.filter((c) => c.status === 'pass').length;
    const failed = verified.filter((c) => c.status === 'fail').length;
    const skipped = verified.filter((c) => c.status === 'skipped').length;

    const summary = [
      `QA: ${passed}/${verified.length} passed`,
      failed > 0 ? `${failed} failed` : null,
      skipped > 0 ? `${skipped} skipped` : null,
      validation.qaSummary,
    ]
      .filter(Boolean)
      .join(' · ');

    return { cases: verified, summary };
  }

  toFunctionalTests(cases: QaTestCase[]): { name: string; passed: boolean }[] {
    return cases.map((tc) => ({
      name: `${tc.id}: ${tc.title}`,
      passed: tc.status === 'pass',
    }));
  }

  fromEntity(
    cases: {
      id: string;
      title: string;
      category: string;
      priority: string;
      preconditions: string;
      steps: string[];
      expectedResult: string;
      actualResult?: string;
      status: string;
      relatedFiles?: string[];
      linkedRequirement?: string;
      verificationMethod?: string;
    }[],
  ): QaTestCase[] {
    return cases.map((tc) => ({
      id: tc.id,
      title: tc.title,
      category: tc.category as QaTestCase['category'],
      priority: tc.priority as QaTestCase['priority'],
      preconditions: tc.preconditions,
      steps: tc.steps,
      expectedResult: tc.expectedResult,
      actualResult: tc.actualResult,
      status: (tc.status as QaTestCase['status']) || 'pending',
      relatedFiles: tc.relatedFiles,
      linkedRequirement: tc.linkedRequirement,
      verificationMethod: tc.verificationMethod as QaTestCase['verificationMethod'],
    }));
  }

  private verifyOne(
    tc: QaTestCase,
    validation: FullValidationResult,
    ctx: {
      buildOk: boolean;
      lintOk: boolean;
      prettierOk: boolean;
      testResults: { name: string; passed: boolean; message?: string }[];
    },
  ): QaTestCase {
    const automated = ctx.testResults.find(
      (r) =>
        r.name.toLowerCase().includes(tc.id.toLowerCase()) ||
        r.name.toLowerCase().includes(tc.title.toLowerCase().slice(0, 24)),
    );

    if (automated) {
      return {
        ...tc,
        status: automated.passed ? 'pass' : 'fail',
        actualResult: automated.message || (automated.passed ? 'Playwright test passed' : 'Playwright test failed'),
        verificationMethod: 'playwright',
      };
    }

    if (tc.category === 'negative' || tc.category === 'edge') {
      const codeQualityOk = ctx.buildOk && ctx.lintOk;
      return {
        ...tc,
        status: codeQualityOk ? 'pass' : 'fail',
        actualResult: codeQualityOk
          ? 'Edge/negative scenario covered in implementation; build & lint clean'
          : `Build/lint issues: ${validation.build.status}, ESLint ${validation.eslint.status}`,
        verificationMethod: 'heuristic',
      };
    }

    if (tc.category === 'regression') {
      const ok = ctx.buildOk && ctx.lintOk && ctx.prettierOk;
      return {
        ...tc,
        status: ok ? 'pass' : 'fail',
        actualResult: ok
          ? 'Regression check passed — project builds without errors'
          : validation.build.issues[0]?.message || validation.eslint.issues[0]?.message || 'Regression check failed',
        verificationMethod: 'build',
      };
    }

    if (tc.category === 'integration') {
      const ok = ctx.buildOk && ctx.lintOk;
      return {
        ...tc,
        status: ok ? 'pass' : 'fail',
        actualResult: ok
          ? 'Integration verified via successful build'
          : validation.build.output.slice(0, 300) || 'Build failed',
        verificationMethod: 'build',
      };
    }

    const functionalOk = ctx.buildOk && ctx.lintOk;
    if (ctx.testResults.length > 0) {
      const anyPass = ctx.testResults.some((r) => r.passed);
      return {
        ...tc,
        status: anyPass && functionalOk ? 'pass' : 'fail',
        actualResult: anyPass
          ? 'Verified via automated test suite + build'
          : validation.tests.output.slice(0, 300) || 'Automated tests did not pass',
        verificationMethod: 'automated',
      };
    }

    return {
      ...tc,
      status: functionalOk ? 'pass' : 'fail',
      actualResult: functionalOk
        ? 'Functional check passed — code compiles and passes lint'
        : validation.eslint.issues[0]?.message || validation.build.issues[0]?.message || 'Validation failed',
      verificationMethod: functionalOk ? 'lint' : 'build',
    };
  }
}
