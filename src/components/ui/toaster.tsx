import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useToastStore } from '@/app/toast-store';
import { useLanguageStore } from '@/app/language-store';
import { cn } from '@/lib/utils';

const icons = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};

const styles = {
  success: 'border-emerald-400/25 text-emerald-200',
  error: 'border-rose-400/25 text-rose-200',
  info: 'border-cyan-400/25 text-cyan-200',
};

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);
  const language = useLanguageStore((state) => state.language);
  const dismissLabel = language === 'id' ? 'Tutup notifikasi' : 'Dismiss notification';

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(390px,calc(100vw-2rem))] flex-col gap-2"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => {
        const Icon = icons[toast.variant];
        return (
          <div
            key={toast.id}
            className="glass pointer-events-auto flex items-start gap-3 rounded-xl px-4 py-3 shadow-2xl"
            role={toast.variant === 'error' ? 'alert' : 'status'}
          >
            <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', styles[toast.variant])} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-bright">{toast.title}</p>
              {toast.description ? (
                <p className="mt-0.5 break-words text-xs leading-relaxed text-mist">
                  {toast.description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="-mr-1 -mt-1 rounded p-1 text-slate-500 transition-colors hover:text-bright"
              aria-label={dismissLabel}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
