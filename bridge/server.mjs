#!/usr/bin/env node
import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { z } from 'zod';

const SERVICE = 'mindmesh-bridge';
const VERSION = '0.1.0';
const HOST = '127.0.0.1';
const PORT = Number(process.env.MINDMESH_BRIDGE_PORT || 4319);
const TOKEN =
  process.env.MINDMESH_BRIDGE_TOKEN || randomBytes(24).toString('base64url');
const MAX_BODY_BYTES = 256 * 1024;
const MAX_PROMPT_CHARS = 60_000;
const MAX_OUTPUT_BYTES = 5 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = Math.min(
  300_000,
  Math.max(5_000, Number(process.env.MINDMESH_BRIDGE_TIMEOUT_MS || 120_000)),
);
const MAX_CONCURRENT = 1;
const SANDBOX_DIR = path.join(os.tmpdir(), 'mindmesh-opencode-sandbox');

const DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];
const ALLOWED_ORIGINS = new Set(
  (process.env.MINDMESH_ALLOWED_ORIGINS
    ? process.env.MINDMESH_ALLOWED_ORIGINS.split(',')
    : DEFAULT_ORIGINS
  )
    .map((origin) => origin.trim())
    .filter(Boolean),
);

const generateRequestSchema = z
  .object({
    prompt: z.string().min(1).max(MAX_PROMPT_CHARS),
    model: z
      .string()
      .min(1)
      .max(200)
      .regex(/^[A-Za-z0-9._:@/-]+$/)
      .optional(),
    maxOutputTokens: z.number().int().min(64).max(8_000).optional(),
  })
  .strict();

let activeRequests = 0;
let modelCache = { at: 0, models: [] };
let versionCache = { at: 0, value: null };
let opencodePathCache;

mkdirSync(SANDBOX_DIR, { recursive: true });

function findOnPath(command) {
  const lookup = process.platform === 'win32' ? 'where.exe' : 'which';
  try {
    const result = spawnSync(lookup, [command], {
      encoding: 'utf8',
      timeout: 5_000,
      windowsHide: true,
    });
    if (result.status === 0) {
      const first = result.stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find(Boolean);
      if (first && existsSync(first) && first.toLowerCase().endsWith('.exe')) return first;
    }
  } catch {
    // Fall through to known install locations.
  }
  return null;
}

function resolveOpencode() {
  if (opencodePathCache !== undefined) return opencodePathCache;
  const configured = process.env.OPENCODE_BIN;
  if (configured && existsSync(configured)) {
    opencodePathCache = configured;
    return configured;
  }

  const candidates = [];
  if (process.env.APPDATA) {
    candidates.push(
      path.join(process.env.APPDATA, 'npm', 'node_modules', 'opencode-ai', 'bin', 'opencode.exe'),
    );
  }
  if (process.env.LOCALAPPDATA) {
    candidates.push(
      path.join(
        process.env.LOCALAPPDATA,
        'Programs',
        'opencode',
        'opencode.exe',
      ),
    );
  }
  if (process.env.HOME) {
    candidates.push(
      path.join(process.env.HOME, '.local', 'share', 'opencode', 'bin', 'opencode'),
      path.join(process.env.HOME, '.opencode', 'bin', 'opencode'),
    );
  }
  candidates.push('/usr/local/bin/opencode', '/opt/homebrew/bin/opencode');

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      opencodePathCache = candidate;
      return candidate;
    }
  }
  const onPath = findOnPath('opencode');
  opencodePathCache = onPath;
  return onPath;
}

function opencodeVersion() {
  const now = Date.now();
  if (versionCache.value && now - versionCache.at < 30_000) return versionCache.value;
  const binary = resolveOpencode();
  if (!binary) return null;
  const result = spawnSync(binary, ['--version'], {
    encoding: 'utf8',
    timeout: 10_000,
    windowsHide: true,
    env: { ...process.env, OPENCODE_DISABLE_AUTOUPDATE: '1' },
  });
  if (result.status !== 0) return null;
  const value = (result.stdout || '').trim().split(/\r?\n/)[0]?.slice(0, 120) || null;
  versionCache = { at: now, value };
  return value;
}

function securityHeaders(extra = {}) {
  return {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Cache-Control': 'no-store',
    ...extra,
  };
}

function corsHeaders(origin) {
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-MindMesh-Token',
    'Access-Control-Allow-Credentials': 'false',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}

function sendJson(res, status, payload, origin) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    ...securityHeaders(corsHeaders(origin)),
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function validToken(req) {
  const auth = req.headers.authorization;
  let supplied = '';
  if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
    supplied = auth.slice(7).trim();
  } else if (typeof req.headers['x-mindmesh-token'] === 'string') {
    supplied = req.headers['x-mindmesh-token'];
  }
  if (!supplied) return false;
  const a = Buffer.from(supplied);
  const b = Buffer.from(TOKEN);
  return a.length === b.length && timingSafeEqual(a, b);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Request body too large.'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(Object.assign(new Error('Request body must be valid JSON.'), { statusCode: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function runOpencode(args, { timeoutMs, signal, maxOutputTokens }) {
  return new Promise((resolve, reject) => {
    const binary = resolveOpencode();
    if (!binary) {
      reject(Object.assign(new Error('OpenCode CLI was not found.'), { code: 'cli-missing' }));
      return;
    }
    const env = {
      ...process.env,
      OPENCODE_DISABLE_AUTOUPDATE: '1',
      OPENCODE_DISABLE_LSP_DOWNLOAD: '1',
      ...(maxOutputTokens
        ? { OPENCODE_EXPERIMENTAL_OUTPUT_TOKEN_MAX: String(maxOutputTokens) }
        : {}),
    };
    const child = spawn(binary, args, {
      cwd: SANDBOX_DIR,
      env,
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish(new Error('The OpenCode request timed out.'), { code: 'timeout' });
    }, timeoutMs);

    const onAbort = () => {
      child.kill('SIGKILL');
      finish(new Error('The OpenCode request was cancelled.'), { code: 'cancelled' });
    };
    signal?.addEventListener('abort', onAbort, { once: true });

    function cleanup() {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }

    function finish(error, info) {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(Object.assign(error, info ?? {}));
      else resolve({ stdout, stderr });
    }

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
      if (stdout.length > MAX_OUTPUT_BYTES) {
        child.kill('SIGKILL');
        finish(new Error('OpenCode produced more output than the bridge allows.'), {
          code: 'output-too-large',
        });
      }
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
      if (stderr.length > 40_000) stderr = stderr.slice(0, 40_000);
    });
    child.on('error', (error) => {
      finish(new Error(`OpenCode could not be started: ${error.message}`), { code: 'spawn-failed' });
    });
    child.on('close', (code) => {
      if (settled) return;
      if (code === 0) finish(null);
      else
        finish(new Error(`OpenCode exited with code ${code ?? 'unknown'}.`), {
          code: 'cli-error',
        });
    });
  });
}

function parseOpenCodeEvents(stdout) {
  const textParts = [];
  let usage;
  let errorMessage = '';
  for (const line of stdout.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{')) continue;
    let event;
    try {
      event = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (event?.type === 'text' && typeof event.part?.text === 'string') {
      textParts.push(event.part.text);
    }
    if (event?.type === 'step_finish' && event.part?.tokens) {
      usage = {
        inputTokens: Number(event.part.tokens.input) || 0,
        outputTokens: Number(event.part.tokens.output) || 0,
        cost: Number(event.part.cost) || 0,
        reportedByProvider: true,
      };
    }
    if (event?.type === 'error') {
      errorMessage =
        event.error?.data?.message ||
        event.error?.message ||
        event.part?.error?.message ||
        'OpenCode returned an error event.';
    }
  }
  if (errorMessage) {
    const error = new Error(String(errorMessage).slice(0, 1_000));
    error.code = 'provider-error';
    throw error;
  }
  return { text: textParts.join(''), usage };
}

const server = http.createServer(async (req, res) => {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    sendJson(res, 403, { error: { code: 'origin-denied', message: 'Origin is not allowed.' } });
    return;
  }
  if (req.method === 'OPTIONS') {
    res.writeHead(204, securityHeaders(corsHeaders(origin)));
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://${HOST}:${PORT}`);

  if (!validToken(req)) {
    sendJson(
      res,
      401,
      {
        error: {
          code: 'unauthorized',
          message:
            'A valid MindMesh bridge token is required. Copy the token printed by the bridge process.',
        },
      },
      origin,
    );
    return;
  }

  try {
    if (req.method === 'GET' && url.pathname === '/health') {
      const version = opencodeVersion();
      sendJson(
        res,
        200,
        {
          ok: true,
          service: SERVICE,
          version: VERSION,
          opencode: {
            installed: Boolean(resolveOpencode()),
            ...(version ? { version } : {}),
            ...(!resolveOpencode()
              ? { error: 'OpenCode CLI was not found on this machine.' }
              : {}),
          },
          limits: {
            maxPromptChars: MAX_PROMPT_CHARS,
            requestTimeoutMs: REQUEST_TIMEOUT_MS,
          },
        },
        origin,
      );
      return;
    }

    if (req.method === 'GET' && url.pathname === '/models') {
      if (Date.now() - modelCache.at > 60_000 || modelCache.models.length === 0) {
        const { stdout } = await runOpencode(['models'], { timeoutMs: 20_000 });
        const models = stdout
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => /^[A-Za-z0-9._@:/-]+\/[A-Za-z0-9._@:/-]+$/.test(line))
          .slice(0, 2_000);
        modelCache = { at: Date.now(), models };
      }
      sendJson(res, 200, { models: modelCache.models }, origin);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/generate') {
      if (activeRequests >= MAX_CONCURRENT) {
        sendJson(
          res,
          429,
          {
            error: {
              code: 'busy',
              message: 'The bridge is already handling one AI request. Wait for it to finish.',
            },
          },
          origin,
        );
        return;
      }
      let parsed;
      try {
        parsed = generateRequestSchema.parse(await readBody(req));
      } catch (error) {
        const status = error?.statusCode || 400;
        sendJson(
          res,
          status,
          {
            error: {
              code: 'invalid-request',
              message:
                error instanceof z.ZodError
                  ? error.issues.map((issue) => issue.message).join('; ')
                  : error.message || 'Invalid request.',
            },
          },
          origin,
        );
        return;
      }

      activeRequests += 1;
      const startedAt = Date.now();
      const controller = new AbortController();
      req.on('aborted', () => controller.abort());
      res.on('close', () => {
        if (!res.writableEnded) controller.abort();
      });

      try {
        const args = ['run', '--format', 'json', '--dir', SANDBOX_DIR];
        if (parsed.model) args.push('--model', parsed.model);
        args.push(parsed.prompt);
        const { stdout, stderr } = await runOpencode(args, {
          timeoutMs: REQUEST_TIMEOUT_MS,
          signal: controller.signal,
          maxOutputTokens: parsed.maxOutputTokens,
        });
        let output;
        try {
          output = parseOpenCodeEvents(stdout);
        } catch (error) {
          const detail = stderr.trim().slice(0, 800);
          throw Object.assign(
            new Error(
              detail
                ? `${error.message} ${detail}`
                : error.message || 'OpenCode returned no usable response.',
            ),
            { code: error.code || 'invalid-response' },
          );
        }
        if (!output.text.trim()) {
          throw Object.assign(
            new Error(
              'OpenCode returned no text. Check that the selected model is available and authenticated.',
            ),
            { code: 'empty-response' },
          );
        }
        sendJson(
          res,
          200,
          {
            text: output.text,
            model: parsed.model || 'default',
            ...(output.usage ? { usage: output.usage } : {}),
            durationMs: Date.now() - startedAt,
          },
          origin,
        );
      } catch (error) {
        const code = error?.code || 'provider-error';
        let status = 502;
        if (code === 'timeout') status = 504;
        if (code === 'cancelled') status = 499;
        if (code === 'cli-missing') status = 503;
        if (code === 'busy') status = 429;
        if (code === 'empty-response' || code === 'invalid-response') status = 502;
        sendJson(
          res,
          status,
          {
            error: {
              code,
              message:
                code === 'timeout'
                  ? `OpenCode did not respond within ${Math.round(REQUEST_TIMEOUT_MS / 1000)} seconds.`
                  : String(error?.message || 'The AI request failed.').slice(0, 1_200),
            },
          },
          origin,
        );
      } finally {
        activeRequests -= 1;
      }
      return;
    }

    sendJson(
      res,
      404,
      { error: { code: 'not-found', message: 'Bridge endpoint not found.' } },
      origin,
    );
  } catch (error) {
    const code = error?.code || 'bridge-error';
    const message =
      code === 'timeout'
        ? 'The OpenCode command timed out.'
        : String(error?.message || 'The bridge failed.');
    sendJson(res, 500, { error: { code, message: message.slice(0, 1_200) } }, origin);
  }
});

server.on('clientError', (_error, socket) => {
  if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

server.listen(PORT, HOST, () => {
  const binary = resolveOpencode();
  console.info('');
  console.info('  MindMesh local AI bridge');
  console.info(`  URL:     http://${HOST}:${PORT}`);
  console.info(`  Token:   ${TOKEN}`);
  console.info(`  OpenCode: ${binary || 'NOT FOUND'}`);
  console.info(`  Allowed browser origins: ${[...ALLOWED_ORIGINS].join(', ')}`);
  console.info('');
  console.info('  Paste the URL and token into MindMesh → Settings → AI providers.');
  console.info('  The bridge binds to loopback only. Press Ctrl+C to stop it.');
  console.info('');
});

function shutdown(signal) {
  console.info(`\n[MindMesh bridge] ${signal} received — shutting down.`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5_000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
