'use client';

interface MetricCardProps {
  title: string;
  value: string | number;
  label?: string;
  color?: string;
}

export function MetricCard({ title, value, label, color = '#FF8D2D' }: MetricCardProps) {
  return (
    <div
      className="rounded-[11.5px] border border-[#C9C9C9] bg-[#F9F9F9] p-6"
      style={{ minHeight: '145px' }}
    >
      <div className="flex flex-col h-full justify-between">
        <div>
          <p className="text-xs font-medium text-[#6D7382] mb-2">{title}</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-[#1D212B] mb-2">{value}</p>
          {label && <p className="text-xs text-[#C7C7C7]">{label}</p>}
        </div>
      </div>
    </div>
  );
}
