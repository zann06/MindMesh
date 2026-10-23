import { z } from 'zod';
import { combineSignals } from '../abort';
import {
  AIProviderError,
  normalizeProviderError,
  type AIConnectionResult,
  type AIProvider,
  type AIProviderCapabilities,
  type AITextResult,
  type AIUsage,
  type GenerateStructuredRequest,
  type GenerateTextRequest,
} from '../types';
import { extractJson } from './opencode-bridge';

export interface OpenAICompatibleOptions {
  baseUrl: string;
  apiKey?: string;
  model: string;
  timeoutMs?: number;
  maxOutputTokens?: number;
  fetcher?: typeof fetch;
}

const modelsPayloadSchema = z
  .object({
    data: z
      .array(
        z
          .object({
            id: z.string().min(1),
          })
          .loose(),
      )
      .optional(),
    models: z
      .array(
        z
          .object({
            name: z.string().min(1).optional(),
            id: z.string().min(1).optional(),
          })
          .loose(),
      )
      .optional(),
  })
  .loose();

const chatPayloadSchema = z
  .object({
    model: z.string().optional(),
    choices: z
      .array(
        z
          .object({
            message: z
              .object({
                content: z.union([z.string(), z.null()]).optional(),
              })
              .loose(),
          })
          .loose(),
      )
      .min(1),
    usage: z
      .object({
        prompt_tokens: z.number().optional(),
        completion_tokens: z.number().optional(),
      })
      .loose()
      .optional(),
  })
  .loose();

export class OpenAICompatibleProvider implements AIProvider {
  readonly id = 'openai-compatible';
  readonly label = 'User-owned OpenAI-compatible API';
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly maxOutputTokens: number;
  private readonly fetcher: typeof fetch;

  constructor(options: OpenAICompatibleOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.apiKey = options.apiKey?.trim() || undefined;
    this.model = options.model.trim();
    this.timeoutMs = options.timeoutMs ?? 90_000;
    this.maxOutputTokens = options.maxOutputTokens ?? 2_000;
    this.fetcher = options.fetcher ?? fetch;
  }

  getCapabilities(): AIProviderCapabilities {
    return {
      structuredOutput: true,
      streaming: false,
      modelListing: true,
      localOnly: /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(this.baseUrl),
    };
  }

  private headers(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
    };
  }

  private async request(
    path: string,
    init: RequestInit,
    signal?: AbortSignal,
    timeout = this.timeoutMs,
  ): Promise<unknown> {
    const { signal: composed, cancel, timedOut } = combineSignals(signal, timeout);
    try {
      const response = await this.fetcher(`${this.baseUrl}${path}`, {
        ...init,
        headers: { ...this.headers(), ...(init.headers ?? {}) },
        signal: composed,
        cache: 'no-store',
      });
      const rawText = await response.text();
      let payload: unknown = null;
      try {
        payload = rawText ? JSON.parse(rawText) : null;
      } catch {
        if (!response.ok) {
          throw httpError(response.status, `Provider returned HTTP ${response.status}.`);
        }
        throw new AIProviderError(
          'invalid-response',
          'The provider returned a response that was not valid JSON.',
          { code: 'invalid-response' },
        );
      }
      if (!response.ok) {
        const message =
          (payload as { error?: { message?: string } | string } | null)?.error;
        throw httpError(
          response.status,
          typeof message === 'string'
            ? message
            : message?.message ?? `Provider returned HTTP ${response.status}.`,
        );
      }
      return payload;
    } catch (error) {
      if (timedOut()) {
        throw new AIProviderError(
          'timeout',
          `The provider did not respond within ${Math.round(timeout / 1000)} seconds.`,
          { code: 'timeout', retryable: true, cause: error },
        );
      }
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new AIProviderError('cancelled', 'The AI request was cancelled.', {
          code: 'cancelled',
          cause: error,
        });
      }
      throw normalizeProviderError(error);
    } finally {
      cancel();
    }
  }

  async listModels(signal?: AbortSignal): Promise<string[]> {
    const payload = await this.request('/models', { method: 'GET' }, signal, 25_000);
    const parsed = modelsPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      throw new AIProviderError(
        'invalid-response',
        'The provider model list did not match a supported shape.',
        { code: 'invalid-response' },
      );
    }
    const ids = [
      ...(parsed.data.data ?? []).map((entry) => entry.id),
      ...(parsed.data.models ?? []).map((entry) => entry.id ?? entry.name ?? ''),
    ].filter(Boolean);
    return [...new Set(ids)].slice(0, 500);
  }

  async testConnection(signal?: AbortSignal): Promise<AIConnectionResult> {
    if (!this.baseUrl) {
      return {
        ok: false,
        state: 'not-configured',
        message: 'Enter the provider base URL.',
      };
    }
    if (!this.model) {
      return { ok: false, state: 'not-configured', message: 'Select a model first.' };
    }
    let models: string[] | undefined;
    try {
      models = await this.listModels(signal);
    } catch (error) {
      if (error instanceof AIProviderError && error.state === 'auth-failed') {
        return { ok: false, state: 'auth-failed', message: error.message };
      }
      models = undefined;
    }
    if (models && models.length > 0 && !models.includes(this.model)) {
      return {
        ok: false,
        state: 'model-unavailable',
        message: `The provider does not list "${this.model}". Pick a model from the list or correct the model ID.`,
        models,
      };
    }
    try {
      const probe = await this.generateText({
        prompt: 'Reply with exactly the word OK and nothing else. Do not use tools.',
        maxOutputTokens: 16,
        signal,
      });
      if (!probe.text.trim()) {
        return {
          ok: false,
          state: 'invalid-response',
          message: 'The provider is reachable, but the model returned no text.',
        };
      }
      return {
        ok: true,
        state: 'connected',
        message: `Connected. Test response: ${probe.text.trim().slice(0, 60)}`,
        ...(models ? { models } : {}),
        details: {
          model: this.model,
          ...(probe.usage?.inputTokens !== undefined
            ? { inputTokens: probe.usage.inputTokens }
            : {}),
        },
      };
    } catch (error) {
      const normalized = normalizeProviderError(error);
      return {
        ok: false,
        state: normalized.state,
        message: normalized.message,
        ...(models ? { models } : {}),
      };
    }
  }

  async generateText(request: GenerateTextRequest): Promise<AITextResult> {
    const messages = [
      ...(request.system
        ? [{ role: 'system' as const, content: request.system }]
        : []),
      { role: 'user' as const, content: request.prompt },
    ];
    const payload = await this.request(
      '/chat/completions',
      {
        method: 'POST',
        body: JSON.stringify({
          model: this.model,
          messages,
          max_tokens: request.maxOutputTokens ?? this.maxOutputTokens,
        }),
      },
      request.signal,
    );
    const parsed = chatPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      throw new AIProviderError(
        'invalid-response',
        'The provider chat response did not match a supported OpenAI-compatible shape.',
        { code: 'invalid-response' },
      );
    }
    const text = parsed.data.choices[0]?.message.content ?? '';
    const usage: AIUsage | undefined = parsed.data.usage
      ? {
          ...(parsed.data.usage.prompt_tokens !== undefined
            ? { inputTokens: parsed.data.usage.prompt_tokens }
            : {}),
          ...(parsed.data.usage.completion_tokens !== undefined
            ? { outputTokens: parsed.data.usage.completion_tokens }
            : {}),
          reportedByProvider: true,
        }
      : undefined;
    return {
      text,
      model: parsed.data.model ?? this.model,
      ...(usage ? { usage } : {}),
    };
  }

  async generateStructuredOutput<T>(request: GenerateStructuredRequest<T>): Promise<{
    data: T;
    raw: string;
    usage?: AIUsage;
  }> {
    const jsonSchema = z.toJSONSchema(request.schema);
    const result = await this.generateText({
      ...request,
      prompt: `${request.prompt}\n\nReturn only a JSON object matching this JSON Schema. No markdown fences, no commentary.\n\nJSON Schema:\n${JSON.stringify(jsonSchema)}`,
    });
    const parsed = extractJson(result.text);
    const validated = request.schema.safeParse(parsed);
    if (!validated.success) {
      throw new AIProviderError(
        'invalid-response',
        `The model returned JSON that did not match the ${request.schemaName} schema: ${validated.error.issues
          .slice(0, 3)
          .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
          .join('; ')}`,
        { code: 'invalid-response' },
      );
    }
    return { data: validated.data, raw: result.text, usage: result.usage };
  }

  dispose(): void {
    // Stateless fetch adapter.
  }
}

function httpError(status: number, message: string): AIProviderError {
  if (status === 401 || status === 403) {
    return new AIProviderError('auth-failed', message, { code: 'auth-failed' });
  }
  if (status === 429) {
    return new AIProviderError('rate-limited', message, {
      code: 'rate-limited',
      retryable: true,
    });
  }
  if (status === 404) {
    return new AIProviderError(
      'model-unavailable',
      message || 'The model or endpoint was not found.',
      { code: 'not-found' },
    );
  }
  return new AIProviderError('unavailable', message, {
    code: `http-${status}`,
    retryable: status >= 500,
  });
}
