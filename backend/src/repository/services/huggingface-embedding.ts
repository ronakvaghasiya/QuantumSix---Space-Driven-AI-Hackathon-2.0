import { BadRequestException, Logger } from '@nestjs/common';
import { DEFAULT_HF_EMBEDDING_MODEL } from '../../settings/embedding-config';

const logger = new Logger('HuggingFaceEmbedding');
const HF_ROUTER_URL = 'https://router.huggingface.co/hf-inference/models';
const MAX_TEXT_CHARS = 2000;
const MAX_RETRIES = 4;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

function hfFeatureExtractionUrl(model: string): string {
  return `${HF_ROUTER_URL}/${model}/pipeline/feature-extraction`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function poolEmbedding(data: number[] | number[][]): number[] {
  if (!Array.isArray(data) || data.length === 0) {
    throw new BadRequestException('Empty embedding response from Hugging Face');
  }
  if (typeof data[0] === 'number') {
    return data as number[];
  }
  const matrix = data as number[][];
  const dims = matrix[0]?.length ?? 0;
  if (dims === 0) {
    throw new BadRequestException('Invalid embedding shape from Hugging Face');
  }
  const pooled = new Array(dims).fill(0);
  for (const row of matrix) {
    for (let i = 0; i < dims; i++) pooled[i] += row[i] ?? 0;
  }
  return pooled.map((v) => v / matrix.length);
}

async function hfRequestOnce(token: string, model: string, inputs: string[]): Promise<number[][]> {
  const url = hfFeatureExtractionUrl(model);
  const truncated = inputs.map((t) => t.slice(0, MAX_TEXT_CHARS));

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-wait-for-model': 'true',
      },
      body: JSON.stringify({ inputs: truncated.length === 1 ? truncated[0] : truncated }),
    });
  } catch (err) {
    const msg = (err as Error).message || 'fetch failed';
    throw new BadRequestException(
      `Cannot reach Hugging Face API (${msg}). Check network or try OpenAI in Settings.`,
    );
  }

  const body = await res.text();
  if (!res.ok) {
    const error = new Error(`Hugging Face API error (${res.status}): ${body.slice(0, 300) || res.statusText}`);
    (error as Error & { status?: number }).status = res.status;
    throw error;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new BadRequestException('Invalid JSON from Hugging Face embeddings API');
  }

  if (!Array.isArray(parsed)) {
    throw new BadRequestException('Unexpected Hugging Face embedding response');
  }

  if (truncated.length === 1) {
    return [poolEmbedding(parsed as number[] | number[][])];
  }

  return (parsed as (number[] | number[][])[]).map((item) => poolEmbedding(item));
}

async function hfRequestWithRetry(token: string, model: string, inputs: string[]): Promise<number[][]> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await hfRequestOnce(token, model, inputs);
    } catch (err) {
      const error = err as Error & { status?: number };
      lastError = error;
      const status = error.status ?? 0;
      if (!RETRYABLE_STATUS.has(status) && !(error instanceof BadRequestException)) {
        throw error;
      }
      if (error instanceof BadRequestException) throw error;

      const waitMs = 1000 * 2 ** attempt;
      logger.warn(
        `HF embed retry ${attempt + 1}/${MAX_RETRIES} after ${status} — waiting ${waitMs}ms`,
      );
      await sleep(waitMs);
    }
  }

  throw new BadRequestException(
    lastError?.message || 'Hugging Face embedding failed after retries',
  );
}

async function embedBatch(token: string, model: string, inputs: string[]): Promise<number[][]> {
  if (inputs.length === 0) return [];
  if (inputs.length === 1) {
    return hfRequestWithRetry(token, model, inputs);
  }

  try {
    return await hfRequestWithRetry(token, model, inputs);
  } catch (err) {
    logger.warn(`HF batch of ${inputs.length} failed, falling back to single requests`);
    const vectors: number[][] = [];
    for (const text of inputs) {
      const [vector] = await hfRequestWithRetry(token, model, [text]);
      vectors.push(vector);
      await sleep(250);
    }
    return vectors;
  }
}

export async function huggingFaceEmbeddings(
  texts: string[],
  token: string,
  model = DEFAULT_HF_EMBEDDING_MODEL,
): Promise<number[][]> {
  if (texts.length === 0) return [];
  return embedBatch(token, model, texts);
}

export async function validateHuggingFaceKey(
  token: string,
  model = DEFAULT_HF_EMBEDDING_MODEL,
): Promise<number> {
  const [vector] = await huggingFaceEmbeddings(['RepoPilot connectivity test'], token, model);
  return vector.length;
}
