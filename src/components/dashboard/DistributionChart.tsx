'use client';

import { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface DistributionChartProps {
  data?: {
    label: string;
    value: number;
    percentage: number;
    color: string;
  }[];
  onFilterChange?: (filter: string) => void;
}

export function DistributionChart({ 
  data = [
    { label: 'Pagado', value: 45000, percentage: 45, color: '#FF8D2D' },
    { label: 'Pendiente', value: 35000, percentage: 35, color: '#52596B' },
    { label: 'En Proceso', value: 20000, percentage: 20, color: '#C9C9C9' },
  ],
  onFilterChange 
}: DistributionChartProps) {
  const [selectedFilter, setSelectedFilter] = useState('monthly');

  const filters = [
    { id: 'weekly', label: 'Semanal' },
    { id: 'monthly', label: 'Mensual' },
    { id: 'yearly', label: 'Anual' },
  ];

  const total = data.reduce((sum, item) => sum + item.value, 0);

  const handleFilterChange = (filterId: string) => {
    setSelectedFilter(filterId);
    onFilterChange?.(filterId);
  };

  return (
    <div className="rounded-[11.5px] border border-[#C9C9C9] bg-[#F9F9F9] p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <h3 className="text-sm font-semibold text-[#1D212B]">Distribución de Saldo</h3>
        <div className="relative">
          <select
            value={selectedFilter}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="appearance-none px-3 py-1.5 text-xs rounded-lg border border-[#C9C9C9] bg-white text-[#1D212B] focus:outline-none focus:border-[#FF8D2D] pr-6 cursor-pointer"
          >
            {filters.map((filter) => (
              <option key={filter.id} value={filter.id}>
                {filter.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6D7382] pointer-events-none" />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 flex-1 justify-center items-center overflow-hidden">
        {/* Circular Chart */}
        <div className="flex justify-center flex-shrink-0">
          <div className="relative w-48 h-48">
            <svg className="w-full h-full" viewBox="0 0 200 200">
              {/* Base circle */}
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="#F0F0F0"
                strokeWidth="20"
              />
              
              {/* Colored segments */}
              {data.reduce((segments: any[], item, index) => {
                const prevPercentage = segments.reduce((sum, seg) => sum + seg.percentage, 0);
                const startAngle = (prevPercentage / 100) * 360;
                const endAngle = ((prevPercentage + item.percentage) / 100) * 360;
                
                const startRad = (startAngle * Math.PI) / 180;
                const endRad = (endAngle * Math.PI) / 180;
                
                const x1 = 100 + 80 * Math.cos(startRad);
                const y1 = 100 + 80 * Math.sin(startRad);
                const x2 = 100 + 80 * Math.cos(endRad);
                const y2 = 100 + 80 * Math.sin(endRad);
                
                const largeArc = item.percentage > 50 ? 1 : 0;

                segments.push({
                  ...item,
                  path: `M ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2}`,
                });
                
                return segments;
              }, []).map((segment, idx) => (
                <path
                  key={idx}
                  d={segment.path}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth="20"
                  strokeLinecap="round"
                />
              ))}

              {/* Center text */}
              <text
                x="100"
                y="95"
                textAnchor="middle"
                className="text-lg font-bold fill-[#1D212B]"
              >
                {(total / 1000).toFixed(0)}k
              </text>
              <text
                x="100"
                y="115"
                textAnchor="middle"
                className="text-xs fill-[#6D7382]"
              >
                Total
              </text>
            </svg>
          </div>
        </div>

        {/* Legend */}
        <div className="lg:flex-1 flex flex-col justify-center gap-3 min-w-0">
          {data.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between gap-2 flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-[#1D212B] font-medium truncate">{item.label}</span>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-bold text-[#1D212B]">
                  ${(item.value / 1000).toFixed(1)}k
                </p>
                <p className="text-xs text-[#6D7382]">{item.percentage}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
