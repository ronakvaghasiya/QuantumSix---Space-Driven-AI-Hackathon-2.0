export interface CodePlanPromptContext {
  taskId: string;
  requirement: string;
  acceptanceCriteria: string;
  userStories: string[];
  testCases: string;
  candidateFiles: string;
  impactedFiles: string;
  indexedHints: string;
  feedback?: string;
}

export interface CodeEditPromptContext {
  taskId: string;
  requirement: string;
  acceptanceCriteria: string;
  implementationPlan: string;
  verificationChecks: string;
  filePath: string;
  fileContent: string;
  relatedContext: string;
  feedback?: string;
}

export const CODE_PLAN_SYSTEM = `You are a principal engineer planning surgical changes in a real production repository.

Your plan will be executed file-by-file and verified against acceptance criteria before any pull request is created.

Return JSON only:
{
  "implementationPlan": "numbered steps — what to change in which file and why",
  "targetFiles": ["relative/path/from/repo/root.js"],
  "verificationChecks": ["concrete checks that prove the requirement is fully done"]
}

MANDATORY RULES:
1. targetFiles must be REAL paths from the candidate list — never invent files
2. Include EVERY file that must change (UI, constants, i18n, tests, styles) — complete coverage beats minimal diff
3. For label/text changes: list every file that contains or renders the user-visible string
4. Do not pick markdown-only, lockfiles, or generated build output unless explicitly required
5. verificationChecks must map 1:1 to acceptance criteria — be specific and testable
6. Maximum 10 target files — prioritize highest-confidence paths first`;

export const CODE_EDIT_SYSTEM = `You are a senior engineer editing ONE production source file in an active repository.

Return JSON only:
{
  "newContent": "the COMPLETE file after your edits",
  "changeComments": ["human-readable summary of each change made"],
  "addressesCriteria": ["which acceptance criteria this edit satisfies"]
}

MANDATORY RULES:
1. newContent MUST be the ENTIRE file — every line preserved except required edits
2. Implement the requirement EXACTLY as stated — match acceptance criteria literally
3. MINIMAL diff: change ONLY what is required — no refactoring, reformatting, or drive-by fixes
4. Do NOT use placeholders, TODO, or pseudo-code — output working production code
5. For string/label/text changes: locate and replace the EXACT user-visible text everywhere in this file
6. Preserve imports, exports, variable names, indentation style, and framework patterns from the original
7. If the requirement cannot be implemented in this file alone, still make every applicable change here`;

export function buildCodePlanUserPrompt(ctx: CodePlanPromptContext): string {
  return [
    `Task ID: ${ctx.taskId}`,
    `Requirement: ${ctx.requirement}`,
    '',
    `Acceptance criteria:\n${ctx.acceptanceCriteria || 'Derive from requirement'}`,
    '',
    ctx.userStories.length
      ? `User stories:\n${ctx.userStories.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
      : '',
    '',
    `Approved test cases:\n${ctx.testCases}`,
    '',
    `Repository files already identified as relevant (EXIST in clone — pick from these):\n${ctx.candidateFiles || 'None — infer carefully'}`,
    '',
    `Impact analysis files:\n${ctx.impactedFiles || 'None'}`,
    '',
    `Indexed search hints:\n${ctx.indexedHints || 'None'}`,
    ctx.feedback ? `\nPrior reviewer feedback (must address):\n${ctx.feedback}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildCodeEditUserPrompt(ctx: CodeEditPromptContext): string {
  return [
    `Task ID: ${ctx.taskId}`,
    `Requirement: ${ctx.requirement}`,
    `Acceptance criteria: ${ctx.acceptanceCriteria || 'N/A'}`,
    '',
    `Implementation plan:\n${ctx.implementationPlan}`,
    '',
    `Verification checks to satisfy:\n${ctx.verificationChecks || 'Match acceptance criteria'}`,
    '',
    `File to edit: ${ctx.filePath}`,
    '',
    ctx.relatedContext ? `Related files context (read-only — do not edit these):\n${ctx.relatedContext}\n` : '',
    `Current file content (edit this file only):\n\`\`\`\n${ctx.fileContent}\n\`\`\``,
    ctx.feedback ? `\nPrior reviewer feedback:\n${ctx.feedback}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
