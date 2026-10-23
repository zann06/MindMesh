import { create } from 'zustand';
import { newId } from '@/lib/utils';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration: number;
}

interface ToastStore {
  toasts: ToastMessage[];
  push: (toast: Omit<ToastMessage, 'id' | 'duration'> & { duration?: number }) => string;
  dismiss: (id: string) => void;
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  push: (toast) => {
    const id = newId('toast');
    const duration = toast.duration ?? (toast.variant === 'error' ? 8000 : 5000);
    set({
      toasts: [...get().toasts, { ...toast, id, duration }].slice(-4),
    });
    const timer = setTimeout(() => {
      get().dismiss(id);
    }, duration);
    timers.set(id, timer);
    return id;
  },
  dismiss: (id) => {
    const timer = timers.get(id);
    if (timer) clearTimeout(timer);
    timers.delete(id);
    set({ toasts: get().toasts.filter((toast) => toast.id !== id) });
  },
}));

export const toast = {
  success(title: string, description?: string): string {
    return useToastStore.getState().push({ title, description, variant: 'success' });
  },
  error(title: string, description?: string): string {
    return useToastStore.getState().push({ title, description, variant: 'error' });
  },
  info(title: string, description?: string): string {
    return useToastStore.getState().push({ title, description, variant: 'info' });
  },
  dismiss(id: string): void {
    useToastStore.getState().dismiss(id);
  },
};
