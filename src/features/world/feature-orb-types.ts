export type OrbVariant =
  | 'knowledge'
  | 'welcome'
  | 'universe'
  | 'documents'
  | 'search'
  | 'learning'
  | 'progress'
  | 'quiz'
  | 'settings'
  | 'data'
  | 'about';

export type OrbShape =
  | 'icosahedron'
  | 'octahedron'
  | 'torus'
  | 'torus-knot'
  | 'box'
  | 'dodecahedron'
  | 'tetrahedron'
  | 'sphere';

export interface OrbLook {
  color: string;
  accent: string;
  shape: OrbShape;
}

export const ORB_LOOKS: Record<OrbVariant, OrbLook> = {
  knowledge: { color: '#7ebaa3', accent: '#8aa2b8', shape: 'icosahedron' },
  welcome: { color: '#9ccfb9', accent: '#a9bccd', shape: 'icosahedron' },
  universe: { color: '#8aa2b8', accent: '#7ebaa3', shape: 'sphere' },
  documents: { color: '#7ebaa3', accent: '#b7a06e', shape: 'box' },
  search: { color: '#8aa2b8', accent: '#9ccfb9', shape: 'torus-knot' },
  learning: { color: '#7cbfa6', accent: '#cbad74', shape: 'octahedron' },
  progress: { color: '#9ccfb9', accent: '#e0cca0', shape: 'torus' },
  quiz: { color: '#cbad74', accent: '#9ccfb9', shape: 'tetrahedron' },
  settings: { color: '#6fa6a0', accent: '#a9bccd', shape: 'dodecahedron' },
  data: { color: '#a9bccd', accent: '#7ebaa3', shape: 'torus' },
  about: { color: '#b7a06e', accent: '#7cbfa6', shape: 'dodecahedron' },
};

export const ORB_VARIANTS = Object.keys(ORB_LOOKS) as OrbVariant[];
