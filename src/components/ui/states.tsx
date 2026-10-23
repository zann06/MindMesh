import type { ReactNode } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useLanguageStore } from '@/app/language-store';
import { cn } from '@/lib/utils';
import { Button } from './button';

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-4 w-4 animate-spin', className)} aria-hidden="true" />;
}

export function LoadingPanel({ label }: { label?: string }) {
  const language = useLanguageStore((state) => state.language);
  return (
    <div className="flex items-center justify-center gap-3 rounded-2xl border border-line-soft bg-panel/40 px-6 py-16 text-sm text-mist">
      <Spinner />
      <span>{label ?? (language === 'id' ? 'Memuat…' : 'Loading…')}</span>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-lg', className)} aria-hidden="true" />;
}

export function ProgressBar({
  value,
  max = 1,
  label,
  className,
}: {
  value: number;
  max?: number;
  label?: string;
  className?: string;
}) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={label}
      className={cn('h-1.5 overflow-hidden rounded-full bg-white/[0.07]', className)}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400 transition-[width] duration-300"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-14 text-center',
        className,
      )}
    >
      {icon ? (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-white/[0.04] text-cyan-200">
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold text-bright">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-mist">{description}</p>
      {action ? <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title,
  message,
  onRetry,
  action,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  action?: ReactNode;
}) {
  const language = useLanguageStore((state) => state.language);
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-400/20 bg-rose-500/[0.04] px-6 py-14 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-rose-400/25 bg-rose-500/10 text-rose-200">
        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-bright">
        {title ?? (language === 'id' ? 'Terjadi kesalahan' : 'Something went wrong')}
      </h3>
      <p className="mt-2 max-w-xl whitespace-pre-wrap text-sm leading-relaxed text-mist">{message}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {onRetry ? <Button onClick={onRetry}>{language === 'id' ? 'Coba lagi' : 'Try again'}</Button> : null}
        {action}
      </div>
    </div>
  );
}

export function Notice({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'warning' | 'error' | 'success';
  title?: string;
  children: ReactNode;
}) {
  const tones = {
    info: 'border-cyan-400/20 bg-cyan-400/[0.045] text-cyan-100/90',
    warning: 'border-amber-400/25 bg-amber-400/[0.05] text-amber-100/90',
    error: 'border-rose-400/25 bg-rose-400/[0.05] text-rose-100/90',
    success: 'border-emerald-400/25 bg-emerald-400/[0.05] text-emerald-100/90',
  };
  return (
    <div className={cn('rounded-xl border px-4 py-3 text-xs leading-relaxed', tones[tone])}>
      {title ? <p className="mb-1 font-semibold">{title}</p> : null}
      {children}
    </div>
  );
}
