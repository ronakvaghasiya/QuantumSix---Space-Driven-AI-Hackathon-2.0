import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface ReplaceIntent {
  from: string;
  to: string;
}

export interface FileEditResult {
  path: string;
  originalContent: string;
  newContent: string;
  changeComments: string[];
}

export interface AccurateEditResult {
  edits: FileEditResult[];
  plan: string;
  verified: boolean;
  verificationErrors: string[];
  strategy: 'deterministic_replace' | 'llm_assisted';
}

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  '.cache',
  'vendor',
]);

const TEXT_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.vue', '.json', '.html', '.css', '.scss',
  '.md', '.yml', '.yaml', '.xml', '.svg', '.txt',
]);

const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.vue', '.html']);

@Injectable()
export class CodeContextService {
  private readonly logger = new Logger(CodeContextService.name);

  readFileContent(clonePath: string, filePath: string, maxChars = 8_000): string | null {
    const normalized = filePath.replace(/^\.\//, '');
    const full = path.join(clonePath, normalized);
    if (!fs.existsSync(full) || !fs.statSync(full).isFile()) return null;
    return fs.readFileSync(full, 'utf8').slice(0, maxChars);
  }

  readFullFileForEdit(clonePath: string, filePath: string, maxChars = 250_000): string | null {
    return this.readFileContent(clonePath, filePath, maxChars);
  }

  readFiles(clonePath: string, filePaths: string[], maxCharsPerFile = 8_000): string {
    const sections: string[] = [];
    for (const rel of filePaths.slice(0, 6)) {
      const normalized = rel.replace(/^\.\//, '');
      const full = path.join(clonePath, normalized);
      if (!fs.existsSync(full) || !fs.statSync(full).isFile()) continue;
      const content = fs.readFileSync(full, 'utf8');
      sections.push(
        `FILE: ${normalized}\n\`\`\`\n${content.slice(0, maxCharsPerFile)}\n\`\`\``,
      );
    }
    return sections.join('\n\n');
  }

  /** Parse text-replace requirements (quoted and unquoted) */
  parseReplaceIntent(requirement: string): ReplaceIntent | null {
    const normalized = requirement.replace(/\s+/g, ' ').trim();

    const patterns: RegExp[] = [
      /(?:please\s+)?(?:label|lable|text|title|name|heading)\s+["'](.+?)["']\s+(?:change|replace|update|rename)\s+(?:to|with|as)\s+["'](.+?)["']/i,
      /(?:change|replace|update|rename)\s+(?:label|lable|text|title|name)?\s*["'](.+?)["']\s+(?:to|with|as)\s+["'](.+?)["']/i,
      /["'](.+?)["']\s+(?:change|replace|update|rename)\s+(?:to|with|as)\s+["'](.+?)["']/i,
      /(?:change|replace|update|rename)\s+(.+?)\s+(?:to|with|as)\s+(.+?)(?:\s+in\s+|\s*$)/i,
      /(?:label|text)\s+(.+?)\s+(?:change|replace|update)\s+(?:to|with|as)\s+(.+?)(?:\s+in\s+|\s*$)/i,
    ];

    for (const re of patterns) {
      const match = normalized.match(re);
      if (!match?.[1] || !match?.[2]) continue;
      const from = match[1].trim().replace(/^["']|["']$/g, '');
      const to = match[2].trim().replace(/^["']|["']$/g, '').replace(/[.,;]+$/, '');
      if (from.length >= 2 && to.length >= 1 && from !== to) {
        return { from, to };
      }
    }
    return null;
  }

  extractSearchTerms(requirement: string, intent: ReplaceIntent | null): string[] {
    const terms = new Set<string>();
    if (intent) {
      terms.add(intent.from);
      for (const part of intent.from.split(/\s+/).filter((p) => p.length > 3)) {
        terms.add(part);
      }
    }
    const quoted = requirement.match(/["']([^"']{2,})["']/g);
    for (const q of quoted || []) {
      terms.add(q.replace(/["']/g, ''));
    }
    return [...terms];
  }

  applyReplacementsInContent(
    content: string,
    from: string,
    to: string,
  ): { content: string; count: number } {
    if (!from || from === to) return { content, count: 0 };

    // When target extends source (e.g. "Sides Preview" → "Sides Preview 123"),
    // skip occurrences that are already the full target text.
    if (to.startsWith(from)) {
      let result = content;
      let count = 0;
      let idx = 0;
      while ((idx = result.indexOf(from, idx)) !== -1) {
        if (result.slice(idx, idx + to.length) === to) {
          idx += to.length;
          continue;
        }
        result = result.slice(0, idx) + to + result.slice(idx + from.length);
        count++;
        idx += to.length;
      }
      return { content: result, count };
    }

    if (content.includes(from)) {
      let count = 0;
      let result = content;
      let idx = result.indexOf(from);
      while (idx !== -1) {
        count++;
        result = result.slice(0, idx) + to + result.slice(idx + from.length);
        idx = result.indexOf(from, idx + to.length);
      }
      return { content: result, count };
    }

    const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escaped, 'gi');
    let count = 0;
    const result = content.replace(re, () => {
      count++;
      return to;
    });
    return { content: result, count };
  }

  searchFilesContaining(
    clonePath: string,
    searchText: string,
    hintedPaths: string[] = [],
    maxFiles = 20,
  ): string[] {
    const found: { path: string; score: number }[] = [];
    const seen = new Set<string>();
    const terms = [searchText, ...searchText.split(/\s+/).filter((t) => t.length > 3)];

    const scoreFile = (relPath: string, content: string): number => {
      let score = 0;
      const lowerPath = relPath.toLowerCase();
      const lowerContent = content.toLowerCase();
      const lowerSearch = searchText.toLowerCase();

      if (content.includes(searchText)) score += 100;
      else if (lowerContent.includes(lowerSearch)) score += 80;
      else if (terms.some((t) => lowerContent.includes(t.toLowerCase()))) score += 40;

      for (const term of terms) {
        if (lowerPath.includes(term.toLowerCase())) score += 25;
        if (lowerContent.includes(term.toLowerCase())) score += 10;
      }

      if (score === 0) return 0;

      const ext = path.extname(relPath).toLowerCase();
      if (SOURCE_EXTENSIONS.has(ext)) score += 20;

      return score;
    };

    const checkFile = (relPath: string) => {
      const normalized = relPath.replace(/^\.\//, '');
      if (seen.has(normalized)) return;
      const full = path.join(clonePath, normalized);
      if (!fs.existsSync(full) || !fs.statSync(full).isFile()) return;
      try {
        const content = fs.readFileSync(full, 'utf8');
        const score = scoreFile(normalized, content);
        if (score > 0) {
          seen.add(normalized);
          found.push({ path: normalized, score });
        }
      } catch {
        // skip
      }
    };

    for (const hinted of hintedPaths) checkFile(hinted);

    this.walkClone(clonePath, (rel) => checkFile(rel));

    return found
      .sort((a, b) => b.score - a.score)
      .slice(0, maxFiles)
      .map((f) => f.path);
  }

  /** Deterministic accurate edits — primary path for text/label changes */
  generateAccurateEdits(
    clonePath: string,
    requirement: string,
    hintedPaths: string[] = [],
  ): AccurateEditResult {
    const intent = this.parseReplaceIntent(requirement);
    if (!intent) {
      return {
        edits: [],
        plan: '',
        verified: false,
        verificationErrors: ['Not a text-replace requirement — use LLM path'],
        strategy: 'llm_assisted',
      };
    }

    const files = this.searchFilesContaining(clonePath, intent.from, hintedPaths, 500);
    if (!files.length) {
      return {
        edits: [],
        plan: `Search repository for "${intent.from}" and replace with "${intent.to}"`,
        verified: false,
        verificationErrors: [
          `Text "${intent.from}" not found in any source file. Re-index project or check exact spelling.`,
        ],
        strategy: 'deterministic_replace',
      };
    }

    const edits: FileEditResult[] = [];
    let totalReplacements = 0;
    const editedPaths = new Set<string>();

    const applyToFile = (filePath: string, force = false): boolean => {
      const normalized = filePath.replace(/^\.\//, '');
      if (editedPaths.has(normalized) && !force) return false;
      const full = path.join(clonePath, normalized);
      if (!fs.existsSync(full) || !fs.statSync(full).isFile()) return false;

      const existingEdit = edits.find((e) => e.path.replace(/^\.\//, '') === normalized);
      const originalContent = existingEdit?.originalContent ?? fs.readFileSync(full, 'utf8');
      const { content: newContent, count } = this.applyReplacementsInContent(
        originalContent,
        intent.from,
        intent.to,
      );

      if (count > 0 && newContent !== originalContent) {
        totalReplacements += count;
        editedPaths.add(normalized);
        const edit: FileEditResult = {
          path: normalized,
          originalContent,
          newContent,
          changeComments: [
            `Replaced "${intent.from}" → "${intent.to}" (${count}× in ${normalized})`,
          ],
        };
        const existingIdx = edits.findIndex((e) => e.path.replace(/^\.\//, '') === normalized);
        if (existingIdx >= 0) {
          edits[existingIdx] = edit;
        } else {
          edits.push(edit);
        }
        return true;
      }
      return false;
    };

    for (const filePath of files) {
      applyToFile(filePath);
    }

    // Second pass: scan using pending edits (disk is still stale until applyEditsToClone)
    let missed = this.scanRepoForUnresolvedText(clonePath, intent.from, intent.to, edits);
    for (const filePath of missed) {
      applyToFile(filePath, true);
    }

    const verification = this.verifyReplaceEdits(edits, intent);
    let repoRemaining = this.scanRepoForUnresolvedText(clonePath, intent.from, intent.to, edits);
    if (repoRemaining.length > 0) {
      for (const filePath of repoRemaining) {
        applyToFile(filePath, true);
      }
      repoRemaining = this.scanRepoForUnresolvedText(clonePath, intent.from, intent.to, edits);
    }
    const verificationErrors = [...verification.errors];
    if (repoRemaining.length > 0) {
      verificationErrors.push(
        `Still unresolved in ${repoRemaining.length} file(s): ${repoRemaining.slice(0, 5).join(', ')}${repoRemaining.length > 5 ? '…' : ''}`,
      );
    }

    const plan = [
      `Requirement: ${requirement}`,
      `Action: Replace "${intent.from}" with "${intent.to}"`,
      `Files scanned: ${files.length}`,
      `Files modified: ${edits.length}`,
      `Total replacements: ${totalReplacements}`,
      `Files: ${edits.map((e) => e.path).join(', ') || 'none'}`,
    ].join('\n');

    this.logger.log(
      `Accurate edit: ${edits.length} file(s), ${totalReplacements} replacement(s) for "${intent.from}" → "${intent.to}"`,
    );

    return {
      edits,
      plan,
      verified: verification.ok && repoRemaining.length === 0,
      verificationErrors,
      strategy: 'deterministic_replace',
    };
  }

  /** Walk entire clone — return files that still contain unresolved source text */
  scanRepoForUnresolvedText(
    clonePath: string,
    from: string,
    to: string,
    pendingEdits: FileEditResult[] = [],
  ): string[] {
    const editByPath = new Map(
      pendingEdits.map((e) => [e.path.replace(/^\.\//, ''), e]),
    );
    const unresolved: string[] = [];
    this.walkClone(clonePath, (relPath) => {
      const normalized = relPath.replace(/^\.\//, '');
      try {
        const pending = editByPath.get(normalized);
        const content = pending
          ? pending.newContent
          : fs.readFileSync(path.join(clonePath, normalized), 'utf8');
        if (this.countRemainingFromText(content, from, to) > 0) {
          unresolved.push(normalized);
        }
      } catch {
        // skip
      }
    });
    return unresolved;
  }

  /** Write edits to clone and confirm files on disk match expected content */
  applyEditsToClone(
    clonePath: string,
    edits: FileEditResult[],
  ): { applied: string[]; errors: string[] } {
    const applied: string[] = [];
    const errors: string[] = [];

    for (const edit of edits) {
      const normalized = edit.path.replace(/^\.\//, '');
      const full = path.join(clonePath, normalized);
      try {
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, edit.newContent, 'utf8');
        const onDisk = fs.readFileSync(full, 'utf8');
        if (onDisk !== edit.newContent) {
          errors.push(`${normalized}: disk content mismatch after write`);
        } else {
          applied.push(normalized);
        }
      } catch (err) {
        errors.push(`${normalized}: ${(err as Error).message}`);
      }
    }

    return { applied, errors };
  }

  /** Build read-only context from related files for LLM planning/editing */
  buildRelatedFileContext(
    clonePath: string,
    filePaths: string[],
    excludePath?: string,
    maxCharsPerFile = 2_500,
    maxFiles = 4,
  ): string {
    const sections: string[] = [];
    let count = 0;
    for (const rel of filePaths) {
      if (count >= maxFiles) break;
      const normalized = rel.replace(/^\.\//, '');
      if (excludePath && normalized === excludePath.replace(/^\.\//, '')) continue;
      const content = this.readFileContent(clonePath, normalized, maxCharsPerFile);
      if (!content) continue;
      sections.push(`FILE: ${normalized}\n\`\`\`\n${content}\n\`\`\``);
      count++;
    }
    return sections.join('\n\n');
  }

  discoverFilesForRequirement(
    clonePath: string,
    requirement: string,
    hints: string[] = [],
    intent: ReplaceIntent | null = null,
  ): string[] {
    const terms = this.extractSearchTerms(requirement, intent);
    const found = new Set<string>();

    for (const hint of hints) found.add(hint.replace(/^\.\//, ''));

    for (const term of terms.slice(0, 6)) {
      for (const filePath of this.searchFilesContaining(clonePath, term, hints, 40)) {
        found.add(filePath);
      }
    }

    return [...found];
  }

  countRemainingFromText(content: string, from: string, to: string): number {
    if (!from) return 0;

    if (to.startsWith(from)) {
      let remaining = 0;
      let idx = 0;
      while ((idx = content.indexOf(from, idx)) !== -1) {
        if (content.slice(idx, idx + to.length) !== to) {
          remaining++;
          idx += from.length;
        } else {
          idx += to.length;
        }
      }
      return remaining;
    }

    if (!content.includes(from)) {
      const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(escaped, 'gi');
      const matches = content.match(re);
      return matches?.length || 0;
    }

    return this.countExactOccurrences(content, from);
  }

  private countExactOccurrences(content: string, text: string): number {
    let count = 0;
    let idx = 0;
    while ((idx = content.indexOf(text, idx)) !== -1) {
      count++;
      idx += text.length;
    }
    return count;
  }

  verifyReplaceEdits(
    edits: FileEditResult[],
    intent: ReplaceIntent,
  ): { ok: boolean; errors: string[] } {
    const errors: string[] = [];

    if (edits.length === 0) {
      errors.push(`No files were modified — "${intent.from}" was not replaced`);
      return { ok: false, errors };
    }

    let hasTarget = false;
    for (const edit of edits) {
      const applied = this.applyReplacementsInContent(
        edit.originalContent,
        intent.from,
        intent.to,
      );

      if (applied.count <= 0) {
        errors.push(`${edit.path}: no replacements applied`);
        continue;
      }

      if (!edit.newContent.includes(intent.to)) {
        errors.push(`${edit.path}: expected text "${intent.to}" missing after edit`);
      } else {
        hasTarget = true;
      }

      const remaining = this.countRemainingFromText(edit.newContent, intent.from, intent.to);
      if (remaining > 0) {
        errors.push(
          `${edit.path}: ${remaining} occurrence(s) of "${intent.from}" still not updated`,
        );
      }

      if (edit.newContent === edit.originalContent) {
        errors.push(`${edit.path}: file unchanged`);
      }
    }

    if (!hasTarget) {
      errors.push(`Replacement text "${intent.to}" not found in any modified file`);
    }

    return { ok: errors.length === 0, errors };
  }

  verifyEditsAgainstRequirement(
    edits: FileEditResult[],
    requirement: string,
    intent: ReplaceIntent | null,
    acceptanceCriteria?: string,
  ): { ok: boolean; errors: string[] } {
    if (intent) return this.verifyReplaceEdits(edits, intent);

    if (edits.length === 0) {
      return { ok: false, errors: ['No file edits produced'] };
    }

    const errors: string[] = [];
    for (const edit of edits) {
      if (edit.newContent === edit.originalContent) {
        errors.push(`${edit.path}: no changes detected`);
      }
    }

    if (acceptanceCriteria?.trim()) {
      const criteriaLines = acceptanceCriteria
        .split(/[\n.;]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 8);
      const allNewContent = edits.map((e) => e.newContent).join('\n');
      for (const criterion of criteriaLines.slice(0, 5)) {
        const quoted = criterion.match(/["']([^"']{3,})["']/g);
        if (quoted) {
          for (const q of quoted) {
            const text = q.replace(/["']/g, '');
            if (!allNewContent.includes(text) && !requirement.includes(text)) {
              errors.push(`Acceptance check: expected "${text}" in modified code`);
            }
          }
        }
      }
    }

    return { ok: errors.length === 0, errors };
  }

  trySurgicalReplacements(
    clonePath: string,
    requirement: string,
    hintedPaths: string[] = [],
  ): FileEditResult[] {
    return this.generateAccurateEdits(clonePath, requirement, hintedPaths).edits;
  }

  enrichFileEdits(
    clonePath: string,
    fileEdits: { path: string; newContent: string; changeComments: string[] }[],
  ): FileEditResult[] {
    return fileEdits.map((edit) => {
      const normalized = edit.path.replace(/^\.\//, '');
      const full = path.join(clonePath, normalized);
      const originalContent = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
      return { ...edit, originalContent };
    });
  }

  filterMeaningfulEdits(
    fileEdits: {
      path: string;
      originalContent?: string;
      newContent: string;
      changeComments?: string[];
    }[],
  ): FileEditResult[] {
    return fileEdits
      .filter((edit) => {
        const original = edit.originalContent ?? '';
        return edit.newContent.trim().length > 0 && edit.newContent !== original;
      })
      .map((edit) => ({
        path: edit.path,
        originalContent: edit.originalContent ?? '',
        newContent: edit.newContent,
        changeComments: edit.changeComments?.length ? edit.changeComments : ['Updated implementation'],
      }));
  }

  /** Force deterministic replace on LLM output when we know exact from/to */
  enforceReplaceIntent(
    originalContent: string,
    llmContent: string,
    intent: ReplaceIntent,
  ): string {
    const onOriginal = this.applyReplacementsInContent(originalContent, intent.from, intent.to);
    if (onOriginal.count > 0) return onOriginal.content;

    const onLlm = this.applyReplacementsInContent(llmContent, intent.from, intent.to);
    if (onLlm.count > 0) return onLlm.content;

    return llmContent;
  }

  buildUnifiedDiff(
    clonePath: string,
    fileEdits: { path: string; newContent: string; originalContent?: string }[],
  ): string {
    const chunks: string[] = [];
    for (const edit of fileEdits) {
      const normalized = edit.path.replace(/^\.\//, '');
      const full = path.join(clonePath, normalized);
      const oldContent =
        edit.originalContent ??
        (fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '');
      const diff = this.unifiedDiff(normalized, oldContent, edit.newContent);
      if (diff) chunks.push(diff);
    }
    return chunks.join('\n');
  }

  private walkClone(
    root: string,
    onFile: (relativePath: string) => void,
    current = '',
  ): void {
    const dir = current ? path.join(root, current) : root;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const rel = current ? `${current}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        this.walkClone(root, onFile, rel);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (TEXT_EXTENSIONS.has(ext) || !ext) {
          onFile(rel.replace(/\\/g, '/'));
        }
      }
    }
  }

  private unifiedDiff(file: string, oldText: string, newText: string): string {
    if (oldText === newText) return '';

    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');
    const output: string[] = [
      `diff --git a/${file} b/${file}`,
      `--- a/${file}`,
      `+++ b/${file}`,
    ];

    let i = 0;
    let j = 0;
    while (i < oldLines.length || j < newLines.length) {
      while (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
        i++;
        j++;
      }
      if (i >= oldLines.length && j >= newLines.length) break;

      const hunkOldStart = Math.max(0, i - 3);
      const hunkNewStart = Math.max(0, j - 3);

      let ii = i;
      let jj = j;
      while (ii < oldLines.length || jj < newLines.length) {
        if (
          ii < oldLines.length &&
          jj < newLines.length &&
          oldLines[ii] === newLines[jj]
        ) {
          let stable = true;
          for (let k = 1; k <= 2; k++) {
            if (
              ii + k >= oldLines.length ||
              jj + k >= newLines.length ||
              oldLines[ii + k] !== newLines[jj + k]
            ) {
              stable = false;
              break;
            }
          }
          if (stable) break;
        }
        if (ii < oldLines.length) ii++;
        if (jj < newLines.length) jj++;
        if (ii >= oldLines.length && jj >= newLines.length) break;
      }

      const oldSlice = oldLines.slice(hunkOldStart, ii);
      const newSlice = newLines.slice(hunkNewStart, jj);
      output.push(
        `@@ -${hunkOldStart + 1},${oldSlice.length} +${hunkNewStart + 1},${newSlice.length} @@`,
      );

      const oldChanged = oldLines.slice(i, ii);
      const newChanged = newLines.slice(j, jj);
      const prefixOld = oldLines.slice(hunkOldStart, i);
      const prefixNew = newLines.slice(hunkNewStart, j);

      for (let k = 0; k < Math.max(prefixOld.length, prefixNew.length); k++) {
        const o = prefixOld[k];
        const n = prefixNew[k];
        if (o !== undefined && o === n) output.push(` ${o}`);
      }
      for (const line of oldChanged) output.push(`-${line}`);
      for (const line of newChanged) output.push(`+${line}`);

      i = ii;
      j = jj;
    }

    return output.join('\n');
  }
}
