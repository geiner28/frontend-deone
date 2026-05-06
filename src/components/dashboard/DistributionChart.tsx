'use client';

import { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface DistributionChartProps {
  title?: string;
  data?: {
    label: string;
    value: number;
    color?: string;
  }[];
}

const COLORS = [
  '#FF8D2D', '#52596B', '#A3B3C6', '#FF6B6B', '#4ECDC4',
  '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE',
];

const formatCOP = (value: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

export function DistributionChart({
  title = 'Distribución de saldo',
  data = [],
}: DistributionChartProps) {
  const [selectedUser, setSelectedUser] = useState<string>('todos');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const dataWithColors = data.map((item, idx) => ({
    ...item,
    color: item.color || COLORS[idx % COLORS.length],
  }));

  const total = dataWithColors.reduce((sum, item) => sum + item.value, 0);

  // Donut segments
  const SIZE = 160;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const R = 56;
  const STROKE = 22;
  const GAP_DEG = 2;

  type Segment = { path: string; color: string; label: string };
  const segments: Segment[] = [];
  let cursor = -90;

  dataWithColors.forEach((item) => {
    const pct = total > 0 ? item.value / total : 0;
    const spanDeg = pct * 360 - GAP_DEG;
    if (spanDeg <= 0) return;

    const toRad = (d: number) => (d * Math.PI) / 180;
    const x1 = CX + R * Math.cos(toRad(cursor));
    const y1 = CY + R * Math.sin(toRad(cursor));
    const endAngle = cursor + spanDeg;
    const x2 = CX + R * Math.cos(toRad(endAngle));
    const y2 = CY + R * Math.sin(toRad(endAngle));
    const largeArc = spanDeg > 180 ? 1 : 0;

    segments.push({
      path: `M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2}`,
      color: item.color,
      label: item.label,
    });

    cursor = endAngle + GAP_DEG;
  });

  const totalFormatted = formatCOP(total);
  const centerFontSize = totalFormatted.length > 12 ? '10' : '12';

  const selectedLabel =
    selectedUser === 'todos'
      ? 'User'
      : dataWithColors.find((u) => u.label === selectedUser)?.label ?? 'User';

  return (
    <div className="rounded-[11.5px] border border-[#C9C9C9] bg-white p-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-sm font-semibold text-[#1D212B]">{title}</h3>

        <div className="relative">
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#C9C9C9] bg-white text-xs text-[#1D212B] font-medium hover:bg-gray-50 transition-colors"
          >
            <span className="max-w-[80px] truncate">{selectedLabel}</span>
            <ChevronDownIcon className="w-3.5 h-3.5 text-[#6D7382] flex-shrink-0" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-[#C9C9C9] rounded-lg shadow-md z-20 min-w-[140px] overflow-hidden">
              <button
                onClick={() => { setSelectedUser('todos'); setDropdownOpen(false); }}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${selectedUser === 'todos' ? 'font-semibold text-[#FF8D2D]' : 'text-[#1D212B]'}`}
              >
                Todos
              </button>
              {dataWithColors.map((u) => (
                <button
                  key={u.label}
                  onClick={() => { setSelectedUser(u.label); setDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 truncate ${selectedUser === u.label ? 'font-semibold text-[#FF8D2D]' : 'text-[#1D212B]'}`}
                >
                  {u.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Body: donut LEFT + legend RIGHT */}
      <div className="flex flex-row items-center gap-4 flex-1 min-h-0">
        {/* Donut */}
        <div className="flex-shrink-0 flex items-center justify-center">
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            <circle cx={CX} cy={CY} r={R} fill="none" stroke="#E5E7EB" strokeWidth={STROKE} />

            {segments.length > 0 ? segments.map((seg, i) => (
              <path
                key={i}
                d={seg.path}
                fill="none"
                stroke={seg.color}
                strokeWidth={STROKE}
                strokeLinecap="butt"
                opacity={selectedUser === 'todos' || selectedUser === seg.label ? 1 : 0.2}
                className="transition-opacity"
              />
            )) : (
              <circle cx={CX} cy={CY} r={R} fill="none" stroke="#D1D5DB" strokeWidth={STROKE} />
            )}

            <text x={CX} y={CY - 6} textAnchor="middle" fontSize={centerFontSize} fontWeight="700" fill="#1D212B">
              {totalFormatted}
            </text>
            <text x={CX} y={CY + 9} textAnchor="middle" fontSize="9" fill="#6D7382">
              Saldo total
            </text>
          </svg>
        </div>

        {/* Legend */}
        <div className="flex-1 min-w-0 overflow-y-auto space-y-3">
          {dataWithColors.length === 0 ? (
            <p className="text-xs text-[#6D7382]">Sin datos</p>
          ) : (
            dataWithColors.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0 bg-[#22c55e]" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[#1D212B] truncate leading-tight">{item.label}</p>
                  <p className="text-xs text-[#6D7382] leading-tight">{formatCOP(item.value)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
