import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { useCopy, useLanguageStore, type Language } from '@/app/language-store';
import { cn } from '@/lib/utils';

const copy = {
  en: {
    label: 'Language',
    en: 'English',
    enHint: 'EN',
    id: 'Indonesian',
    idHint: 'ID',
  },
  id: {
    label: 'Bahasa',
    en: 'Inggris',
    enHint: 'EN',
    id: 'Indonesia',
    idHint: 'ID',
  },
};

export function LanguageSwitcher() {
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  const c = useCopy(copy);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listboxId = useId();

  const options: Array<{ value: Language; label: string; hint: string }> = [
    { value: 'en', label: c.en, hint: c.enHint },
    { value: 'id', label: c.id, hint: c.idHint },
  ];
  const selectedIndex = options.findIndex((option) => option.value === language);

  useEffect(() => {
    if (!open) return;
    optionRefs.current[selectedIndex]?.focus();

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, selectedIndex]);

  const close = (restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };

  const choose = (value: Language) => {
    setLanguage(value);
    close();
  };

  const onMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === 'Tab') {
      setOpen(false);
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const last = options.length - 1;
    const focused = optionRefs.current.findIndex((option) => option === document.activeElement);
    const from = focused >= 0 ? focused : selectedIndex;
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? last
          : event.key === 'ArrowDown'
            ? (from + 1) % options.length
            : (from - 1 + options.length) % options.length;
    optionRefs.current[next]?.focus();
  };

  return (
    <div ref={containerRef} className="relative shrink-0" onKeyDown={open ? onMenuKeyDown : undefined}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={c.label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          'group inline-flex h-9 items-center gap-2 rounded-lg border px-2.5 text-xs font-medium transition-colors',
          open
            ? 'border-cyan-400/40 bg-cyan-400/[0.07] text-cyan-100'
            : 'border-line bg-[#0d0f14]/70 text-slate-300 hover:border-slate-500/60 hover:text-bright',
        )}
      >
        <Globe
          className={cn('h-3.5 w-3.5 transition-colors', open ? 'text-cyan-300' : 'text-slate-500 group-hover:text-slate-300')}
          aria-hidden="true"
        />
        <span className="uppercase tracking-[0.08em]">{language}</span>
        <ChevronDown
          className={cn('h-3 w-3 text-slate-500 transition-transform duration-150', open && 'rotate-180 text-cyan-300')}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label={c.label}
          className="absolute right-0 top-full z-50 mt-2 w-44 origin-top-right animate-pop rounded-xl border border-line bg-[#0f1114]/95 p-1 shadow-[0_18px_42px_rgba(0,0,0,0.45)] backdrop-blur-xl"
        >
          {options.map((option, index) => {
            const active = option.value === language;
            return (
              <button
                key={option.value}
                ref={(element) => {
                  optionRefs.current[index] = element;
                }}
                type="button"
                role="option"
                aria-selected={active}
                tabIndex={-1}
                onClick={() => choose(option.value)}
                onMouseEnter={(event) => event.currentTarget.focus()}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors focus:outline-none',
                  active ? 'bg-cyan-400/[0.09] text-cyan-100' : 'text-slate-300 hover:bg-white/[0.045] focus:bg-white/[0.045]',
                )}
              >
                <span
                  className={cn(
                    'flex h-6 w-8 shrink-0 items-center justify-center rounded-md border text-[9px] font-semibold uppercase tracking-[0.08em]',
                    active
                      ? 'border-cyan-400/35 bg-cyan-400/10 text-cyan-200'
                      : 'border-line-soft bg-white/[0.02] text-slate-500',
                  )}
                  aria-hidden="true"
                >
                  {option.hint}
                </span>
                <span className="flex-1 text-xs font-medium">{option.label}</span>
                <Check
                  className={cn('h-3.5 w-3.5 shrink-0', active ? 'text-cyan-300' : 'opacity-0')}
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
