'use client';

interface UtilitiesCardProps {
  totalPagado?: number;
  deudaTotal?: number;
  saldoDisponible?: number;
  deudaPendiente?: number;
}

export function UtilitiesCard({ 
  totalPagado = 0,
  deudaTotal = 0,
  saldoDisponible = 0,
  deudaPendiente = 0,
}: UtilitiesCardProps) {
  const balancePeriodo = saldoDisponible - deudaPendiente;
  const balancePositivo = balancePeriodo >= 0;

  const formatCOPCompact = (value: number) =>
    value.toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      notation: 'compact',
      compactDisplay: 'short',
    });

  return (
    <div className="rounded-[11.5px] border border-[#C9C9C9] bg-[#F9F9F9] p-3 flex flex-col h-full overflow-hidden">
      <h3 className="text-sm font-semibold text-[#1D212B] mb-3">Utilidades</h3>

      <div className="rounded-lg border border-[#E5E7EB] bg-white p-3 flex-1 flex items-center justify-center">
        <p
          className="text-4xl md:text-5xl font-bold leading-none text-center"
          style={{ color: balancePositivo ? '#10B981' : '#EF4444' }}
        >
          {balancePositivo ? '+' : '-'}${formatCOPCompact(Math.abs(balancePeriodo))}
        </p>
      </div>
    </div>
  );
}
