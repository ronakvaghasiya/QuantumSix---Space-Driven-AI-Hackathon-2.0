export interface ParsedFileMetadata {
  filePath: string;
  imports: string[];
  exports: string[];
  functions: string[];
  components: string[];
  hooks: string[];
  contexts: string[];
  services: string[];
  utilities: string[];
  graphqlQueries: string[];
  keywords: string[];
  lineCount: number;
  content: string;
}

export interface FileChunk {
  filePath: string;
  chunkIndex: number;
  chunkText: string;
  startLine: number;
  endLine: number;
}

export const SCAN_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];
export const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  '.turbo',
  '__tests__',
]);

export const CHUNK_SIZE = 1500;
export const CHUNK_OVERLAP = 200;
