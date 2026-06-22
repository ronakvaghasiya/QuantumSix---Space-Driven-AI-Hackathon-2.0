import { BadRequestException } from '@nestjs/common';
import OpenAI from 'openai';
import { HF_CHAT_BASE_URL } from '../../settings/llm-config';

const MAX_RETRIES = 3;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function parseJsonFromLlm(raw: string): unknown {
  const trimmed = raw.trim();
  const candidates = [
    trimmed,
    trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim(),
    trimmed.match(/\{[\s\S]*\}/)?.[0],
  ].filter((c): c is string => Boolean(c));

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      const repaired = repairTruncatedJson(candidate);
      if (repaired) {
        try {
          return JSON.parse(repaired);
        } catch {
          // try next candidate
        }
      }
    }
  }

  throw new BadRequestException('LLM did not return valid JSON');
}

/** Best-effort repair when the model hits max_tokens mid-string */
function repairTruncatedJson(raw: string): string | null {
  let text = raw.trim();
  if (!text.startsWith('{')) return null;

  // Drop trailing incomplete string / key
  text = text.replace(/,?\s*"[^"]*$/s, '');
  text = text.replace(/,?\s*$/s, '');

  const stack: string[] = [];
  let inString = false;
  let escape = false;

  for (const ch of text) {
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\') {
        escape = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') stack.push('}');
    else if (ch === '[') stack.push(']');
    else if (ch === '}' || ch === ']') stack.pop();
  }

  if (inString) text += '"';
  while (stack.length) text += stack.pop();
  return text;
}

export interface HuggingFaceCompletionOptions {
  maxTokens?: number;
}

export async function huggingFaceJsonCompletion<T>(
  token: string,
  model: string,
  system: string,
  user: string,
  options: HuggingFaceCompletionOptions = {},
): Promise<T> {
  const client = new OpenAI({
    apiKey: token,
    baseURL: HF_CHAT_BASE_URL,
  });

  const jsonSystem = `${system}\n\nYou MUST respond with ONLY a valid JSON object. No markdown, no explanation.`;

  const maxTokens = options.maxTokens ?? 4096;

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: jsonSystem },
          { role: 'user', content: user },
        ],
        temperature: 0.2,
        max_tokens: maxTokens,
      });

      const raw = response.choices[0]?.message?.content;
      if (!raw) throw new Error('Empty Hugging Face chat response');
      return parseJsonFromLlm(raw) as T;
    } catch (err) {
      lastError = err as Error;
      const status = (err as { status?: number }).status;
      if (status && RETRYABLE_STATUS.has(status) && attempt < MAX_RETRIES - 1) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      break;
    }
  }

  throw new BadRequestException(
    `Hugging Face chat failed: ${lastError?.message || 'unknown error'}`,
  );
}
