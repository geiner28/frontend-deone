'use client';

import { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#f9f9f9] text-[#6d7382]">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-[#1d212b]">{title}</h3>
      {description && <p className="mt-1 text-sm text-[#6d7382]">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
