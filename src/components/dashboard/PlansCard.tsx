'use client';

interface PlanData {
  label: string;
  users: number;
  percentage?: number;
  color: string;
}

interface PlansCardProps {
  plans?: PlanData[];
}

export function PlansCard({ 
  plans = [
    { label: 'Control', users: 145, percentage: 45, color: '#FF8D2D' },
    { label: 'Tranquilidad', users: 98, percentage: 31, color: '#52596B' },
    { label: 'Respaldo', users: 75, percentage: 24, color: '#C9C9C9' },
  ] 
}: PlansCardProps) {
  const totalUsers = plans.reduce((sum, plan) => sum + plan.users, 0);

  // Calcular percentages
  const plansWithPercentages = plans.map((plan) => ({
    ...plan,
    percentage: totalUsers > 0 ? Math.round((plan.users / totalUsers) * 100) : 0,
  }));

  return (
    <div className="rounded-[11.5px] border border-[#C9C9C9] bg-[#F9F9F9] p-2 h-full flex flex-col">
      <h3 className="text-xs font-semibold text-[#1D212B] mb-2 flex-shrink-0">Distribución de Planes</h3>

      <div className="flex flex-row gap-2 overflow-hidden flex-1">
        {/* Circular Chart - IZQUIERDA */}
        <div className="flex justify-center items-center flex-shrink-0">
          <div className="relative w-20 h-20">
            <svg className="w-full h-full" viewBox="0 0 112 112">
              {/* Base circle */}
              <circle
                cx="56"
                cy="56"
                r="38"
                fill="none"
                stroke="#F0F0F0"
                strokeWidth="8"
              />

              {/* Colored segments */}
              {plansWithPercentages.reduce((segments: any[], plan, index) => {
                const prevPercentage = segments.reduce((sum, seg) => sum + seg.percentage, 0);
                const startAngle = (prevPercentage / 100) * 360;
                const endAngle = ((prevPercentage + plan.percentage) / 100) * 360;

                const startRad = (startAngle * Math.PI) / 180;
                const endRad = (endAngle * Math.PI) / 180;

                const x1 = 56 + 38 * Math.cos(startRad);
                const y1 = 56 + 38 * Math.sin(startRad);
                const x2 = 56 + 38 * Math.cos(endRad);
                const y2 = 56 + 38 * Math.sin(endRad);

                const largeArc = plan.percentage > 50 ? 1 : 0;

                segments.push({
                  ...plan,
                  path: `M ${x1} ${y1} A 38 38 0 ${largeArc} 1 ${x2} ${y2}`,
                });

                return segments;
              }, []).map((segment, idx) => (
                <path
                  key={idx}
                  d={segment.path}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth="8"
                  strokeLinecap="round"
                />
              ))}

              {/* Center text */}
              <text
                x="56"
                y="59"
                textAnchor="middle"
                className="text-[12px] font-bold fill-[#1D212B]"
              >
                {totalUsers}
              </text>
            </svg>
          </div>
        </div>

        {/* Description List - DERECHA */}
        <div className="space-y-1 flex-1 overflow-y-auto">
          {plansWithPercentages.map((plan, idx) => (
            <div key={idx} className="flex items-center justify-between p-1.5 bg-white rounded text-xs border border-[#E5E7EB]">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: plan.color }}
                />
                <span className="text-xs font-medium text-[#1D212B] truncate">{plan.label}</span>
              </div>
              <div className="text-right flex-shrink-0 ml-1">
                <span className="text-xs font-bold text-[#1D212B]">{plan.users}</span>
                <span className="text-xs text-[#999999] ml-0.5">({plan.percentage}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-1 pt-1 border-t border-[#E5E7EB] flex-shrink-0">
        <div className="flex justify-between items-center text-xs gap-1">
          <span className="text-[#6D7382] font-medium text-xs">Total</span>
          <span className="font-bold text-[#1D212B] text-xs">{totalUsers}</span>
        </div>
      </div>
    </div>
  );
}
