import type { KnowledgeProject, RelationType } from '@/core/domain/types';
import {
  createConcept,
  createDocumentRecord,
  createQuiz,
  createQuizQuestion,
  createRelationship,
  createSourceReference,
  userProvenance,
} from '@/core/domain/factory';
import { parseMarkdownSource } from '@/services/document-parser';
import { sha256Hex } from '@/services/document-parser/hash';
import { nowIso } from '@/lib/utils';

interface SampleConcept {
  heading: string;
  label: string;
  description: string;
  aliases: string[];
  tags: string[];
}

export const SAMPLE_CONCEPTS: SampleConcept[] = [
  {
    heading: 'Evidence-first knowledge',
    label: 'Evidence-first knowledge',
    description:
      'Every concept should retain an inspectable source reference. PDF pages or Markdown sections keep the trail visible, and AI suggestions remain unconfirmed until a user reviews them.',
    aliases: ['Evidence-backed learning', 'Source provenance'],
    tags: ['Principle', 'Evidence'],
  },
  {
    heading: 'The knowledge graph',
    label: 'Knowledge graph',
    description:
      'Concepts form nodes and typed relationships form edges. Relationship direction depends on type, and the same graph is available as an accessible list instead of limiting access to the 3D scene.',
    aliases: ['Concept graph', 'Concept map'],
    tags: ['Architecture', 'Graph'],
  },
  {
    heading: 'Local-first storage',
    label: 'Local-first storage',
    description:
      'Projects, documents, concepts, and learning records live in IndexedDB with no account or hosted backend. Versioned exports provide durable backups that users control.',
    aliases: ['Local-first', 'Browser storage'],
    tags: ['Architecture', 'Privacy'],
  },
  {
    heading: 'Bring your own AI',
    label: 'Bring your own AI',
    description:
      'AI is optional and uses a user-owned provider, such as the OpenCode CLI bridge or an OpenAI-compatible endpoint. Content requires explicit consent before any external request, and a connection claim requires a real successful test.',
    aliases: ['BYOAI', 'Optional AI'],
    tags: ['AI', 'Privacy'],
  },
  {
    heading: 'The learning loop',
    label: 'Learning loop',
    description:
      'Quizzes draw on approved concepts and source passages. Attempts, correct answers, and review dates are stored locally, and mastery requires repeated evidence rather than one interaction.',
    aliases: ['Quiz loop', 'Review cycle'],
    tags: ['Learning', 'Assessment'],
  },
  {
    heading: 'What MindMesh does not do',
    label: 'OCR limitation',
    description:
      'Scanned PDFs without selectable text are stored with a warning but cannot be searched or cited because OCR is not included in this build. Models also cannot run tools or execute generated code.',
    aliases: ['No OCR', 'Scanned PDF limitation'],
    tags: ['Limitations', 'Documents'],
  },
];

export const SAMPLE_RELATIONSHIPS: Array<{
  source: string;
  target: string;
  relationType: RelationType;
  explanation: string;
}> = [
  {
    source: 'Evidence-first knowledge',
    target: 'Learning loop',
    relationType: 'prerequisite',
    explanation:
      'Reviewing evidence is a prerequisite for the learning loop, because quiz explanations link back to source passages.',
  },
  {
    source: 'Knowledge graph',
    target: 'Evidence-first knowledge',
    relationType: 'part-of',
    explanation:
      'The knowledge graph is one mechanism the evidence-first approach uses to make concepts and their sources navigable.',
  },
  {
    source: 'Local-first storage',
    target: 'Bring your own AI',
    relationType: 'related-to',
    explanation:
      'Both principles preserve user control: storage stays local by default, and AI remains an explicitly configured option.',
  },
  {
    source: 'OCR limitation',
    target: 'Evidence-first knowledge',
    relationType: 'related-to',
    explanation:
      'The absence of OCR limits evidence availability for scanned documents, which is why MindMesh warns instead of inventing citations.',
  },
];

export const SAMPLE_QUIZ = [
  {
    prompt: 'Which principle keeps every concept connected to an inspectable source?',
    options: ['Local-first storage', 'Evidence-first knowledge', 'Bring your own AI', 'Knowledge graph'],
    correctAnswer: 'Evidence-first knowledge',
    explanation:
      'Evidence-first knowledge is the principle that concepts retain page or section provenance.',
    concept: 'Evidence-first knowledge',
  },
  {
    prompt: 'Where are MindMesh projects stored by default?',
    options: ['A hosted MindMesh account', 'The browser IndexedDB', 'A Git repository', 'A cloud vector database'],
    correctAnswer: 'The browser IndexedDB',
    explanation:
      'The sample states that projects live in IndexedDB by default, with exports as durable backups.',
    concept: 'Local-first storage',
  },
  {
    prompt: 'When is the AI connection label allowed to show as connected?',
    options: [
      'As soon as a URL is typed',
      'After a saved API key is detected',
      'After a real minimal test request succeeds',
      'Whenever the browser is online',
    ],
    correctAnswer: 'After a real minimal test request succeeds',
    explanation:
      'MindMesh does not claim a connection without a successful test, and AI stays off until configured.',
    concept: 'Bring your own AI',
  },
  {
    prompt: 'What happens to a scanned PDF with no selectable text?',
    options: [
      'OCR runs automatically',
      'It is stored with a warning and cannot be cited',
      'It is uploaded to a cloud provider',
      'MindMesh invents page references',
    ],
    correctAnswer: 'It is stored with a warning and cannot be cited',
    explanation:
      'OCR is not implemented in this build. MindMesh warns instead of pretending extraction succeeded.',
    concept: 'OCR limitation',
  },
];

export async function buildSampleProject(
  base: KnowledgeProject,
  markdown: string,
): Promise<KnowledgeProject> {
  const parsed = parseMarkdownSource(markdown);
  const contentHash = await sha256Hex(new TextEncoder().encode(markdown));
  const document = createDocumentRecord({
    projectId: base.projectId,
    filename: 'mindmesh-sample.md',
    mediaType: 'text/markdown',
    fileSize: new TextEncoder().encode(markdown).byteLength,
    contentHash,
    extractedText: parsed.extractedText,
    extractionMethod: 'markdown',
    processingStatus: parsed.processingStatus,
    extractionWarnings: parsed.warnings,
    sections: parsed.sections,
  });

  const concepts = SAMPLE_CONCEPTS.map((definition) => {
    const section = parsed.sections.find((candidate) => candidate.heading === definition.heading);
    const references = section
      ? [
          createSourceReference({
            documentId: document.id,
            sectionHeading: section.heading,
            startOffset: section.startOffset,
            endOffset: section.endOffset,
            excerpt: section.excerpt,
            extractionMethod: 'markdown-heading',
          }),
        ]
      : [];
    return createConcept(
      base.projectId,
      {
        label: definition.label,
        description: definition.description,
        aliases: definition.aliases,
        tags: definition.tags,
        sourceReferences: references,
      },
      {
        provenance: userProvenance('document-structure'),
        reviewStatus: 'confirmed',
      },
    );
  });

  const byLabel = new Map(concepts.map((concept) => [concept.label, concept]));
  const relationships = SAMPLE_RELATIONSHIPS.flatMap((definition) => {
    const source = byLabel.get(definition.source);
    const target = byLabel.get(definition.target);
    if (!source || !target) return [];
    return [
      createRelationship(
        base.projectId,
        {
          sourceConceptId: source.id,
          targetConceptId: target.id,
          relationType: definition.relationType,
          explanation: definition.explanation,
          sourceReferences: [...source.sourceReferences, ...target.sourceReferences].slice(0, 2),
        },
        { provenance: userProvenance('document-structure'), reviewStatus: 'confirmed' },
      ),
    ];
  });

  const questions = SAMPLE_QUIZ.map((definition) => {
    const concept = byLabel.get(definition.concept);
    if (!concept) {
      throw new Error(`Sample quiz concept not found: ${definition.concept}`);
    }
    return createQuizQuestion({
      conceptId: concept.id,
      type: 'multiple-choice',
      prompt: definition.prompt,
      options: definition.options,
      correctAnswer: definition.correctAnswer,
      explanation: definition.explanation,
      sourceReferences: concept.sourceReferences,
    });
  });

  const quiz = createQuiz(base.projectId, {
    title: 'MindMesh sample check',
    description:
      'Rule-based questions authored for the sample project. They demonstrate quiz feedback and source inspection without AI.',
    questions,
    source: 'user',
  });

  return {
    ...base,
    name: base.documents.length === 0 && base.concepts.length === 0 ? 'MindMesh sample' : base.name,
    documents: [...base.documents, document],
    concepts: [...base.concepts, ...concepts],
    relationships: [...base.relationships, ...relationships],
    quizzes: [...base.quizzes, quiz],
    updatedAt: nowIso(),
  };
}
