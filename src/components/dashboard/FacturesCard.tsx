'use client';

interface FactureIndicator {
  label: string;
  count: number;
  color: string;
}

interface FacturesCardProps {
  indicators?: FactureIndicator[];
  total?: number;
}

export function FacturesCard({ 
  indicators = [
    { label: 'Pagadas', count: 24, color: '#FF8D2D' },
    { label: 'Pendientes', count: 8, color: '#52596B' },
    { label: 'Vencidas', count: 3, color: '#DC2626' },
    { label: 'En Revisión', count: 2, color: '#F59E0B' },
    { label: 'Rechazadas', count: 1, color: '#6B7280' },
  ], 
  total
}: FacturesCardProps) {
  const totalCount = total ?? indicators.reduce((sum, ind) => sum + ind.count, 0);

  return (
    <div className="rounded-[11.5px] border border-[#C9C9C9] bg-[#F9F9F9] p-3 flex flex-col h-full">
      <div className="flex justify-between items-center mb-2 flex-shrink-0">
        <h3 className="text-xs font-semibold text-[#1D212B]">Facturas</h3>
        <span className="text-base font-bold text-[#FF8D2D]">{totalCount}</span>
      </div>

      <div className="space-y-1.5 flex-1 overflow-y-auto">
        {indicators.map((indicator, idx) => (
          <div key={idx} className="flex items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-1 min-w-0">
              <div
                className="w-1 h-1 rounded-full flex-shrink-0"
                style={{ backgroundColor: indicator.color }}
              />
              <span className="text-[#6D7382] truncate">{indicator.label}</span>
            </div>
            <span className="font-semibold text-[#1D212B] flex-shrink-0">{indicator.count}</span>
          </div>
        ))}
      </div>

      <div className="mt-1.5 pt-1.5 border-t border-[#E5E7EB] flex-shrink-0">
        <div className="flex justify-between items-center text-xs gap-2">
          <span className="text-[#6D7382]">Total</span>
          <span className="font-semibold text-[#1D212B]">{totalCount}</span>
        </div>
      </div>
    </div>
  );
}
