type Variant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

const styles: Record<Variant, string> = {
  success: 'bg-[#10b981]/10 text-[#10b981] ring-1 ring-[#10b981]/20',
  warning: 'bg-[#f59e0b]/10 text-[#f59e0b] ring-1 ring-[#f59e0b]/20',
  error: 'bg-[#ef4444]/10 text-[#ef4444] ring-1 ring-[#ef4444]/20',
  info: 'bg-[#3b82f6]/10 text-[#3b82f6] ring-1 ring-[#3b82f6]/20',
  neutral: 'bg-[#e5e7eb] text-[#6d7382] ring-1 ring-[#e5e7eb]',
};

const dots: Record<Variant, string> = {
  success: 'bg-[#10b981]',
  warning: 'bg-[#f59e0b]',
  error: 'bg-[#ef4444]',
  info: 'bg-[#3b82f6]',
  neutral: 'bg-[#9ca3af]',
};

interface BadgeProps {
  label: string;
  variant?: Variant;
  dot?: boolean;
}

export function variantFromEstado(estado: string): Variant {
  switch (estado) {
    case 'activa':
    case 'aprobada':
    case 'pagada':
    case 'completada':
    case 'running':
    case 'ok':
      return 'success';
    case 'en_validacion':
    case 'en_progreso':
    case 'pendiente':
    case 'extraida':
      return 'warning';
    case 'inactiva':
    case 'rechazada':
    case 'cancelada':
    case 'vencida':
      return 'error';
    default:
      return 'neutral';
  }
}

export const ESTADOS_OBLIGACION: { value: string; label: string }[] = [
  { value: 'activa', label: 'Activa' },
  { value: 'en_progreso', label: 'En progreso' },
  { value: 'completada', label: 'Completada' },
  { value: 'cancelada', label: 'Cancelada' },
];

export default function Badge({ label, variant = 'neutral', dot = true }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[variant]}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dots[variant]}`} />}
      {label}
    </span>
  );
}
