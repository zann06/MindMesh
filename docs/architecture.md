# Architecture

MindMesh is a static React application with no application backend. The core data path is:

```text
file or sample
    -> parser
    -> validated project record
    -> IndexedDB
    -> feature pages
    -> optional export
```

AI is an optional side path. It never becomes part of the import path and never writes directly to the graph.

## Design principles

1. **Local first.** Projects are complete local records. Core use performs no AI or backend request.
2. **Evidence over assertion.** Concepts and relationships can be traced to stored excerpts and document locations.
3. **Honest state.** The UI does not invent data, progress, provider status, citations, or completed work.
4. **Explicit consent.** Imported content is not sent to an AI provider merely because AI is configured.
5. **Untrusted output.** AI output is parsed, schema-validated, evidence-checked, and shown as reviewable suggestions.
6. **Accessible fallback.** The 3D universe is never the only interface to the graph.
7. **Portable records.** Exports are versioned, inspectable JSON; imports are validated and remapped.

## Runtime startup

`src/main.tsx` mounts `App`. `App` calls `workspace-store.init()` once per mount, guarded against concurrent initialization.

Initialization:

1. Opens IndexedDB database `mindmesh`, object store `projects`, index `by-updated`.
2. Loads project records through the repository.
3. Validates and migrates each stored project.
4. Selects the project referenced by `localStorage["mindmesh.active-project"]`, or the most recently updated project.
5. Publishes `initialized` or a recoverable `error`.

The startup splash offers retry and a deliberate local-data reset. It does not silently discard corrupt records.

## Domain model

Domain types live in `src/core/domain/types.ts`. The current schema version is `1`.

A `KnowledgeProject` contains:

- `projectId`, `name`, `description`, timestamps, `schemaVersion`
- `documents`
- `concepts`
- `relationships`
- `quizzes`
- `attempts`
- `learningRecords`
- `preferences`

### Documents

A `DocumentRecord` stores metadata, a content hash, extracted text, document sections, warnings, and processing status. It does not store the original PDF or Markdown binary.

For PDFs, sections represent pages. For Markdown, sections represent headings and their text ranges.

### Concepts

A concept contains a label, optional aliases, description, tags, provenance, review status, and source references. Source references identify a document, offsets or page number, and a quoted excerpt.

Provenance distinguishes manual records from AI suggestions and records review state. Rejecting a concept also rejects its AI provenance.

### Relationships

Relationships have a typed direction and a review status. Supported types:

- `prerequisite`
- `part-of`
- `related-to`
- `contrasts-with`
- `causes`
- `example-of`

Direction semantics are defined in `RELATION_TYPE_META`. `related-to` has no inherent direction.

### Learning records

Quizzes contain validated questions and source references. Attempts store answers and scores. Learning records aggregate attempts and accuracy.

Mastery is conservative:

- `mastered`: attempts >= 5 and accuracy >= 0.8
- `familiar`: attempts >= 3 and accuracy >= 0.6
- otherwise `learning`

## Storage

`src/core/storage/` contains the browser repository and settings helpers.

- `indexeddb.ts`: browser persistence
- `memory.ts`: in-memory repository for tests
- `repository.ts`: storage interface
- `browser-settings.ts`: non-project preferences

IndexedDB is the durable store. Browser storage is not a backup system: browsers may evict it. The UI tells users to export important projects.

## Validation and migration

`src/core/validation/` owns the trust boundary for imported and stored JSON.

- `schemas.ts`: Zod schemas
- `migration.ts`: supported schema upgrades
- `integrity.ts`: cross-entity checks and warnings

Validation covers entity shapes, enum values, timestamps, IDs, numeric ranges, relationship endpoints, quiz references, and evidence offsets. Unknown or unsupported schema versions are rejected rather than guessed.

## Import and export

`src/core/import-export/project-io.ts` builds and prepares portable project files.

Export:

- creates a versioned manifest
- defaults to including extracted text and learning history, with user options
- excludes provider configuration, credentials, bridge tokens, AI cache, and unrelated preferences
- triggers a browser download from a local Blob

Import:

- requires a JSON file within the size limit
- parses and validates the manifest
- migrates supported older schemas
- checks cross-entity integrity
- shows a preview before writing
- **always creates a new project**
- remaps every document, concept, relationship, quiz, question, attempt, and learning-record ID
- never merges into or overwrites an existing project

## Document parsing

`src/services/document-parser/` handles Markdown and selectable-text PDFs.

### Markdown

The parser sanitizes scripts, styles, and HTML comments before lexing headings and sections. The document viewer shows plain extracted text, not a rendered Markdown preview. This avoids introducing a second untrusted rendering path.

### PDF

PDF.js extracts selectable text page by page. The worker is bundled with the application; no CDN is used.

The parser:

- cleans whitespace and control characters
- builds page sections with offsets
- reports pages with no text
- reports image-only PDFs explicitly and states that OCR is not included
- maps password and invalid-file failures to typed errors
- supports cancellation through `AbortSignal`

PDF.js is loaded dynamically so the main application bundle does not include the parser.

## Graph engine

`src/services/graph-engine/graph.ts` contains deterministic, framework-independent operations:

- tag-region and sphere layout
- graph filtering
- degree calculation
- graph statistics
- isolated-concept detection

Layout does not depend on random state, so the same graph renders consistently.

`src/features/world/universe-page.tsx` owns view state and filters. It lazy-loads `knowledge-universe.tsx`, which contains the React Three Fiber scene. Nodes and edges use instancing, labels are limited by preference, and the list view exposes the same graph as semantic HTML.

The scene has:

- a WebGL capability check
- a React error boundary
- a lazy-loading state
- a list-view fallback

## Interface and localization

`src/app/language-store.ts` owns the active language (`en` or `id`). It:

- reads `localStorage["mindmesh.language"]`, otherwise derives a default from `navigator.language`
- updates `document.documentElement.lang` on change
- exposes `useCopy` for component copy, `getLanguage` for non-React code, and `localeFor` for date and number formatting

Copy lives next to the component that uses it, so English and Indonesian strings stay together. The quiz engine also accepts a `language` option and generates question prompts, options, explanations, and warnings in the active language; grading remains language-independent.

`src/components/layout/language-switcher.tsx` is rendered in the shell header.

`src/features/world/feature-orb.tsx` adds a small interactive 3D orb to page headers. It wraps a lazy-loaded React Three Fiber scene with a WebGL check, an error boundary, and a static CSS fallback. The orb is decorative and supplementary; its accessible label names the page and the interaction, and every action remains available through normal controls.

## Quiz engine

`src/services/quiz-engine/generate.ts` is rule-based and independent of AI.

Question types:

- multiple choice from concept descriptions and distractors
- true/false from relationship statements
- short answer graded by key-term overlap

The generator requires enough concepts or relationships for valid distractors and statements. It returns warnings when requested question types cannot be produced honestly.

Quiz sessions grade locally and update learning records through the workspace store. Learning record updates are immutable replacements, not in-place mutation.

## Workspace store

`src/app/workspace-store.ts` is the application's write coordinator. It:

- guards concurrent initialization with an initialization promise
- exposes the active project and project list
- persists project changes through the repository
- keeps imported projects separate
- updates concept, relationship, quiz, attempt, and learning data
- coordinates sample loading
- surfaces recoverable errors

Feature components do not write directly to IndexedDB.

## AI pipeline

The AI path is documented in [ai-integration.md](ai-integration.md). In summary:

1. User configures a provider and tests a real request.
2. User requests analysis and explicitly consents for that run.
3. Extracted text is chunked.
4. Requests go directly to the configured endpoint or loopback bridge.
5. Responses are parsed as JSON and validated with Zod.
6. Evidence excerpts are checked against the source document.
7. Valid suggestions are cached locally and presented for review.
8. Accepted suggestions become project records; rejected ones remain rejected.

AI does not auto-run on import, does not retry without bounds, and does not write to the graph without review.

## Routing and performance

`src/app/App.tsx` lazy-loads feature routes. `AppShell` wraps the route outlet in a Suspense boundary so navigation keeps the shell responsive.

The heavy modules are separated:

- PDF.js loads only when parsing a PDF.
- The 3D renderer loads only when the 3D view is selected and WebGL is available.
- Feature orbs share a lazy chunk that loads after the page shell.
- Feature pages are separate chunks.

The production build is static ES2022. There is no service worker, so deployments should use normal HTTP caching and HTTPS.

## Error handling

- Parsing errors use `DocumentParseError` with stable codes.
- AI errors are normalized by provider type.
- Workspace startup distinguishes fatal from recoverable errors.
- Feature pages use empty, loading, warning, and error states.
- Global toasts report completed actions; they do not simulate activity.

## Accessibility

- All navigation is semantic links.
- The universe has a list view with the same filtering and selection actions.
- Dialogs use native dialog behavior or guarded focus handling.
- Buttons and fields have accessible names.
- The language switcher and interactive orbs expose localized accessible labels.
- Reduced-motion preferences are respected by CSS.
- Color is not the only indicator for status; text labels accompany badges.

## Testing

Unit and integration tests run with Vitest and jsdom. Playwright runs production-build smoke flows.

See [testing.md](testing.md).

## Extension points

When extending MindMesh:

- Add domain fields in `types.ts`, `factory.ts`, and schemas together.
- Increment `SCHEMA_VERSION` and add a migration for persisted changes.
- Remap all new entity IDs in project import.
- Keep parsers free of UI dependencies.
- Keep AI output behind schema validation and evidence checks.
- Add an accessible fallback for any visual-only feature.
- Add tests at the same layer as the change.
