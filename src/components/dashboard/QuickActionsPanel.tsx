'use client';

import { useState } from 'react';
import { UserPlusIcon, DocumentPlusIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
}

const defaultActions: QuickAction[] = [
  {
    id: 'new-user',
    label: 'Nuevo Usuario',
    icon: <UserPlusIcon className="h-5 w-5" />,
    href: '/usuarios',
  },
  {
    id: 'new-obligation',
    label: 'Añadir Obligación',
    icon: <DocumentPlusIcon className="h-5 w-5" />,
    href: '/obligaciones',
  },
  {
    id: 'register-recharge',
    label: 'Registrar Recarga',
    icon: <ArrowPathIcon className="h-5 w-5" />,
    href: '/recargas',
  },
];

interface QuickActionsPanelProps {
  actions?: QuickAction[];
}

export function QuickActionsPanel({ actions = defaultActions }: QuickActionsPanelProps) {
  const [activeButton, setActiveButton] = useState<string | null>(null);

  return (
    <div className="rounded-[11.5px] border border-[#C9C9C9] bg-gray-950 p-3 h-full flex flex-col">
      <h3 className="text-xs font-semibold text-white mb-2 flex-shrink-0">⚡ Acciones</h3>
      <div className="grid grid-cols-1 gap-2 flex-1 content-start">
        {actions.map((action) => (
          <Link key={action.id} href={action.href}>
            <button
              onClick={() => setActiveButton(action.id)}
              onMouseLeave={() => setActiveButton(null)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-700 bg-gray-900 text-white font-medium text-xs transition-all duration-200 hover:border-[#FF8D2D] hover:bg-gray-800 active:scale-95"
              style={{
                borderColor: activeButton === action.id ? '#FF8D2D' : undefined,
                backgroundColor: activeButton === action.id ? 'rgba(255, 141, 45, 0.1)' : undefined,
                color: activeButton === action.id ? '#FF8D2D' : undefined,
              }}
            >
              <span
                className="flex-shrink-0"
                style={{
                  color: activeButton === action.id ? '#FF8D2D' : 'currentColor',
                }}
              >
                <span className="h-4 w-4 flex items-center justify-center">
                  {action.icon}
                </span>
              </span>
              <span className="truncate">{action.label}</span>
            </button>
          </Link>
        ))}
      </div>
    </div>
  );
}
