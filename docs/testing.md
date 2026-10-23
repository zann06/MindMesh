# Testing and verification

## Quality gate

```bash
npm run verify
```

This runs:

1. ESLint
2. TypeScript with no emit
3. Vitest unit and integration tests
4. Production build, including type-check and Vite bundling

For the full gate including browser tests:

```bash
npx playwright install chromium
npm run verify:full
```

`verify:full` runs `verify`, then Playwright against the production preview.

## Unit and integration tests

Vitest is configured in `vite.config.ts` with:

- jsdom by default
- Node environment for bridge tests via a file directive
- fake IndexedDB
- functional in-memory `localStorage` and `sessionStorage`
- observers, media query, scroll, and blob URL stubs
- PDF.js inline processing

Test locations:

```text
tests/unit/           pure domain and service tests
tests/integration/    repository, store, parser, and bridge tests
tests/e2e/            Playwright browser flows
```

Covered areas:

### Graph

- deterministic tag-region layout
- filtering by text, tag, status, document, and relationship type
- relationship degrees
- graph statistics and isolated concepts

### Markdown

- heading and section extraction
- offset correctness
- script/style/comment sanitization
- malformed input behavior

### Quizzes

- question generation for each type
- distractor requirements
- grading and explanations
- source-reference limits

### Project I/O

- export shape and exclusions
- validation failures
- migration behavior
- complete ID remapping
- new-project-only import behavior

### Integrity

- relationship endpoint checks
- quiz and evidence references
- warnings versus hard errors

### Workspace store

- initialization guard
- project lifecycle
- immutable learning-record updates
- concept provenance rejection
- sample loading

### PDF extraction

Uses `pdf-lib` to generate real PDF fixtures at test time.

- selectable text and page evidence
- image-only warning without an OCR claim
- invalid PDF typed error
- pre-aborted cancellation

### Local bridge

Spawns the real `bridge/server.mjs` on an ephemeral loopback port.

- token required on every endpoint
- health shape and cache headers
- allowed and denied origins
- preflight requests
- malformed request rejection before invoking OpenCode
- unknown endpoint handling

The bridge test does not require a working OpenCode installation and does not make a model request.

## End-to-end tests

Playwright configuration:

- Chromium project
- preview server on `127.0.0.1:4373`
- traces, screenshots, and video on failure
- production build required

The preview port is deliberately `4373`, not `4173`, to avoid collisions with unrelated local applications.

Run:

```bash
npm run build
npx playwright test
```

### Core flow

1. Load the sample project.
2. Visit Documents and open the sample document.
3. Search for `provenance`.
4. Visit Learning and confirm the sample quiz is listed.
5. Visit Settings and confirm AI is off.
6. Visit Data & backup and confirm the project is listed.
7. Visit About and Privacy.
8. Assert no uncaught page errors.

### Quiz flow

1. Load the sample project.
2. Open the quiz builder from Learning.
3. Generate a rule-based quiz.
4. Answer every question.
5. Finish the quiz.
6. Confirm the results page and the recorded attempt.
7. Assert no uncaught page errors.

### Language dropdown

1. Focus the language trigger and open it with the keyboard.
2. Move between English and Indonesian with the arrow keys.
3. Close with Escape.
4. Confirm focus returns to the trigger and no page errors occur.

### Search shortcut

1. Open the app and wait for the header search field.
2. Press `Ctrl+K` (or `Cmd+K`).
3. Confirm the search field receives focus.

### Demo screenshots

`npm run screenshots` captures the bilingual desktop and mobile screens used in the README. The screenshot test is skipped during normal runs.

## Known non-fatal warning

Vitest may print:

```text
Please use the legacy build in Node.js environments.
```

This comes from PDF.js when exercised under jsdom. Tests still pass and verify the browser-oriented build used by the application. It is not a product runtime error.

## Manual checks

Automated tests do not cover every visual or device condition. Before a release, also check:

- responsive navigation and mobile sidebar
- keyboard-only navigation through dialogs and the universe list
- WebGL-disabled fallback
- reduced-motion preference
- light/dark browser rendering and zoom
- PDF import progress and cancellation
- storage eviction or blocked IndexedDB behavior
- provider failure messages with AI enabled
- accessibility names on icon-only controls

## Test honesty

Tests must not mock a successful AI connection, fabricate extracted evidence, or assert that a feature works solely because a button exists. Prefer real local data, real parsers, and real bridge processes. External provider requests should remain opt-in and separate from the default suite.
