export type EmbeddingProvider = 'openai' | 'huggingface';

export const OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small';
export const OPENAI_EMBEDDING_DIMENSIONS = 1536;

export const DEFAULT_HF_EMBEDDING_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';

export const HF_EMBEDDING_MODEL_DIMENSIONS: Record<string, number> = {
  'sentence-transformers/all-MiniLM-L6-v2': 384,
  'sentence-transformers/all-mpnet-base-v2': 768,
  'BAAI/bge-small-en-v1.5': 384,
  'BAAI/bge-base-en-v1.5': 768,
  'intfloat/e5-small-v2': 384,
};

export function hfModelDimensions(model: string): number {
  return HF_EMBEDDING_MODEL_DIMENSIONS[model] ?? 384;
}

export interface EmbeddingRuntimeConfig {
  provider: EmbeddingProvider;
  model: string;
  dimensions: number;
}
