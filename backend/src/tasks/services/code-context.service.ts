import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CodeContextService {
  readFileContent(clonePath: string, filePath: string, maxChars = 8_000): string | null {
    const normalized = filePath.replace(/^\.\//, '');
    const full = path.join(clonePath, normalized);
    if (!fs.existsSync(full) || !fs.statSync(full).isFile()) return null;
    return fs.readFileSync(full, 'utf8').slice(0, maxChars);
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

  enrichFileEdits(
    clonePath: string,
    fileEdits: { path: string; newContent: string; changeComments: string[] }[],
  ): { path: string; originalContent: string; newContent: string; changeComments: string[] }[] {
    return fileEdits.map((edit) => {
      const normalized = edit.path.replace(/^\.\//, '');
      const full = path.join(clonePath, normalized);
      const originalContent = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
      return { ...edit, originalContent };
    });
  }

  buildUnifiedDiff(
    clonePath: string,
    fileEdits: { path: string; newContent: string }[],
  ): string {
    const chunks: string[] = [];
    for (const edit of fileEdits) {
      const normalized = edit.path.replace(/^\.\//, '');
      const full = path.join(clonePath, normalized);
      const oldContent = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
      chunks.push(this.simpleDiff(normalized, oldContent, edit.newContent));
    }
    return chunks.join('\n');
  }

  private simpleDiff(file: string, oldText: string, newText: string): string {
    if (oldText === newText) return '';
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');
    return [
      `diff --git a/${file} b/${file}`,
      `--- a/${file}`,
      `+++ b/${file}`,
      `@@ -1,${oldLines.length} +1,${newLines.length} @@`,
      ...newLines.map((l) => `+${l}`),
    ].join('\n');
  }
}
