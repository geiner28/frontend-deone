import type { ApiResponse } from '@/types';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Extrae el mensaje de error de una ApiResponse (error puede ser string u objeto) */
export function getErrorMsg<T>(res: ApiResponse<T>, fallback = 'Error desconocido'): string {
  if (!res.error) return fallback;
  if (typeof res.error === 'string') return res.error;
  return res.error.message ?? fallback;
}
