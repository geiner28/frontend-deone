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
  // Métrica 1: Cobertura Total (Total Pagado / Deuda Total)
  const coberturaTotal = deudaTotal > 0 
    ? Math.round((totalPagado / deudaTotal) * 100)
    : 0;

  // Métrica 2: Balance del Período (Saldo Disponible - Deuda Pendiente)
  const balancePeriodo = saldoDisponible - deudaPendiente;
  const balancePositivo = balancePeriodo >= 0;

  const formatCOP = (value: number) => {
    return value.toLocaleString('es-CO', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    });
  };

  return (
    <div className="rounded-[11.5px] border border-[#C9C9C9] bg-[#F9F9F9] p-3 flex flex-col h-full overflow-hidden">
      <h3 className="text-xs font-semibold text-[#1D212B] mb-2">Balance</h3>

      {/* Grid de dos métricas */}
      <div className="grid grid-cols-2 gap-2 flex-1 overflow-hidden">
        
        {/* Métrica 1: Total Pagado vs Deuda Total */}
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-2 flex flex-col overflow-hidden">
          <p className="text-[9px] font-semibold text-[#6D7382] mb-1">Cobertura Total</p>
          
          {/* Porcentaje grande */}
          <div className="flex items-baseline gap-0.5 mb-1">
            <span className="text-xl font-bold text-[#1D212B]">{coberturaTotal}%</span>
            <span className="text-[8px] text-[#6D7382]">cubierto</span>
          </div>

          {/* Detalles */}
          <div className="text-[8px] space-y-0.5 text-[#6D7382] flex-1 overflow-hidden">
            <div className="flex justify-between">
              <span>Pagado:</span>
              <span className="font-semibold text-[#1D212B]">${formatCOP(totalPagado)}</span>
            </div>
            <div className="flex justify-between">
              <span>Deuda:</span>
              <span className="font-semibold text-[#1D212B]">${formatCOP(deudaTotal)}</span>
            </div>
          </div>

          {/* Barra de progreso */}
          <div className="w-full h-1 bg-[#E5E7EB] rounded-full overflow-hidden mt-1">
            <div
              className="h-full transition-all"
              style={{
                width: `${Math.min(coberturaTotal, 100)}%`,
                backgroundColor: coberturaTotal >= 100 ? '#10B981' : 
                                 coberturaTotal >= 75 ? '#6366F1' :
                                 coberturaTotal >= 50 ? '#F59E0B' : '#EF4444'
              }}
            />
          </div>
        </div>

        {/* Métrica 2: Saldo Disponible vs Deuda Pendiente */}
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-2 flex flex-col overflow-hidden">
          <p className="text-[9px] font-semibold text-[#6D7382] mb-1">Balance</p>
          
          {/* Balance grande con color */}
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-xl font-bold" style={{
              color: balancePositivo ? '#10B981' : '#EF4444'
            }}>
              {balancePositivo ? '+' : '-'}${formatCOP(Math.abs(balancePeriodo))}
            </span>
          </div>

          {/* Detalles */}
          <div className="text-[8px] space-y-0.5 text-[#6D7382] flex-1 overflow-hidden">
            <div className="flex justify-between">
              <span>Disponible:</span>
              <span className="font-semibold text-[#1D212B]">${formatCOP(saldoDisponible)}</span>
            </div>
            <div className="flex justify-between">
              <span>Deuda:</span>
              <span className="font-semibold text-[#1D212B]">${formatCOP(deudaPendiente)}</span>
            </div>
          </div>

          {/* Estado */}
          <div className="mt-1 text-[8px] font-semibold" style={{
            color: balancePositivo ? '#10B981' : '#EF4444'
          }}>
            {balancePositivo ? '✓ Positivo' : '⚠ Déficit'}
          </div>
        </div>
      </div>
    </div>
  );
}
