import { z } from 'zod';
import { create } from 'zustand';
import { LocalStorageAICache } from './cache';
import { OpenCodeBridgeProvider } from './providers/opencode-bridge';
import { OpenAICompatibleProvider } from './providers/openai-compatible';
import type { AIAvailabilityState, AIConnectionResult, AIProvider } from './types';

export type AIMode = 'disabled' | 'opencode' | 'openai-compatible';

export interface AISettings {
  mode: AIMode;
  bridgeUrl: string;
  bridgeToken: string;
  bridgeModel: string;
  openaiBaseUrl: string;
  openaiModel: string;
  openaiApiKey: string;
  consentToSendContent: boolean;
  timeoutMs: number;
  maxOutputTokens: number;
}

const SETTINGS_KEY = 'mindmesh.ai.settings';
const SECRETS_KEY = 'mindmesh.ai.session-secrets';

const publicSettingsSchema = z
  .object({
    mode: z.enum(['disabled', 'opencode', 'openai-compatible']),
    bridgeUrl: z.string().max(500),
    bridgeModel: z.string().max(300),
    openaiBaseUrl: z.string().max(500),
    openaiModel: z.string().max(300),
    consentToSendContent: z.boolean(),
    timeoutMs: z.number().int().min(5_000).max(300_000),
    maxOutputTokens: z.number().int().min(64).max(8_000),
  })
  .partial();

const secretsSchema = z
  .object({
    bridgeToken: z.string().max(1_000).optional(),
    openaiApiKey: z.string().max(10_000).optional(),
  })
  .partial();

export const defaultAISettings: AISettings = {
  mode: 'disabled',
  bridgeUrl:
    (import.meta.env.VITE_BRIDGE_URL as string | undefined) ?? 'http://127.0.0.1:4319',
  bridgeToken: (import.meta.env.VITE_MINDMESH_BRIDGE_TOKEN as string | undefined) ?? '',
  bridgeModel: '',
  openaiBaseUrl: 'https://api.openai.com/v1',
  openaiModel: '',
  openaiApiKey: '',
  consentToSendContent: false,
  timeoutMs: 120_000,
  maxOutputTokens: 2_500,
};

export function loadAISettings(): AISettings {
  let publicSettings: Partial<AISettings> = {};
  let secrets: Partial<Pick<AISettings, 'bridgeToken' | 'openaiApiKey'>> = {};
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = publicSettingsSchema.safeParse(JSON.parse(raw));
      if (parsed.success) publicSettings = parsed.data;
    }
  } catch {
    // Corrupt settings are ignored, never applied blindly.
  }
  try {
    const raw = sessionStorage.getItem(SECRETS_KEY);
    if (raw) {
      const parsed = secretsSchema.safeParse(JSON.parse(raw));
      if (parsed.success) secrets = parsed.data;
    }
  } catch {
    // Session storage may be unavailable.
  }
  return {
    ...defaultAISettings,
    ...publicSettings,
    ...secrets,
  };
}

export function saveAISettings(settings: AISettings): void {
  try {
    const publicSettings = {
      mode: settings.mode,
      bridgeUrl: settings.bridgeUrl,
      bridgeModel: settings.bridgeModel,
      openaiBaseUrl: settings.openaiBaseUrl,
      openaiModel: settings.openaiModel,
      consentToSendContent: settings.consentToSendContent,
      timeoutMs: settings.timeoutMs,
      maxOutputTokens: settings.maxOutputTokens,
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(publicSettings));
  } catch {
    // Non-fatal: settings remain usable for the current session.
  }
  try {
    sessionStorage.setItem(
      SECRETS_KEY,
      JSON.stringify({
        bridgeToken: settings.bridgeToken,
        openaiApiKey: settings.openaiApiKey,
      }),
    );
  } catch {
    // API keys are never written to localStorage or project exports.
  }
}

export function isAIConfigured(settings: AISettings): boolean {
  if (settings.mode === 'disabled') return false;
  if (settings.mode === 'opencode') {
    return Boolean(settings.bridgeUrl.trim() && settings.bridgeToken.trim());
  }
  return Boolean(settings.openaiBaseUrl.trim() && settings.openaiModel.trim());
}

export function createAIProvider(
  settings: AISettings,
  fetcher?: typeof fetch,
): AIProvider | null {
  if (settings.mode === 'opencode') {
    return new OpenCodeBridgeProvider({
      baseUrl: settings.bridgeUrl,
      token: settings.bridgeToken,
      model: settings.bridgeModel || undefined,
      timeoutMs: settings.timeoutMs,
      maxOutputTokens: settings.maxOutputTokens,
      fetcher,
    });
  }
  if (settings.mode === 'openai-compatible') {
    return new OpenAICompatibleProvider({
      baseUrl: settings.openaiBaseUrl,
      apiKey: settings.openaiApiKey || undefined,
      model: settings.openaiModel,
      timeoutMs: settings.timeoutMs,
      maxOutputTokens: settings.maxOutputTokens,
      fetcher,
    });
  }
  return null;
}

export function providerModelFor(settings: AISettings): string {
  return settings.mode === 'opencode'
    ? settings.bridgeModel || 'default OpenCode model'
    : settings.openaiModel || 'not selected';
}

export interface AIConnectionStatus {
  state: AIAvailabilityState;
  message: string;
  lastTestedAt?: string;
  models: string[];
}

interface AISettingsStore {
  settings: AISettings;
  status: AIConnectionStatus;
  modelsLoading: boolean;
  updateSettings: (patch: Partial<AISettings>) => void;
  testConnection: (signal?: AbortSignal) => Promise<AIConnectionResult>;
  loadModels: (signal?: AbortSignal) => Promise<void>;
  clearCache: () => Promise<void>;
  markSettingsChanged: () => void;
}

export const useAISettingsStore = create<AISettingsStore>((set, get) => ({
  settings: loadAISettings(),
  status: {
    state: 'not-configured',
    message: 'AI is optional and off until you configure a provider and test it.',
    models: [],
  },
  modelsLoading: false,
  updateSettings: (patch) => {
    const previous = get().settings;
    const next = { ...previous, ...patch };
    const providerChanged =
      next.mode !== previous.mode ||
      next.bridgeUrl !== previous.bridgeUrl ||
      next.openaiBaseUrl !== previous.openaiBaseUrl;
    const connectionChanged =
      providerChanged ||
      next.bridgeToken !== previous.bridgeToken ||
      next.openaiApiKey !== previous.openaiApiKey;
    saveAISettings(next);
    set({
      settings: next,
      status: {
        ...get().status,
        state: 'not-configured',
        message:
          next.mode === 'disabled'
            ? 'AI features are disabled. Core document, graph, and quiz features remain fully available.'
            : 'Settings changed. Test the connection before using AI features.',
        lastTestedAt: connectionChanged ? undefined : get().status.lastTestedAt,
        models: providerChanged || next.mode === 'disabled' ? [] : get().status.models,
      },
    });
  },
  markSettingsChanged: () => {
    set({
      status: {
        ...get().status,
        state: 'not-configured',
        message: 'Settings changed. Test the connection again.',
      },
    });
  },
  testConnection: async (signal) => {
    const settings = get().settings;
    const provider = createAIProvider(settings);
    if (!provider) {
      const status = {
        state: 'not-configured' as const,
        message: 'Select an AI provider mode and configure it first.',
        models: [],
      };
      set({ status });
      return { ok: false, ...status };
    }
    set({
      status: {
        ...get().status,
        state: 'testing',
        message: 'Testing the connection with a minimal real request…',
      },
    });
    const result = await provider.testConnection(signal);
    set({
      status: {
        state: result.state,
        message: result.message,
        ...(result.ok ? { lastTestedAt: new Date().toISOString() } : {}),
        models: result.models ?? get().status.models,
      },
    });
    provider.dispose();
    return result;
  },
  loadModels: async (signal) => {
    const settings = get().settings;
    const provider = createAIProvider(settings);
    if (!provider) return;
    set({ modelsLoading: true });
    try {
      const models = await provider.listModels(signal);
      set({
        modelsLoading: false,
        status: { ...get().status, models },
      });
    } catch (error) {
      set({
        modelsLoading: false,
        status: {
          ...get().status,
          state: 'unavailable',
          message:
            error instanceof Error
              ? error.message
              : 'Could not list models from this provider.',
        },
      });
    } finally {
      provider.dispose();
    }
  },
  clearCache: async () => {
    await new LocalStorageAICache().clear();
  },
}));
