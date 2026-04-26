import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount ?? 0);
}

export function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export const JOB_STATUS = {
  PENDING: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
  IN_PROGRESS: { label: 'En proceso', color: 'bg-blue-100 text-blue-800' },
  FINISHED: { label: 'Finalizado', color: 'bg-green-100 text-green-800' },
  DELIVERED: { label: 'Entregado', color: 'bg-gray-100 text-gray-700' },
};

export const QUOTE_STATUS = {
  DRAFT: { label: 'Borrador', color: 'bg-gray-100 text-gray-700' },
  SENT: { label: 'Enviado', color: 'bg-blue-100 text-blue-800' },
  APPROVED: { label: 'Aprobado', color: 'bg-green-100 text-green-800' },
  REJECTED: { label: 'Rechazado', color: 'bg-red-100 text-red-800' },
};

export function clientFullName(client) {
  if (!client) return '—';
  return `${client.lastName}, ${client.firstName}`;
}

export function vehicleLabel(v) {
  if (!v) return '—';
  return `${v.brand} ${v.model}${v.year ? ` (${v.year})` : ''}${v.plate ? ` — ${v.plate}` : ''}`;
}
