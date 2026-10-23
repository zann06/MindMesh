import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { useLanguageStore, type Language } from '@/app/language-store';
import { cn } from '@/lib/utils';
import { ORB_LOOKS, type OrbVariant } from './feature-orb-types';

export type { OrbVariant } from './feature-orb-types';

const FeatureOrbScene = lazy(() => import('./feature-orb-scene'));

const copy = {
  en: {
    hint: 'Drag to orbit · click to pulse the object',
    labels: {
      knowledge: 'Interactive 3D knowledge object',
      welcome: 'Interactive 3D welcome object',
      universe: 'Interactive 3D universe object',
      documents: 'Interactive 3D document object',
      search: 'Interactive 3D search object',
      learning: 'Interactive 3D learning object',
      progress: 'Interactive 3D progress object',
      quiz: 'Interactive 3D quiz object',
      settings: 'Interactive 3D settings object',
      data: 'Interactive 3D data object',
      about: 'Interactive 3D information object',
    },
  },
  id: {
    hint: 'Seret untuk mengorbit · klik untuk memberi denyut pada objek',
    labels: {
      knowledge: 'Objek pengetahuan 3D interaktif',
      welcome: 'Objek sambutan 3D interaktif',
      universe: 'Objek semesta 3D interaktif',
      documents: 'Objek dokumen 3D interaktif',
      search: 'Objek pencarian 3D interaktif',
      learning: 'Objek pembelajaran 3D interaktif',
      progress: 'Objek kemajuan 3D interaktif',
      quiz: 'Objek kuis 3D interaktif',
      settings: 'Objek pengaturan 3D interaktif',
      data: 'Objek data 3D interaktif',
      about: 'Objek informasi 3D interaktif',
    },
  },
} as const satisfies Record<Language, { hint: string; labels: Record<OrbVariant, string> }>;

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

class OrbBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function OrbFallback({ variant }: { variant: OrbVariant }) {
  const look = ORB_LOOKS[variant];
  return (
    <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
      <div
        className="absolute inset-[18%] rounded-full blur-xl"
        style={{ backgroundColor: `${look.color}30` }}
      />
      <div
        className="relative flex h-[62%] w-[62%] rotate-12 items-center justify-center rounded-[32%] border shadow-[0_0_28px_rgba(126,186,163,0.28)] motion-safe:animate-float"
        style={{
          borderColor: `${look.color}88`,
          background: `linear-gradient(145deg, ${look.color}40, ${look.accent}18)`,
          boxShadow: `0 0 24px ${look.color}33, inset 0 1px 0 rgba(255,255,255,0.16)`,
        }}
      >
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: look.color, boxShadow: `0 0 14px ${look.color}` }}
        />
      </div>
      <div
        className="absolute h-[78%] w-[78%] -rotate-12 rounded-full border"
        style={{ borderColor: `${look.accent}44` }}
      />
    </div>
  );
}

export function FeatureOrb({
  variant,
  size = 72,
  className,
}: {
  variant: OrbVariant;
  size?: number;
  className?: string;
}) {
  const language = useLanguageStore((state) => state.language);
  const t = copy[language];
  const reduced = usePrefersReducedMotion();
  const [supported] = useState(supportsWebGL);
  const fallback = <OrbFallback variant={variant} />;

  return (
    <div
      role="img"
      aria-label={t.labels[variant]}
      title={t.hint}
      data-testid="feature-orb"
      data-orb-variant={variant}
      className={cn('relative shrink-0 select-none', className)}
      style={{ width: size, height: size }}
    >
      {supported ? (
        <OrbBoundary fallback={fallback}>
          <Suspense fallback={fallback}>
            <FeatureOrbScene variant={variant} reduced={reduced} />
          </Suspense>
        </OrbBoundary>
      ) : (
        fallback
      )}
      <span className="sr-only">{t.hint}</span>
    </div>
  );
}
