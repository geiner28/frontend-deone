import { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface AccionGroupCollapsibleProps {
  title: string;
  icon: string;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export default function AccionGroupCollapsible({
  title,
  icon,
  count,
  children,
  defaultOpen = true,
}: AccionGroupCollapsibleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      {/* Header acordeón */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-100"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div className="text-left">
            <p className="font-bold text-[#1d212b]">{title}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {count} {count === 1 ? 'item' : 'items'} para revisar
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
            {count}
          </span>
          <ChevronDownIcon
            className={`h-5 w-5 text-gray-600 transition-transform duration-300 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Contenido colapsable */}
      {isOpen && (
        <div className="divide-y">
          {children}
        </div>
      )}
    </div>
  );
}
