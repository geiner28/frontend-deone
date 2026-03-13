'use client';

import { useState } from 'react';

interface DistributionChartProps {
  title?: string;
  data?: {
    label: string;
    value: number;
    percentage?: number;
    color: string;
  }[];
}

const COLORS = [
  '#FF8D2D', '#52596B', '#C9C9C9', '#FF6B6B', '#4ECDC4',
  '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE',
  '#85C1E2', '#F8B195', '#6C5B7B', '#355C7D', '#2A9D8F',
  '#E76F51', '#F4A261', '#E9C46A', '#264653', '#9B5DE5'
];

export function DistributionChart({
  title = 'Distribución de Saldos por Usuarios',
  data = [
    { label: 'Usuario 1', value: 5000, percentage: 45, color: '#FF8D2D' },
    { label: 'Usuario 2', value: 4000, percentage: 36, color: '#52596B' },
    { label: 'Usuario 3', value: 2000, percentage: 19, color: '#C9C9C9' },
  ],
}: DistributionChartProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Función para formatear como COP
  const formatCOP = (value: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value).replace('$', '$COP ');
  };

  // Asignar colores a cada usuario si no los tienen
  const dataWithColors = data.map((item, idx) => ({
    ...item,
    color: item.color || COLORS[idx % COLORS.length],
    percentage: total > 0 ? Math.round((item.value / total) * 100) : 0,
  }));

  // Generar segmentos del círculo
  const segments = dataWithColors.reduce((acc: any[], item, idx) => {
    const prevPercentage = acc.reduce((sum, seg) => sum + seg.percentage, 0);
    const startAngle = (prevPercentage / 100) * 360;
    const endAngle = ((prevPercentage + item.percentage) / 100) * 360;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = 100 + 75 * Math.cos(startRad);
    const y1 = 100 + 75 * Math.sin(startRad);
    const x2 = 100 + 75 * Math.cos(endRad);
    const y2 = 100 + 75 * Math.sin(endRad);

    const largeArc = item.percentage > 50 ? 1 : 0;

    return [
      ...acc,
      {
        ...item,
        path: `M ${x1} ${y1} A 75 75 0 ${largeArc} 1 ${x2} ${y2}`,
      },
    ];
  }, []);

  return (
    <div className="rounded-[11.5px] border border-[#C9C9C9] bg-[#F9F9F9] p-4 h-full flex flex-col">
      <h3 className="text-sm font-semibold text-[#1D212B] mb-3 flex-shrink-0">{title}</h3>

      <div className="flex flex-col lg:flex-row gap-4 flex-1 justify-between overflow-hidden">
        {/* Lista de usuarios con scroll */}
        <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
          {dataWithColors.map((item, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedIndex(selectedIndex === idx ? null : idx)}
              className={`flex items-center justify-between p-2 rounded cursor-pointer transition-all ${
                selectedIndex === idx 
                  ? 'bg-white border border-[#1D212B]' 
                  : 'bg-white/50 border border-transparent hover:bg-white'
              }`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0 border border-gray-300"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs font-medium text-[#1D212B] truncate">{item.label}</span>
              </div>
              <div className="text-right flex-shrink-0 ml-2">
                <p className="text-xs font-bold text-[#1D212B] whitespace-nowrap">{item.percentage}%</p>
                <p className="text-[10px] text-[#999999] whitespace-nowrap">{formatCOP(item.value)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Gráfico circular */}
        <div className="flex justify-center items-center flex-shrink-0 w-full lg:w-auto">
          <div className="relative w-40 h-40 flex flex-col items-center justify-center">
            <svg className="w-40 h-40" viewBox="0 0 200 200">
              {/* Base circle background */}
              <circle cx="100" cy="100" r="75" fill="none" stroke="#F0F0F0" strokeWidth="16" />

              {/* Segmentos de color */}
              {segments.map((segment, idx) => (
                <path
                  key={idx}
                  d={segment.path}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth="16"
                  strokeLinecap="round"
                  opacity={selectedIndex === null || selectedIndex === idx ? 1 : 0.3}
                  className="transition-opacity cursor-pointer"
                  onClick={() => setSelectedIndex(selectedIndex === idx ? null : idx)}
                />
              ))}

              {/* Centro blanco */}
              <circle cx="100" cy="100" r="40" fill="white" stroke="#F0F0F0" strokeWidth="1" />

              {/* Texto del total */}
              <text
                x="100"
                y="95"
                textAnchor="middle"
                style={{
                  fontSize: formatCOP(total).length > 20 ? '8px' : '9px',
                  fontWeight: 'bold',
                  fill: '#1D212B',
                }}
              >
                Total
              </text>
              <text
                x="100"
                y="110"
                textAnchor="middle"
                style={{
                  fontSize: formatCOP(total).length > 20 ? '7px' : '8px',
                  fontWeight: 'bold',
                  fill: '#1D212B',
                }}
              >
                {formatCOP(total)}
              </text>
            </svg>
          </div>
        </div>
      </div>

      {/* Footer con resumen */}
      <div className="mt-2 pt-2 border-t border-[#E5E7EB] flex-shrink-0">
        <div className="flex justify-between items-center text-xs gap-2">
          <span className="text-[#6D7382] font-medium">Total Usuarios: {dataWithColors.length}</span>
          <span className="font-bold text-[#1D212B]">{formatCOP(total)}</span>
        </div>
      </div>
    </div>
  );
}
