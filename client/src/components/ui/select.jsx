import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export function Select({ className, children, ...props }) {
  return (
    <div className="relative w-full">
      <select
        className={cn(
          'w-full appearance-none rounded-md border border-slate-200 bg-white px-3 py-2 pr-8 text-sm text-slate-800',
          'shadow-sm transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
    </div>
  );
}

/* ── StatusSelect — select con indicador de color según estado ── */
const STATUS_COLORS = {
  // Trabajos
  PENDING:     'bg-yellow-50 border-yellow-300 text-yellow-800',
  IN_PROGRESS: 'bg-blue-50   border-blue-300   text-blue-800',
  FINISHED:    'bg-green-50  border-green-300   text-green-800',
  DELIVERED:   'bg-slate-100 border-slate-300   text-slate-700',
  // Presupuestos
  DRAFT:       'bg-slate-100 border-slate-300   text-slate-700',
  SENT:        'bg-blue-50   border-blue-300    text-blue-800',
  APPROVED:    'bg-green-50  border-green-300   text-green-800',
  REJECTED:    'bg-red-50    border-red-300     text-red-800',
};

export function StatusSelect({ value, onChange, options, className }) {
  const colorClass = STATUS_COLORS[value] || 'bg-white border-slate-200 text-slate-800';
  return (
    <div className={cn('relative', className)}>
      <select
        value={value}
        onChange={onChange}
        className={cn(
          'w-full appearance-none rounded-md border px-3 py-1.5 pr-7 text-sm font-medium',
          'shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500',
          'disabled:cursor-not-allowed disabled:opacity-50',
          colorClass,
        )}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 opacity-60" />
    </div>
  );
}
