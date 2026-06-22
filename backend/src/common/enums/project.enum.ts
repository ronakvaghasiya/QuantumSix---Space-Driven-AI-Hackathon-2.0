export enum ProjectStatus {
  PENDING = 'pending',
  INDEXING = 'indexing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum Framework {
  NEXTJS = 'Next.js',
  REACT = 'React',
  VUE = 'Vue',
  ANGULAR = 'Angular',
  NESTJS = 'NestJS',
  EXPRESS = 'Express',
  OTHER = 'Other',
}

export enum Language {
  TYPESCRIPT = 'TypeScript',
  JAVASCRIPT = 'JavaScript',
  PYTHON = 'Python',
  GO = 'Go',
  RUST = 'Rust',
  OTHER = 'Other',
}

export enum IndexingJobStatus {
  PENDING = 'pending',
  CLONING = 'cloning',
  SCANNING = 'scanning',
  PARSING = 'parsing',
  EMBEDDING = 'embedding',
  BUILDING_GRAPH = 'building_graph',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum DependencyRelationType {
  IMPORT = 'import',
  COMPONENT = 'component',
  CONTEXT = 'context',
  SERVICE = 'service',
  HOOK = 'hook',
  UTILITY = 'utility',
  GRAPHQL = 'graphql',
}

export enum VcsAuthType {
  OAUTH = 'oauth',
  PAT = 'pat',
}

/** @deprecated use VcsAuthType */
export const GitHubAuthType = VcsAuthType;
