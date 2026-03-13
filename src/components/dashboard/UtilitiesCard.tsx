'use client';

interface UtilitiesCardProps {
  value?: number | string;
  label?: string;
  description?: string;
}

export function UtilitiesCard({ 
  value = 24500, 
  label = 'Utilidades', 
  description = 'Ganancia neta' 
}: UtilitiesCardProps) {
  return (
    <div className="rounded-[11.5px] border border-[#C9C9C9] bg-[#F9F9F9] p-3 flex-shrink-0">
      <h3 className="text-xs font-medium text-[#6D7382] mb-1">{label}</h3>
      <div className="flex items-baseline gap-1 mb-1">
        <p className="text-2xl font-bold text-[#1D212B]">
          ${typeof value === 'number' ? (value / 1000).toFixed(1) : value}k
        </p>
      </div>
      <p className="text-xs text-[#C7C7C7] mb-2">{description}</p>
      <div className="pt-2 border-t border-[#E5E7EB]">
        <div className="flex justify-between items-center">
          <span className="text-xs text-[#6D7382]">Crecimiento</span>
          <span className="text-xs font-semibold text-green-600">+15.3%</span>
        </div>
      </div>
    </div>
  );
}
