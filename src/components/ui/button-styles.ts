import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'violet';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-cyan-300 text-cyan-950 hover:bg-cyan-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_8px_24px_rgba(0,0,0,0.24)] border border-cyan-400/50',
  secondary:
    'bg-white/[0.045] text-bright hover:bg-white/[0.085] border border-line hover:border-slate-500/60',
  ghost:
    'bg-transparent text-mist hover:text-bright hover:bg-white/[0.05] border border-transparent',
  danger:
    'bg-rose-500/12 text-rose-200 hover:bg-rose-500/20 border border-rose-400/30',
  outline:
    'bg-transparent text-cyan-200 hover:bg-cyan-400/10 border border-cyan-400/35',
  violet:
    'bg-violet-500/12 text-violet-100 hover:bg-violet-500/20 border border-violet-400/30',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-12 px-5 text-sm gap-2.5 rounded-xl',
  icon: 'h-9 w-9 rounded-lg justify-center',
};

export function buttonClassName(
  variant: ButtonVariant = 'secondary',
  size: ButtonSize = 'md',
  className?: string,
): string {
  return cn(
    'inline-flex select-none items-center justify-center whitespace-nowrap font-medium tracking-[-0.01em] transition-[color,background-color,border-color,box-shadow,transform] duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45',
    variantClasses[variant],
    sizeClasses[size],
    className,
  );
}
