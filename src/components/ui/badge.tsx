import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant =
  | 'default'
  | 'cyan'
  | 'violet'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'outline';

const classes: Record<BadgeVariant, string> = {
  default: 'bg-white/[0.06] text-mist border-white/10',
  cyan: 'bg-cyan-400/10 text-cyan-200 border-cyan-400/25',
  violet: 'bg-violet-400/10 text-violet-200 border-violet-400/25',
  emerald: 'bg-emerald-400/10 text-emerald-200 border-emerald-400/25',
  amber: 'bg-amber-400/10 text-amber-200 border-amber-400/25',
  rose: 'bg-rose-400/10 text-rose-200 border-rose-400/25',
  outline: 'bg-transparent text-mist border-line',
};

export function Badge({
  variant = 'default',
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em]',
        classes[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
