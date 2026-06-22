import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as path from 'path';
import { DependencyEdge } from '../entities/dependency-edge.entity';
import { RepositoryFile } from '../entities/repository-file.entity';
import { DependencyRelationType } from '../../common/enums/project.enum';
import { ParsedFileMetadata } from '../interfaces/repository.interfaces';

export interface DependencyNode {
  file: string;
  children: DependencyNode[];
  relationType: DependencyRelationType;
}

export interface DependencyGraphResult {
  edges: { source: string; target: string; relationType: DependencyRelationType; symbolName?: string }[];
  adjacencyList: Record<string, string[]>;
  trees: DependencyNode[];
}

@Injectable()
export class DependencyGraphService {
  constructor(
    @InjectRepository(DependencyEdge)
    private readonly edgeRepo: Repository<DependencyEdge>,
    @InjectRepository(RepositoryFile)
    private readonly fileRepo: Repository<RepositoryFile>,
  ) {}

  async buildGraph(
    projectId: string,
    parsedFiles: ParsedFileMetadata[],
  ): Promise<DependencyGraphResult> {
    await this.edgeRepo.delete({ projectId });

    const fileIndex = this.buildFileIndex(parsedFiles);
    const edges: DependencyGraphResult['edges'] = [];

    for (const file of parsedFiles) {
      for (const importPath of file.imports) {
        const resolved = this.resolveImport(file.filePath, importPath, fileIndex);
        if (!resolved) continue;

        const relationType = this.inferRelationType(file, resolved, importPath);
        edges.push({
          source: file.filePath,
          target: resolved,
          relationType,
          symbolName: this.extractSymbolName(importPath),
        });
      }

      for (const ctx of file.contexts) {
        const ctxFile = this.findFileBySymbol(parsedFiles, ctx);
        if (ctxFile && ctxFile !== file.filePath) {
          edges.push({
            source: file.filePath,
            target: ctxFile,
            relationType: DependencyRelationType.CONTEXT,
            symbolName: ctx,
          });
        }
      }

      for (const svc of file.services) {
        const svcFile = this.findFileBySymbol(parsedFiles, svc);
        if (svcFile && svcFile !== file.filePath) {
          edges.push({
            source: file.filePath,
            target: svcFile,
            relationType: DependencyRelationType.SERVICE,
            symbolName: svc,
          });
        }
      }
    }

    const uniqueEdges = this.deduplicateEdges(edges);

    if (uniqueEdges.length > 0) {
      await this.edgeRepo.save(
        uniqueEdges.map((e) =>
          this.edgeRepo.create({
            projectId,
            sourceFile: e.source,
            targetFile: e.target,
            relationType: e.relationType,
            symbolName: e.symbolName || null,
          }),
        ),
      );
    }

    const adjacencyList = this.buildAdjacencyList(uniqueEdges);
    const trees = this.buildTrees(uniqueEdges);

    return { edges: uniqueEdges, adjacencyList, trees };
  }

  async getGraphForFiles(projectId: string, filePaths: string[]): Promise<DependencyGraphResult> {
    const allEdges = await this.edgeRepo.find({ where: { projectId } });
    const relevantFiles = new Set(filePaths);
    const visited = new Set<string>(filePaths);

    let changed = true;
    while (changed) {
      changed = false;
      for (const edge of allEdges) {
        if (relevantFiles.has(edge.sourceFile) && !relevantFiles.has(edge.targetFile)) {
          relevantFiles.add(edge.targetFile);
          changed = true;
        }
        if (relevantFiles.has(edge.targetFile) && !relevantFiles.has(edge.sourceFile)) {
          relevantFiles.add(edge.sourceFile);
          changed = true;
        }
      }
    }

    const filtered = allEdges
      .filter((e) => relevantFiles.has(e.sourceFile) && relevantFiles.has(e.targetFile))
      .map((e) => ({
        source: e.sourceFile,
        target: e.targetFile,
        relationType: e.relationType,
        symbolName: e.symbolName || undefined,
      }));

    return {
      edges: filtered,
      adjacencyList: this.buildAdjacencyList(filtered),
      trees: this.buildTrees(filtered, filePaths[0]),
    };
  }

  async getFullGraph(projectId: string): Promise<DependencyGraphResult> {
    const allEdges = await this.edgeRepo.find({ where: { projectId } });
    const edges = allEdges.map((e) => ({
      source: e.sourceFile,
      target: e.targetFile,
      relationType: e.relationType,
      symbolName: e.symbolName || undefined,
    }));
    return {
      edges,
      adjacencyList: this.buildAdjacencyList(edges),
      trees: this.buildTrees(edges),
    };
  }

  private buildFileIndex(files: ParsedFileMetadata[]): Map<string, string> {
    const index = new Map<string, string>();
    for (const file of files) {
      const baseName = path.basename(file.filePath, path.extname(file.filePath));
      index.set(baseName, file.filePath);
      index.set(file.filePath, file.filePath);

      const noExt = file.filePath.replace(/\.(tsx?|jsx?)$/, '');
      index.set(noExt, file.filePath);

      if (file.filePath.endsWith('/index.ts') || file.filePath.endsWith('/index.tsx') ||
          file.filePath.endsWith('/index.js') || file.filePath.endsWith('/index.jsx')) {
        const dir = path.dirname(file.filePath);
        index.set(dir, file.filePath);
        index.set(`@${dir}`, file.filePath);
      }
    }
    return index;
  }

  private resolveImport(
    fromFile: string,
    importPath: string,
    fileIndex: Map<string, string>,
  ): string | null {
    if (importPath.startsWith('.')) {
      const dir = path.dirname(fromFile);
      const resolved = path.normalize(path.join(dir, importPath)).replace(/\\/g, '/');
      const candidates = [
        resolved,
        `${resolved}.ts`,
        `${resolved}.tsx`,
        `${resolved}.js`,
        `${resolved}.jsx`,
        `${resolved}/index.ts`,
        `${resolved}/index.tsx`,
        `${resolved}/index.js`,
        `${resolved}/index.jsx`,
      ];
      for (const c of candidates) {
        if (fileIndex.has(c)) return fileIndex.get(c)!;
      }
      return null;
    }

    const baseName = importPath.split('/').pop()?.replace(/\.(tsx?|jsx?)$/, '') || importPath;
    return fileIndex.get(baseName) || fileIndex.get(importPath) || null;
  }

  private inferRelationType(
    file: ParsedFileMetadata,
    target: string,
    importPath: string,
  ): DependencyRelationType {
    if (file.graphqlQueries.length > 0 && importPath.includes('graphql')) {
      return DependencyRelationType.GRAPHQL;
    }
    if (target.includes('Context') || file.contexts.some((c) => importPath.includes(c))) {
      return DependencyRelationType.CONTEXT;
    }
    if (target.includes('Service') || file.services.some((s) => importPath.includes(s))) {
      return DependencyRelationType.SERVICE;
    }
    if (file.hooks.some((h) => importPath.includes(h))) {
      return DependencyRelationType.HOOK;
    }
    if (file.utilities.length > 0 && (target.includes('util') || target.includes('helper'))) {
      return DependencyRelationType.UTILITY;
    }
    if (file.components.length > 0) {
      return DependencyRelationType.COMPONENT;
    }
    return DependencyRelationType.IMPORT;
  }

  private extractSymbolName(importPath: string): string | undefined {
    const parts = importPath.split('/');
    return parts[parts.length - 1] || undefined;
  }

  private findFileBySymbol(files: ParsedFileMetadata[], symbol: string): string | null {
    for (const f of files) {
      if (
        f.exports.includes(symbol) ||
        f.components.includes(symbol) ||
        f.contexts.includes(symbol) ||
        f.services.includes(symbol) ||
        f.hooks.includes(symbol)
      ) {
        return f.filePath;
      }
    }
    const baseName = symbol.replace(/(Context|Service|Provider)$/, '');
    for (const f of files) {
      if (path.basename(f.filePath, path.extname(f.filePath)) === baseName) {
        return f.filePath;
      }
    }
    return null;
  }

  private deduplicateEdges(
    edges: DependencyGraphResult['edges'],
  ): DependencyGraphResult['edges'] {
    const seen = new Set<string>();
    return edges.filter((e) => {
      const key = `${e.source}|${e.target}|${e.relationType}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return e.source !== e.target;
    });
  }

  private buildAdjacencyList(edges: DependencyGraphResult['edges']): Record<string, string[]> {
    const adj: Record<string, string[]> = {};
    for (const edge of edges) {
      if (!adj[edge.source]) adj[edge.source] = [];
      if (!adj[edge.source].includes(edge.target)) {
        adj[edge.source].push(edge.target);
      }
    }
    return adj;
  }

  private buildTrees(
    edges: DependencyGraphResult['edges'],
    rootFile?: string,
  ): DependencyNode[] {
    const childrenMap = new Map<string, { target: string; type: DependencyRelationType }[]>();
    for (const edge of edges) {
      if (!childrenMap.has(edge.source)) childrenMap.set(edge.source, []);
      childrenMap.get(edge.source)!.push({ target: edge.target, type: edge.relationType });
    }

    const buildNode = (file: string, visited: Set<string>): DependencyNode => {
      visited.add(file);
      const children = (childrenMap.get(file) || [])
        .filter((c) => !visited.has(c.target))
        .map((c) => buildNode(c.target, new Set(visited)));

      const edge = edges.find((e) => e.source === file);
      return {
        file,
        children,
        relationType: edge?.relationType || DependencyRelationType.IMPORT,
      };
    };

    if (rootFile) {
      return [buildNode(rootFile, new Set())];
    }

    const allTargets = new Set(edges.map((e) => e.target));
    const roots = [...new Set(edges.map((e) => e.source))].filter((s) => !allTargets.has(s));
    return roots.slice(0, 10).map((r) => buildNode(r, new Set()));
  }
}
