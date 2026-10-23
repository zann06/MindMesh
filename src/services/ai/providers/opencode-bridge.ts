import { z } from 'zod';
import {
  bridgeGenerateResponseSchema,
  bridgeHealthSchema,
  bridgeModelsSchema,
} from '@/core/validation/schemas';
import { combineSignals } from '../abort';
import {
  AIProviderError,
  normalizeProviderError,
  type AIConnectionResult,
  type AIProvider,
  type AIProviderCapabilities,
  type AITextResult,
  type GenerateStructuredRequest,
  type GenerateTextRequest,
  type AIUsage,
} from '../types';

export interface OpenCodeBridgeOptions {
  baseUrl: string;
  token: string;
  model?: string;
  timeoutMs?: number;
  maxOutputTokens?: number;
  fetcher?: typeof fetch;
}

export class OpenCodeBridgeProvider implements AIProvider {
  readonly id = 'opencode-bridge';
  readonly label = 'OpenCode CLI bridge';
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly model?: string;
  private readonly timeoutMs: number;
  private readonly maxOutputTokens: number;
  private readonly fetcher: typeof fetch;

  constructor(options: OpenCodeBridgeOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.token = options.token;
    this.model = options.model?.trim() || undefined;
    this.timeoutMs = options.timeoutMs ?? 120_000;
    this.maxOutputTokens = options.maxOutputTokens ?? 2_000;
    this.fetcher = options.fetcher ?? fetch;
  }

  getCapabilities(): AIProviderCapabilities {
    return {
      structuredOutput: true,
      streaming: false,
      modelListing: true,
      localOnly: true,
    };
  }

  private headers(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.token}`,
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
        throw new AIProviderError(
          'invalid-response',
          'The local bridge returned a response that was not valid JSON.',
          { code: 'invalid-response' },
        );
      }
      if (!response.ok) {
        const message =
          (payload as { error?: { message?: string } } | null)?.error?.message ??
          `The local bridge returned HTTP ${response.status}.`;
        throw mapBridgeError(response.status, message);
      }
      return payload;
    } catch (error) {
      if (timedOut()) {
        throw new AIProviderError(
          'timeout',
          `The bridge did not respond within ${Math.round(timeout / 1000)} seconds.`,
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

  async testConnection(signal?: AbortSignal): Promise<AIConnectionResult> {
    if (!this.baseUrl) {
      return {
        ok: false,
        state: 'not-configured',
        message: 'Enter the local bridge URL first.',
      };
    }
    if (!this.token) {
      return {
        ok: false,
        state: 'not-configured',
        message: 'Enter the bridge token printed by the bridge process.',
      };
    }
    try {
      const healthPayload = await this.request('/health', { method: 'GET' }, signal, 12_000);
      const health = bridgeHealthSchema.parse(healthPayload);
      if (!health.opencode.installed) {
        return {
          ok: false,
          state: 'unavailable',
          message:
            'The bridge is running, but the OpenCode CLI was not found on this machine.',
          details: { bridgeVersion: health.version },
        };
      }
      const probe = await this.generateText({
        prompt:
          'Connection test for MindMesh. Reply with exactly the word OK and nothing else. Do not use tools or inspect files.',
        maxOutputTokens: 32,
        signal,
      });
      if (!probe.text.trim()) {
        return {
          ok: false,
          state: 'invalid-response',
          message: 'The bridge is reachable, but the model returned no text.',
        };
      }
      let models: string[] | undefined;
      try {
        models = await this.listModels(signal);
      } catch {
        models = undefined;
      }
      return {
        ok: true,
        state: 'connected',
        message: `Connected to OpenCode ${health.opencode.version ?? ''} via the local bridge. Test response: ${probe.text.trim().slice(0, 60)}`,
        models,
        details: {
          bridgeVersion: health.version,
          opencodeVersion: health.opencode.version ?? 'unknown',
          model: probe.model,
        },
      };
    } catch (error) {
      const normalized = normalizeProviderError(error);
      return {
        ok: false,
        state: normalized.state,
        message: normalized.message,
      };
    }
  }

  async listModels(signal?: AbortSignal): Promise<string[]> {
    const payload = await this.request('/models', { method: 'GET' }, signal, 25_000);
    return bridgeModelsSchema.parse(payload).models;
  }

  async generateText(request: GenerateTextRequest): Promise<AITextResult> {
    const payload = await this.request(
      '/generate',
      {
        method: 'POST',
        body: JSON.stringify({
          prompt: request.system
            ? `${request.system}\n\n---\n\n${request.prompt}`
            : request.prompt,
          ...(this.model ? { model: this.model } : {}),
          maxOutputTokens: request.maxOutputTokens ?? this.maxOutputTokens,
        }),
      },
      request.signal,
    );
    const parsed = bridgeGenerateResponseSchema.parse(payload);
    return {
      text: parsed.text,
      model: parsed.model,
      ...(parsed.usage ? { usage: parsed.usage as AIUsage } : {}),
      durationMs: parsed.durationMs,
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

function mapBridgeError(status: number, message: string): AIProviderError {
  if (status === 401 || status === 403) {
    return new AIProviderError('auth-failed', message, { code: 'auth-failed' });
  }
  if (status === 429) {
    return new AIProviderError('rate-limited', message, {
      code: 'rate-limited',
      retryable: true,
    });
  }
  if (status === 504) {
    return new AIProviderError('timeout', message, { code: 'timeout', retryable: true });
  }
  if (status === 503) {
    return new AIProviderError('unavailable', message, { code: 'unavailable' });
  }
  if (status === 499) {
    return new AIProviderError('cancelled', message, { code: 'cancelled' });
  }
  return new AIProviderError('unavailable', message, {
    code: `http-${status}`,
    retryable: status >= 500,
  });
}

export function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // Continue with fenced or embedded object extraction.
  }
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      // Continue.
    }
  }
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    try {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    } catch {
      // Fall through.
    }
  }
  throw new AIProviderError(
    'invalid-response',
    'The model did not return parseable JSON.',
    { code: 'invalid-response' },
  );
}
