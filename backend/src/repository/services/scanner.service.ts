import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import {
  ParsedFileMetadata,
  FileChunk,
  SCAN_EXTENSIONS,
  SKIP_DIRS,
  CHUNK_SIZE,
  CHUNK_OVERLAP,
} from '../interfaces/repository.interfaces';

@Injectable()
export class ScannerService {
  private readonly logger = new Logger(ScannerService.name);

  discoverFiles(rootDir: string): string[] {
    const results: string[] = [];
    this.walkDir(rootDir, rootDir, results);
    return results;
  }

  private walkDir(rootDir: string, currentDir: string, results: string[]): void {
    if (!fs.existsSync(currentDir)) return;

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) continue;

      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        this.walkDir(rootDir, fullPath, results);
      } else if (SCAN_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
        results.push(fullPath);
      }
    }
  }

  parseFile(basePath: string, absolutePath: string): ParsedFileMetadata | null {
    let content: string;
    try {
      content = fs.readFileSync(absolutePath, 'utf-8');
    } catch (err) {
      this.logger.warn(`Failed to read ${absolutePath}: ${(err as Error).message}`);
      return null;
    }

    const relativePath = path.relative(basePath, absolutePath).replace(/\\/g, '/');
    const lineCount = content.split('\n').length;

    const metadata: ParsedFileMetadata = {
      filePath: relativePath,
      imports: [],
      exports: [],
      functions: [],
      components: [],
      hooks: [],
      contexts: [],
      services: [],
      utilities: [],
      graphqlQueries: [],
      keywords: [],
      lineCount,
      content,
    };

    try {
      const ast = parse(content, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript', 'decorators-legacy', 'classProperties'],
        errorRecovery: true,
      });

      traverse(ast, {
        ImportDeclaration: (nodePath) => {
          const source = nodePath.node.source.value;
          metadata.imports.push(source);
        },
        ExportNamedDeclaration: (nodePath) => {
          if (nodePath.node.declaration) {
            this.extractDeclarationNames(nodePath.node.declaration, metadata);
          }
        },
        ExportDefaultDeclaration: (nodePath) => {
          const decl = nodePath.node.declaration;
          if (decl.type === 'Identifier') {
            metadata.exports.push(decl.name);
          } else if (decl.type === 'FunctionDeclaration' && decl.id) {
            metadata.exports.push(decl.id.name);
          }
        },
        FunctionDeclaration: (nodePath) => {
          if (nodePath.node.id) {
            const name = nodePath.node.id.name;
            metadata.functions.push(name);
            if (this.isReactComponent(name)) metadata.components.push(name);
          }
        },
        VariableDeclarator: (nodePath) => {
          if (nodePath.node.id.type !== 'Identifier') return;
          const name = nodePath.node.id.name;

          if (name.startsWith('use') && name.length > 3 && name[3] === name[3].toUpperCase()) {
            metadata.hooks.push(name);
          }
          if (name.endsWith('Context') || name.endsWith('Provider')) {
            metadata.contexts.push(name);
          }
          if (name.endsWith('Service')) {
            metadata.services.push(name);
          }
          if (this.isReactComponent(name)) {
            metadata.components.push(name);
          }

          if (nodePath.node.init) {
            const init = nodePath.node.init;
            if (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression') {
              metadata.functions.push(name);
            }
          }
        },
        ClassDeclaration: (nodePath) => {
          if (nodePath.node.id) {
            const name = nodePath.node.id.name;
            metadata.exports.push(name);
            if (name.endsWith('Service')) metadata.services.push(name);
          }
        },
        TaggedTemplateExpression: (nodePath) => {
          const tag = nodePath.node.tag;
          if (tag.type === 'Identifier' && (tag.name === 'gql' || tag.name === 'graphql')) {
            const quasi = nodePath.node.quasi;
            const queryText = quasi.quasis.map((q) => q.value.raw).join('');
            const opMatch = queryText.match(/(query|mutation|subscription)\s+(\w+)/);
            metadata.graphqlQueries.push(opMatch ? opMatch[2] : queryText.slice(0, 80));
          }
        },
        CallExpression: (nodePath) => {
          const callee = nodePath.node.callee;
          if (callee.type === 'Identifier' && callee.name === 'createContext') {
            const parent = nodePath.parent;
            if (parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
              metadata.contexts.push(parent.id.name);
            }
          }
        },
      });
    } catch {
      this.parseWithRegex(content, metadata);
    }

    metadata.imports = [...new Set(metadata.imports)];
    metadata.exports = [...new Set(metadata.exports)];
    metadata.functions = [...new Set(metadata.functions)];
    metadata.components = [...new Set(metadata.components)];
    metadata.hooks = [...new Set(metadata.hooks)];
    metadata.contexts = [...new Set(metadata.contexts)];
    metadata.services = [...new Set(metadata.services)];
    metadata.graphqlQueries = [...new Set(metadata.graphqlQueries)];

    if (relativePath.includes('util') || relativePath.includes('helper')) {
      metadata.utilities.push(...metadata.functions);
    }
    metadata.utilities = [...new Set(metadata.utilities)];

    metadata.keywords = [
      ...new Set([
        ...relativePath.split(/[/._-]/).filter((k) => k.length > 2),
        ...metadata.functions,
        ...metadata.components,
        ...metadata.hooks,
        ...metadata.contexts,
        ...metadata.exports,
      ]),
    ];

    return metadata;
  }

  chunkFile(metadata: ParsedFileMetadata): FileChunk[] {
    const { content, filePath } = metadata;
    if (content.length <= CHUNK_SIZE) {
      return [{
        filePath,
        chunkIndex: 0,
        chunkText: this.buildChunkText(metadata, content),
        startLine: 1,
        endLine: metadata.lineCount,
      }];
    }

    const chunks: FileChunk[] = [];
    const lines = content.split('\n');
    let startLine = 0;
    let chunkIndex = 0;

    while (startLine < lines.length) {
      let chunkLines: string[] = [];
      let charCount = 0;
      let endLine = startLine;

      while (endLine < lines.length && charCount + lines[endLine].length < CHUNK_SIZE) {
        chunkLines.push(lines[endLine]);
        charCount += lines[endLine].length + 1;
        endLine++;
      }

      if (chunkLines.length === 0) {
        chunkLines = [lines[startLine]];
        endLine = startLine + 1;
      }

      const chunkText = this.buildChunkText(metadata, chunkLines.join('\n'));
      chunks.push({
        filePath,
        chunkIndex,
        chunkText,
        startLine: startLine + 1,
        endLine,
      });

      const overlapLines = Math.floor(CHUNK_OVERLAP / 80);
      startLine = Math.max(startLine + 1, endLine - overlapLines);
      chunkIndex++;
    }

    return chunks;
  }

  private buildChunkText(metadata: ParsedFileMetadata, code: string): string {
    const header = [
      `File: ${metadata.filePath}`,
      metadata.components.length ? `Components: ${metadata.components.join(', ')}` : '',
      metadata.hooks.length ? `Hooks: ${metadata.hooks.join(', ')}` : '',
      metadata.contexts.length ? `Contexts: ${metadata.contexts.join(', ')}` : '',
      metadata.exports.length ? `Exports: ${metadata.exports.join(', ')}` : '',
    ].filter(Boolean).join('\n');

    return `${header}\n\n${code}`;
  }

  private isReactComponent(name: string): boolean {
    return /^[A-Z]/.test(name) && !name.endsWith('Context') && !name.endsWith('Service');
  }

  private extractDeclarationNames(declaration: unknown, metadata: ParsedFileMetadata): void {
    const decl = declaration as { type: string; id?: { name: string } | null; declarations?: { id: { name: string } }[] };
    if (decl.type === 'FunctionDeclaration' && decl.id) {
      metadata.exports.push(decl.id.name);
      if (this.isReactComponent(decl.id.name)) metadata.components.push(decl.id.name);
    }
    if (decl.type === 'VariableDeclaration' && decl.declarations) {
      for (const d of decl.declarations) {
        if (d.id?.name) metadata.exports.push(d.id.name);
      }
    }
    if (decl.type === 'ClassDeclaration' && decl.id) {
      metadata.exports.push(decl.id.name);
    }
  }

  private parseWithRegex(content: string, metadata: ParsedFileMetadata): void {
    const importRegex = /import\s+.*?from\s+['"](.+?)['"]/g;
    const exportRegex = /export\s+(?:default\s+)?(?:function|const|class)\s+(\w+)/g;
    const hookRegex = /\b(use[A-Z]\w+)\b/g;
    const gqlRegex = /gql`([^`]+)`/g;

    let match;
    while ((match = importRegex.exec(content)) !== null) metadata.imports.push(match[1]);
    while ((match = exportRegex.exec(content)) !== null) metadata.exports.push(match[1]);
    while ((match = hookRegex.exec(content)) !== null) metadata.hooks.push(match[1]);
    while ((match = gqlRegex.exec(content)) !== null) metadata.graphqlQueries.push(match[1].slice(0, 80));
  }
}
