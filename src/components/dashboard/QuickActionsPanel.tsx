'use client';

import { useState } from 'react';
import { UserPlusIcon, DocumentPlusIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import UpsertUsuarioAdminModal from '@/components/modals/UpsertUsuarioAdminModal';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
}

const defaultActions: QuickAction[] = [
  {
    id: 'new-user',
    label: 'Crear / Actualizar Usuario',
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
  const [openUserModal, setOpenUserModal] = useState(false);

  const handleActionClick = (action: QuickAction) => {
    if (action.id === 'new-user') {
      setOpenUserModal(true);
    } else {
      setActiveButton(action.id);
    }
  };

  return (
    <>
      <div className="rounded-[11.5px] border border-[#C9C9C9] bg-gray-950 p-3 h-full flex flex-col">
        <h3 className="text-xs font-semibold text-white mb-2 flex-shrink-0">⚡ Acciones</h3>
        <div className="grid grid-cols-1 gap-2 flex-1 content-start">
          {actions.map((action) => {
            // Para 'new-user', renderizar como button sin Link
            if (action.id === 'new-user') {
              return (
                <button
                  key={action.id}
                  onClick={() => handleActionClick(action)}
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
              );
            }

            // Para otros, mantener Link
            return (
              <Link key={action.id} href={action.href}>
                <button
                  onClick={() => handleActionClick(action)}
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
            );
          })}
        </div>
      </div>

      {/* Modal: Crear/Actualizar Usuario (admin) */}
      <UpsertUsuarioAdminModal
        open={openUserModal}
        onClose={() => setOpenUserModal(false)}
        onSuccess={() => {
          // Opcional: notificar al padre que se creó un usuario
          console.log('Usuario creado/actualizado desde dashboard');
        }}
      />
    </>
  );
}
