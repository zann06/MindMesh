// @vitest-environment node
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const TOKEN = 'mindmesh-bridge-test-token';
const ALLOWED_ORIGIN = 'http://localhost:5173';
const BRIDGE_PATH = fileURLToPath(new URL('../../bridge/server.mjs', import.meta.url));

let bridge: ChildProcess;
let baseUrl: string;

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close(() => reject(new Error('Could not allocate a loopback test port.')));
        return;
      }
      const { port } = address;
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

async function request(
  path: string,
  init: RequestInit = {},
  token: string | null = TOKEN,
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (token !== null) headers.set('Authorization', `Bearer ${token}`);
  return fetch(`${baseUrl}${path}`, { ...init, headers });
}

beforeAll(async () => {
  const port = await freePort();
  baseUrl = `http://127.0.0.1:${port}`;
  bridge = spawn(process.execPath, [BRIDGE_PATH], {
    env: {
      ...process.env,
      MINDMESH_BRIDGE_TOKEN: TOKEN,
      MINDMESH_BRIDGE_PORT: String(port),
      OPENCODE_BIN: process.execPath,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  let stderr = '';
  bridge.stderr?.on('data', (chunk) => {
    stderr += String(chunk);
  });

  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (bridge.exitCode !== null) {
      throw new Error(`Bridge exited during startup (code ${bridge.exitCode}): ${stderr}`);
    }
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.status === 401) return;
    } catch {
      // The server is not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Bridge did not start in time: ${stderr}`);
}, 15_000);

afterAll(async () => {
  if (!bridge || bridge.exitCode !== null) return;
  const exited = new Promise((resolve) => bridge.once('exit', resolve));
  bridge.kill();
  await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 3_000))]);
  if (bridge.exitCode === null) bridge.kill('SIGKILL');
});

describe('local OpenCode bridge', () => {
  it('requires the session token for every endpoint', async () => {
    const missing = await request('/health', {}, null);
    expect(missing.status).toBe(401);

    const wrong = await request('/health', {}, 'wrong-token');
    expect(wrong.status).toBe(401);
  });

  it('reports health and hard limits without exposing model data', async () => {
    const response = await request('/health');
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');

    const body = await response.json();
    expect(body).toMatchObject({
      ok: true,
      service: 'mindmesh-bridge',
      version: '0.1.0',
      limits: {
        maxPromptChars: 60_000,
      },
    });
    expect(typeof body.opencode.installed).toBe('boolean');
    expect(JSON.stringify(body)).not.toContain(TOKEN);
  });

  it('allows configured browser origins and rejects unknown origins', async () => {
    const allowed = await request('/health', {
      headers: { Origin: ALLOWED_ORIGIN },
    });
    expect(allowed.status).toBe(200);
    expect(allowed.headers.get('access-control-allow-origin')).toBe(ALLOWED_ORIGIN);

    const denied = await request('/health', {
      headers: { Origin: 'https://untrusted.example' },
    });
    expect(denied.status).toBe(403);
    expect(denied.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('answers preflight requests without requiring the token', async () => {
    const response = await request(
      '/generate',
      {
        method: 'OPTIONS',
        headers: {
          Origin: ALLOWED_ORIGIN,
          'Access-Control-Request-Method': 'POST',
        },
      },
      null,
    );
    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-methods')).toContain('POST');
  });

  it('rejects malformed generate requests before invoking OpenCode', async () => {
    const response = await request('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: ALLOWED_ORIGIN },
      body: JSON.stringify({ unexpected: true }),
    });
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error.code).toBe('invalid-request');
  });

  it('does not expose unknown endpoints', async () => {
    const response = await request('/admin');
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe('not-found');
  });
});
