import type { ReactNode } from 'react';
import { FeatureOrb, type OrbVariant } from '@/features/world/feature-orb';

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  orb,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  orb?: OrbVariant;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="break-words text-[26px] font-medium tracking-[-0.03em] text-bright [overflow-wrap:anywhere] sm:text-[30px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-mist">{description}</p>
        ) : null}
      </div>
      {orb || actions ? (
        <div className="flex shrink-0 flex-wrap items-end justify-end gap-2">
          {orb ? <FeatureOrb variant={orb} size={72} /> : null}
          {actions}
        </div>
      ) : null}
    </div>
  );
}
