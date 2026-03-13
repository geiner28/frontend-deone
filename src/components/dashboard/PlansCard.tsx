'use client';

interface PlanData {
  label: string;
  users: number;
  percentage: number;
  color: string;
}

interface PlansCardProps {
  plans?: PlanData[];
}

const defaultPlans: PlanData[] = [
  { label: 'Control', users: 145, percentage: 45, color: '#FF8D2D' },
  { label: 'Tranquilidad', users: 98, percentage: 31, color: '#52596B' },
  { label: 'Respaldo', users: 75, percentage: 24, color: '#C9C9C9' },
];

export function PlansCard({ plans = defaultPlans }: PlansCardProps) {
  const totalUsers = plans.reduce((sum, plan) => sum + plan.users, 0);

  return (
    <div className="rounded-[11.5px] border border-[#C9C9C9] bg-[#F9F9F9] p-2 h-full flex flex-col">
      <h3 className="text-xs font-semibold text-[#1D212B] mb-1 flex-shrink-0">Planes</h3>

      <div className="flex flex-col items-center gap-1 overflow-hidden pt-0">
        {/* Circular Chart */}
        <div className="relative w-28 h-28 flex-shrink-0">
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
            {plans.reduce((segments: any[], plan, index) => {
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
              y="54"
              textAnchor="middle"
              className="text-xs font-bold fill-[#1D212B]"
            >
              {totalUsers}
            </text>
            <text
              x="56"
              y="68"
              textAnchor="middle"
              className="text-xs fill-[#6D7382]"
            >
              Usuarios
            </text>
          </svg>
        </div>

        {/* Legend */}
        <div className="w-full space-y-0.5 text-xs flex-shrink-0">
          {plans.map((plan, idx) => (
            <div key={idx} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 min-w-0">
                <div
                  className="w-1 h-1 rounded-full flex-shrink-0"
                  style={{ backgroundColor: plan.color }}
                />
                <span className="text-[#1D212B] font-medium truncate text-xs">{plan.label}</span>
              </div>
              <span className="text-[#6D7382] flex-shrink-0 text-xs">
                {plan.users}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
