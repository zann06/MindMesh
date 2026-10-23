export function combineSignals(
  signal: AbortSignal | undefined,
  timeoutMs: number,
): { signal: AbortSignal; cancel: () => void; timedOut: () => boolean } {
  const controller = new AbortController();
  let timedOut = false;
  const timer = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort(new DOMException('The AI request timed out.', 'TimeoutError'));
  }, timeoutMs);
  const onAbort = () => controller.abort(signal?.reason);
  if (signal) {
    if (signal.aborted) controller.abort(signal.reason);
    else signal.addEventListener('abort', onAbort, { once: true });
  }
  return {
    signal: controller.signal,
    cancel: () => {
      globalThis.clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    },
    timedOut: () => timedOut,
  };
}
