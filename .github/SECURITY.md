# Security policy

MindMesh is pre-1.0. Security fixes are applied to the latest published version only.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability.

Use the private security advisory or private maintainer contact channel provided by the repository host. If no private channel is published, ask a maintainer for one without including exploit details in public.

Please include:

- affected version or commit
- a concise description of the impact
- reproduction steps or a proof of concept
- relevant browser and operating system
- whether user data, credentials, or the local bridge are involved

Do not access other users' data, perform denial-of-service testing, or test against systems you do not own.

## Scope

In scope:

- cross-site scripting or unsafe HTML rendering
- project import validation bypass
- credential exposure through storage, exports, URLs, or logs
- bridge authentication or CORS bypass
- command injection or unsafe process invocation in the bridge
- path traversal or unintended file access
- exfiltration of document content without consent
- AI output used in a way that bypasses schema or evidence validation
- dependency vulnerabilities that affect the shipped application

Out of scope:

- browser extensions, malware, or device access outside the web origin
- provider-side retention or model behavior
- denial of service against your own local environment
- social engineering
- reports requiring a compromised browser profile
- missing hardening headers on a third-party static host that do not create a concrete vulnerability

## Security design

### Local-first storage

Projects are stored in IndexedDB. Original file binaries are not stored. Exports are generated locally and exclude AI settings, bridge tokens, API keys, and the AI cache.

Browser storage is readable by software with access to the browser profile, including some extensions. MindMesh does not claim encryption at rest beyond browser protections.

### AI credentials

- Bridge tokens and optional API keys are stored in `sessionStorage`.
- Non-secret settings are stored in `localStorage`.
- Secrets are not included in project records or exports.
- Secrets are not sent in URL query parameters.
- Build-time secrets must not be used in public deployments; Vite environment variables are compiled into client assets.

### Document content

Core import, storage, search, graph, and quiz features make no AI request. AI analysis requires explicit consent for each run and sends a bounded set of extracted-text chunks to the configured provider or local bridge.

The local bridge does not guarantee a local model. OpenCode may forward content to a remote provider based on its configuration.

### Local bridge

The bridge:

- listens on `127.0.0.1` only
- requires a bearer token on every endpoint, including health
- compares tokens in constant time
- restricts browser origins
- validates request shape and size
- limits concurrency, output, and duration
- invokes OpenCode with `shell: false` and fixed arguments
- uses a temporary sandbox directory
- does not persist prompts or responses

Anyone with local code execution and the bridge token can make requests. Run the bridge only when needed and stop it when finished.

### Imported data

Imported JSON is untrusted. It is parsed, schema-validated, migrated only for supported versions, integrity-checked, and ID-remapped. Import never executes code and never merges into an existing project.

### AI output

AI output is treated as untrusted data. It is parsed as JSON, validated against schemas, checked for usable evidence, and presented as reviewable suggestions. Model output is never evaluated as code or used to construct shell arguments.

## Deployment guidance

- Serve the production build over HTTPS.
- Do not set `VITE_MINDMESH_BRIDGE_TOKEN` for a public build.
- Do not expose the bridge to a network interface.
- Use an explicit `MINDMESH_ALLOWED_ORIGINS` list.
- Set a strong, unique `MINDMESH_BRIDGE_TOKEN` if you need a stable token.
- Treat exports as sensitive: they can contain full extracted document text and learning history.
- Keep dependencies current and review lockfile changes.

## Known limitations

- No server-side access control or multi-user isolation.
- No protection from a compromised browser, extension, or operating system.
- No encrypted project vault beyond browser storage.
- No OCR; scanned documents are reported rather than silently processed.
- No security certification or audit has been performed.
