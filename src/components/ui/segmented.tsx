import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: Array<SegmentOption<T>>;
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('inline-flex rounded-lg border border-line bg-[#0d0f14]/80 p-1', className)}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors',
            value === option.value
              ? 'bg-white/[0.1] text-bright shadow-sm'
              : 'text-slate-400 hover:text-slate-200',
          )}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}
