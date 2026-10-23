import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useLanguageStore } from '@/app/language-store';
import { cn } from '@/lib/utils';
import { Button } from './button';

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const language = useLanguageStore((state) => state.language);
  const titleId = useId();
  const descriptionId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const handleClose = () => onCloseRef.current();
    const handleCancel = (event: Event) => {
      event.preventDefault();
      onCloseRef.current();
    };
    dialog.addEventListener('close', handleClose);
    dialog.addEventListener('cancel', handleCancel);
    return () => {
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('cancel', handleCancel);
    };
  }, []);

  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' };

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={cn(
        'surface m-auto max-h-[88vh] w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl p-0 text-bright backdrop:bg-black/70',
        widths[size],
        className,
      )}
    >
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line-soft bg-[#101319]/95 px-5 py-4 backdrop-blur">
        <div>
          <h2 id={titleId} className="text-base font-semibold tracking-tight">
            {title}
          </h2>
          {description ? (
            <p id={descriptionId} className="mt-1 text-xs leading-relaxed text-mist">
              {description}
            </p>
          ) : null}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label={language === 'id' ? 'Tutup dialog' : 'Close dialog'}
          className="-mr-1 -mt-1 shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="px-5 py-5">{children}</div>
      {footer ? (
        <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 border-t border-line-soft bg-[#101319]/95 px-5 py-4 backdrop-blur">
          {footer}
        </div>
      ) : null}
    </dialog>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  destructive = false,
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
}) {
  const language = useLanguageStore((state) => state.language);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {language === 'id' ? 'Batal' : 'Cancel'}
          </Button>
          <Button
            variant={destructive ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel ?? (language === 'id' ? 'Konfirmasi' : 'Confirm')}
          </Button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-mist">{description}</p>
    </Dialog>
  );
}
