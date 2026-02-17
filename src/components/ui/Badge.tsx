type Variant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

const styles: Record<Variant, string> = {
  success: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  error: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  info: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  neutral: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
};

const dots: Record<Variant, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
  neutral: 'bg-gray-400',
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
    case 'running':
    case 'ok':
      return 'success';
    case 'en_validacion':
    case 'pendiente':
    case 'extraida':
      return 'warning';
    case 'inactiva':
    case 'rechazada':
    case 'vencida':
      return 'error';
    default:
      return 'neutral';
  }
}

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
