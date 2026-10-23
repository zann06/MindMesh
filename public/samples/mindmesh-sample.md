# MindMesh: Learning with Evidence

This sample document is original material written for MindMesh. It explains how the application thinks about knowledge, storage, AI, and learning. Every heading below becomes a section with a real source reference in the sample project.

## Evidence-first knowledge

A concept is more useful when you can return to the passage that supports it. MindMesh stores page numbers for PDFs and heading sections for Markdown. A concept can therefore carry an inspectable trail back to its origin. AI suggestions are marked as suggestions, and they remain reviewable. Semantic similarity is never treated as proof of a factual relationship.

## The knowledge graph

Concepts become nodes and relationships become edges. A relationship records its type, explanation, provenance, and review status. Directionality depends on the relationship type: a prerequisite points from the concept you need first to the concept that depends on it, while related-to has no inherent direction. A conventional list view exposes the same graph without requiring 3D.

## Local-first storage

Projects live in your browser's IndexedDB by default. There is no account and no hosted backend. You can export a versioned project file, inspect it, and import it later. Browser storage can be cleared by the browser or the operating system, so exports are the durable backup. Provider credentials are never included in an export.

## Bring your own AI

AI is optional. MindMesh can talk to a local OpenCode CLI bridge or to a user-owned OpenAI-compatible endpoint. A connection is only shown as connected after a real test request succeeds. Document content is not sent anywhere merely because a file was imported. Analysis runs only after an explicit action and confirmation, and every returned concept or relationship must pass schema validation and evidence checks.

## The learning loop

Quizzes are built from approved knowledge records. Rule-based practice questions can be generated without any AI. Every answer updates a local learning record with attempts, correct answers, and a review date. Mastery is deliberately conservative: a concept is not called mastered after a single interaction. Source references remain available beneath each explanation so that a wrong answer leads back to the reading.

## What MindMesh does not do

MindMesh does not perform OCR in this build. A scanned PDF may be stored, but if PDF.js finds no selectable text it cannot be searched or cited. MindMesh also does not execute commands or code produced by a model. The 3D universe is never the only way to reach knowledge; a graph view and a keyboard-accessible list are always available.
