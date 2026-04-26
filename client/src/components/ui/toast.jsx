import { create } from 'zustand';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const useToastStore = create((set) => ({
  toasts: [],
  add: (toast) => set((s) => ({ toasts: [...s.toasts, { id: Date.now(), ...toast }] })),
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function toast({ title, description, variant = 'default' }) {
  const { add, remove } = useToastStore.getState();
  const id = Date.now();
  add({ id, title, description, variant });
  setTimeout(() => remove(id), 4000);
}

export function Toaster() {
  const { toasts, remove } = useToastStore();

  const icons = {
    default: null,
    success: <CheckCircle className="h-5 w-5 text-green-500" />,
    error: <XCircle className="h-5 w-5 text-red-500" />,
    warning: <AlertCircle className="h-5 w-5 text-yellow-500" />,
  };

  const borders = {
    default: 'border-border',
    success: 'border-green-200 bg-green-50',
    error: 'border-red-200 bg-red-50',
    warning: 'border-yellow-200 bg-yellow-50',
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'flex items-start gap-3 rounded-lg border p-4 shadow-lg bg-background transition-all animate-in slide-in-from-right',
            borders[t.variant]
          )}
        >
          {icons[t.variant]}
          <div className="flex-1 min-w-0">
            {t.title && <p className="font-medium text-sm">{t.title}</p>}
            {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
          </div>
          <button onClick={() => remove(t.id)} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
