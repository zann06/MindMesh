import type { ZodType } from 'zod';

export type AIAvailabilityState =
  | 'not-configured'
  | 'detecting'
  | 'testing'
  | 'connected'
  | 'model-unavailable'
  | 'rate-limited'
  | 'auth-failed'
  | 'timeout'
  | 'unavailable'
  | 'invalid-response'
  | 'cancelled';

export interface AIUsage {
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
  reportedByProvider: boolean;
}

export interface AITextResult {
  text: string;
  model: string;
  usage?: AIUsage;
  durationMs?: number;
}

export interface AIConnectionResult {
  ok: boolean;
  state: AIAvailabilityState;
  message: string;
  models?: string[];
  details?: Record<string, string | number | boolean>;
}

export interface AIProviderCapabilities {
  structuredOutput: boolean;
  streaming: boolean;
  modelListing: boolean;
  localOnly: boolean;
}

export interface GenerateTextRequest {
  prompt: string;
  system?: string;
  signal?: AbortSignal;
  maxOutputTokens?: number;
}

export interface GenerateStructuredRequest<T> extends GenerateTextRequest {
  schema: ZodType<T>;
  schemaName: string;
}

export interface AIProvider {
  readonly id: string;
  readonly label: string;
  getCapabilities(): AIProviderCapabilities;
  testConnection(signal?: AbortSignal): Promise<AIConnectionResult>;
  listModels(signal?: AbortSignal): Promise<string[]>;
  generateText(request: GenerateTextRequest): Promise<AITextResult>;
  generateStructuredOutput<T>(request: GenerateStructuredRequest<T>): Promise<{
    data: T;
    raw: string;
    usage?: AIUsage;
  }>;
  dispose(): void;
}

export class AIProviderError extends Error {
  readonly code: string;
  readonly state: AIAvailabilityState;
  readonly retryable: boolean;

  constructor(
    state: AIAvailabilityState,
    message: string,
    options: { code?: string; retryable?: boolean; cause?: unknown } = {},
  ) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = 'AIProviderError';
    this.state = state;
    this.code = options.code ?? state;
    this.retryable = options.retryable ?? false;
  }
}

export function normalizeProviderError(error: unknown): AIProviderError {
  if (error instanceof AIProviderError) return error;
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new AIProviderError('cancelled', 'The AI request was cancelled.', {
      code: 'cancelled',
    });
  }
  if (error instanceof TypeError) {
    return new AIProviderError(
      'unavailable',
      'The AI provider could not be reached. Check the URL, your network, and whether the provider is running.',
      { code: 'network', retryable: true, cause: error },
    );
  }
  return new AIProviderError(
    'unavailable',
    error instanceof Error ? error.message : 'The AI request failed.',
    { cause: error },
  );
}
