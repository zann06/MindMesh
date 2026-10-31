# Changelog

All notable changes to MindMesh are documented here. The project follows semantic versioning after 1.0; pre-1.0 releases may change data or interfaces between minor versions.

## [Unreleased]

### Added

- Indonesian interface coverage, including rule-based quiz questions, options, explanations, warnings, toasts, tooltips, and accessibility labels
- Interactive 3D feature orb in every page header, with drag rotation, click pulse, lazy loading, WebGL fallback, and localized accessible labels
- Demo screenshots in `docs/screenshots/` and an opt-in `npm run screenshots` capture script
- Unit coverage for Indonesian quiz generation and E2E assertions for feature orbs
- An `.editorconfig` with cross-editor formatting defaults
- Open Graph and Twitter Card metadata so shared links render a preview card

### Changed

- Quiz generation now receives the active language and produces localized content
- README now documents language support, feature orbs, and the screenshot workflow
- CONTRIBUTING now states the actual Node.js 24 requirement matching `engines` and CI

## [0.1.0] - 2026-10-20

Initial preview release.

### Added

- Local-first project workspace backed by IndexedDB
- PDF selectable-text extraction and Markdown import
- Document viewer with page and section evidence
- Concept and typed relationship editors with provenance and review status
- Evidence-backed concept detail pages and source links
- Full-text search across concepts and excerpts
- Deterministic 3D knowledge universe with filters and an accessible list view
- Rule-based multiple-choice, true/false, and short-answer quizzes
- Attempt history, mastery records, and progress views
- Versioned project export and validated import as a new workspace
- Schema migration, integrity checks, and complete ID remapping
- Optional OpenCode CLI bridge with loopback binding, token auth, origin checks, and bounded requests
- Optional user-owned OpenAI-compatible provider
- Explicit per-run AI consent, schema validation, evidence checks, and local response cache
- Settings, data management, About, Privacy, and Not Found pages
- Unit, integration, PDF, bridge, and Playwright tests
- Static production build with route-level and heavy-library code splitting

### Known limitations

- No OCR for image-only PDFs
- No cloud sync, accounts, or collaboration
- No AI provider configured by default
- Short-answer grading uses key-term overlap
- Browser storage can be evicted; exports are the durable backup
- Pre-1.0 software; no security certification or production support commitment
