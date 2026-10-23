const ACTIVE_PROJECT_KEY = 'mindmesh.active-project';
const ONBOARDING_KEY = 'mindmesh.onboarding-dismissed';

export function getActiveProjectId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_PROJECT_KEY);
  } catch {
    return null;
  }
}

export function setActiveProjectId(projectId: string): void {
  try {
    localStorage.setItem(ACTIVE_PROJECT_KEY, projectId);
  } catch {
    // Preference persistence is non-critical; IndexedDB remains the source of truth.
  }
}

export function isOnboardingDismissed(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissOnboarding(): void {
  try {
    localStorage.setItem(ONBOARDING_KEY, '1');
  } catch {
    // Ignore unavailable storage in private browsing modes.
  }
}

export function resetOnboarding(): void {
  try {
    localStorage.removeItem(ONBOARDING_KEY);
  } catch {
    // Ignore unavailable storage.
  }
}
