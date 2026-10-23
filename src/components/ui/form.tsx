import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils';

const fieldBase =
  'w-full rounded-lg border border-line bg-[#0d0f14]/80 px-3 py-2 text-sm text-bright placeholder:text-slate-500 transition-colors focus:border-cyan-400/60 focus:bg-[#13161c] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50';

export function Label({ className, children, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('mb-1.5 block text-xs font-medium text-slate-300', className)}
      {...props}
    >
      {children}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldBase, 'h-10', className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldBase, 'min-h-24 resize-y', className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldBase, 'h-10 cursor-pointer', className)} {...props}>
      {children}
    </select>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>
        {label}
        {required ? <span className="ml-1 text-rose-300">*</span> : null}
      </Label>
      {children}
      {hint ? <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{hint}</p> : null}
      {error ? (
        <p className="mt-1.5 text-xs text-rose-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Checkbox({
  label,
  description,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; description?: ReactNode }) {
  return (
    <label className={cn('flex cursor-pointer items-start gap-3', className)}>
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 accent-cyan-400"
        {...props}
      />
      <span>
        <span className="block text-sm text-slate-200">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{description}</span>
        ) : null}
      </span>
    </label>
  );
}
