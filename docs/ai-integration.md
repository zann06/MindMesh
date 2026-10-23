# AI integration and local bridge

AI is optional. MindMesh's document library, graph editing, search, quizzes, progress, import, and export work without any provider.

## Modes

| Mode | Transport | Credential |
| --- | --- | --- |
| Off | None | None |
| OpenCode CLI bridge | Browser to loopback HTTP bridge | Bridge token |
| OpenAI-compatible | Browser directly to configured endpoint | Optional API key |

The default mode is **Off**.

## Connection status

A provider is not shown as connected merely because fields are filled in. The Settings page performs a real test:

- **OpenCode bridge:** `GET /health`, then a minimal generation request, then an optional model listing.
- **OpenAI-compatible:** a real models or chat request, depending on provider support.

A failed test leaves the provider disabled and displays an error. Settings changes reset the tested state. A previously working connection may remain visible for the current page session, but it is not fabricated from stored configuration alone.

## Configuration storage

Public settings:

- key: `mindmesh.ai.settings`
- storage: `localStorage`
- contents: mode, bridge URL, model names, OpenAI-compatible base URL, consent preference, timeout, output limit

Secrets:

- key: `mindmesh.ai.session-secrets`
- storage: `sessionStorage`
- contents: bridge token and optional OpenAI-compatible API key

Secrets are not written to `localStorage`, project records, exports, or logs. They are cleared when the browser tab session ends.

Build-time environment variables exist for local development only. `VITE_MINDMESH_BRIDGE_TOKEN` is compiled into the client bundle and must never be used as a secret in a public deployment.

## Analysis flow

1. The user opens the AI review panel for a document.
2. The panel explains what will be sent and asks for explicit consent for this run.
3. If AI is not configured or tested, analysis is unavailable.
4. Extracted text is chunked.
5. Up to the configured number of chunks are sent.
6. The provider returns structured JSON.
7. MindMesh extracts and validates the JSON against the concept/relationship schema.
8. Proposed evidence excerpts are checked against the stored document text.
9. Valid suggestions are written to the local analysis cache.
10. The user accepts or rejects each suggestion.
11. Accepting creates project records with AI provenance and `suggested` review status.

Analysis is bounded:

- chunk size: 6000 characters
- overlap: 350 characters
- maximum chunks per run: 8
- prompt version: `mindmesh-concepts-2026-10-1`
- cache TTL: 7 days
- cache size: 40 validated entries
- no unbounded automatic re-analysis

Cached values contain quoted excerpts and generated descriptions, but not complete document text.

## Output validation

AI output is untrusted. MindMesh:

- requires JSON
- validates with Zod schemas
- rejects unknown or malformed relationship types
- rejects concepts without usable labels or evidence
- verifies quoted excerpts against the source
- marks accepted output as suggestions, not confirmed facts
- preserves rejection state

A model response never executes code or shell commands.

## OpenAI-compatible mode

The browser sends requests to the base URL configured by the user. Typical endpoints are a compatible server's `/models` and `/chat/completions`.

MindMesh does not proxy or retain these requests. The provider can see:

- the prompt content
- request metadata
- the network address of the client
- any API key supplied

Review the provider's retention and training policy before sending private content. MindMesh cannot enforce a provider's zero-retention claims.

## OpenCode bridge

### Start

```bash
npm run bridge
```

Or run directly:

```bash
node bridge/server.mjs
```

The bridge binds to `127.0.0.1` only. It prints its URL and token. Set a stable token with `MINDMESH_BRIDGE_TOKEN` if desired.

Environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `MINDMESH_BRIDGE_PORT` | `4319` | Loopback port |
| `MINDMESH_BRIDGE_TOKEN` | random per run | Required bearer token |
| `MINDMESH_ALLOWED_ORIGINS` | local Vite/preview origins | Comma-separated browser origins |
| `MINDMESH_BRIDGE_TIMEOUT_MS` | `120000` | Per-request timeout, clamped to 5–300 seconds |
| `OPENCODE_BIN` | auto-detected | Path to the OpenCode CLI |

Default allowed origins:

- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `http://localhost:4173`
- `http://127.0.0.1:4173`

The Playwright preview uses port `4373`; add `http://127.0.0.1:4373` to `MINDMESH_ALLOWED_ORIGINS` if you test bridge calls through that preview.

### Endpoints

All endpoints require the token.

Send it as:

```http
Authorization: Bearer <token>
```

`X-MindMesh-Token` is also accepted for compatibility. The token is never accepted from a URL query parameter.

#### `GET /health`

Returns bridge state and limits. It does not return the token.

```json
{
  "ok": true,
  "service": "mindmesh-bridge",
  "version": "0.1.0",
  "opencode": {
    "installed": true,
    "version": "..."
  },
  "limits": {
    "maxPromptChars": 60000,
    "requestTimeoutMs": 120000
  }
}
```

#### `GET /models`

Runs `opencode models`, filters output to plausible `provider/model` identifiers, and caches the result for 60 seconds.

#### `POST /generate`

Request:

```json
{
  "prompt": "string",
  "model": "optional-provider/model",
  "maxOutputTokens": 2000
}
```

`prompt` is required and limited to 60,000 characters. `model` is restricted to a safe character set. Output is limited to 5 MB.

Success:

```json
{
  "text": "string",
  "model": "default",
  "usage": {
    "inputTokens": 0,
    "outputTokens": 0,
    "cost": 0,
    "reportedByProvider": true
  },
  "durationMs": 1234
}
```

`usage` is included only when OpenCode reports it.

### Bridge controls

- Loopback binding only
- Token required on every endpoint
- Constant-time token comparison
- Origin allowlist
- JSON body limit: 256 KiB
- Prompt limit: 60,000 characters
- Output limit: 5 MB
- One concurrent generation request
- Request timeout
- Fixed OpenCode arguments with `shell: false`
- Temporary sandbox working directory
- No prompt or response persistence
- Security headers and `Cache-Control: no-store`

Error codes include `unauthorized`, `origin-denied`, `invalid-request`, `busy`, `timeout`, `cancelled`, `cli-missing`, `cli-error`, `empty-response`, `invalid-response`, and `not-found`.

### What the bridge does not guarantee

A loopback bridge is local transport, not a local model. OpenCode may send prompts to a remote model provider according to its own configuration. MindMesh cannot audit or enforce that provider's data handling.

The bridge does not sandbox the model's decisions beyond invoking OpenCode with fixed arguments and a temporary working directory. It does not grant the model tools intentionally, but OpenCode behavior depends on the installed version and configuration.

## Threat model

| Boundary | Consideration |
| --- | --- |
| Browser profile | Local projects and non-secret settings are readable by software with profile access |
| Browser extensions | Can read page content and storage; MindMesh cannot prevent this |
| Provider endpoint | Receives content and credentials by design |
| Local bridge | Any local process that obtains the token can make requests |
| Custom origins | Only explicitly allowed origins receive CORS headers |
| Imported JSON | Validated; never executed |
| AI output | Treated as untrusted and schema-validated |

## Non-goals

MindMesh does not:

- provide a shared or developer API key
- hide that content leaves the device when AI runs
- claim a connection without testing
- claim zero retention on behalf of a provider
- run AI on import automatically
- retry AI requests without bounds
- use AI output as verified fact
- execute model-generated commands
