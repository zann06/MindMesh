import { beforeEach, describe, expect, it } from 'vitest';
import { useAISettingsStore } from '@/services/ai/settings';

describe('AI connection status', () => {
  beforeEach(() => {
    localStorage.clear();
    useAISettingsStore.setState((state) => ({
      settings: {
        ...state.settings,
        mode: 'openai-compatible' as const,
        openaiBaseUrl: 'https://api.openai.com/v1',
        openaiModel: 'old-model',
      },
      status: {
        state: 'connected',
        message: 'Connected',
        models: ['old-model', 'new-model'],
        lastTestedAt: '2026-10-21T10:00:00.000Z',
      },
    }));
  });

  it('clears stale models and test results when the endpoint changes', () => {
    useAISettingsStore.getState().updateSettings({
      openaiBaseUrl: 'https://example.test/v1',
    });

    const status = useAISettingsStore.getState().status;
    expect(status.state).toBe('not-configured');
    expect(status.models).toEqual([]);
    expect(status.lastTestedAt).toBeUndefined();
  });

  it('keeps provider models when only the selected model changes', () => {
    useAISettingsStore.getState().updateSettings({ openaiModel: 'new-model' });

    const status = useAISettingsStore.getState().status;
    expect(status.models).toEqual(['old-model', 'new-model']);
    expect(status.lastTestedAt).toBe('2026-10-21T10:00:00.000Z');
  });
});
