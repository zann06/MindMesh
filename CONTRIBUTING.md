# Contributing to MindMesh

Thanks for helping improve MindMesh. This project is pre-1.0; changes should favor correctness, inspectability, and a smaller honest surface over speculative features.

## Before you start

- Read [README.md](README.md), [docs/architecture.md](docs/architecture.md), and [docs/ai-integration.md](docs/ai-integration.md).
- For a security issue, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.
- For a large change, open a design discussion first so the data and privacy implications can be reviewed.

## Development setup

Requirements:

- Node.js 22 or newer
- npm 10 or newer

```bash
npm install
npm run dev
```

Optional browser-test setup:

```bash
npx playwright install chromium
```

Optional local AI bridge:

```bash
npm run bridge
```

Never commit provider keys, bridge tokens, exported user projects, or `.env` files. Use `.env.example` for documented, non-secret defaults.

## Quality gate

Before requesting review:

```bash
npm run verify
```

This runs lint, type-check, unit/integration tests, and a production build.

For browser tests:

```bash
npm run verify:full
```

If you change UI behavior, add or update a Playwright flow. If you change domain behavior, add a unit or integration test at the same layer.

## Coding conventions

- TypeScript is strict. Avoid `any`; prefer validated `unknown` at boundaries.
- Follow existing feature folders and naming.
- Keep domain logic out of React components where practical.
- Use the existing UI primitives rather than introducing a second design system.
- Do not add comments that restate code. Explain non-obvious constraints only.
- Preserve cancellation and progress behavior in parsers.
- Keep route-level and heavy-library code lazy where possible.

## Data and schema changes

If you change persisted records:

1. Update `src/core/domain/types.ts`.
2. Update factories and Zod schemas.
3. Increment `SCHEMA_VERSION` for incompatible changes.
4. Add a migration in `src/core/validation/migration.ts`.
5. Update import/export validation and ID remapping.
6. Add tests for old records, new records, and invalid records.
7. Confirm exports still exclude credentials and unrelated settings.

Imports must continue to create a new project. Do not add merge or overwrite behavior without an explicit, reviewed design.

## AI changes

AI is a constrained optional feature. Changes must preserve these rules:

- AI is off by default.
- Do not ship a shared developer key or proxy user content through a project-controlled service without explicit design review.
- A connection is shown only after a real test request succeeds.
- Do not claim zero retention on behalf of a provider.
- Require explicit per-run consent before sending extracted document content.
- Validate output before use and treat it as a suggestion.
- Enforce chunk, cache, retry, timeout, and output bounds.
- Keep secrets out of `localStorage`, exports, logs, and URLs.
- Do not execute model output.
- Do not add automatic analysis on import.

## Privacy and product honesty

These are product requirements, not nice-to-haves:

- No analytics, advertising, tracking pixels, or session recording.
- No fabricated citations, concepts, activity, progress, or AI results.
- No OCR claims. Report image-only PDFs honestly.
- No “connected” state without a real request.
- No silent network requests for imported content.
- No uploaded file binaries. Store extracted text only.
- Keep the accessible list equivalent to the 3D view.
- Prefer empty, warning, and error states over invented content.

## Accessibility

- Use semantic elements and accessible names.
- Verify keyboard operation for new controls.
- Keep contrast and focus states usable.
- Provide a non-visual or non-3D path for graph features.
- Respect reduced motion.
- Do not use color alone to communicate state.

## Commit and pull request guidance

- Keep commits focused and explain the reason for the change.
- Update documentation when behavior, commands, or security properties change.
- Include reproduction steps for bug fixes.
- List what you actually ran in the verification section.
- Do not claim tests or manual checks that were not performed.
- Do not include generated build output, test artifacts, or secrets.

## License

By contributing, you agree that your contribution is licensed under the Apache License 2.0. See [LICENSE](LICENSE).

## Code of conduct

Participation is governed by [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
