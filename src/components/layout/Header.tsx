'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { BellIcon, CheckIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { useNotifications } from '@/contexts/NotificationContext';
import { formatDateTime } from '@/lib/utils';
import Link from 'next/link';

const titles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Resumen general de la plataforma' },
  '/clientes': { title: 'Clientes', subtitle: 'Gestión integral de clientes' },
  '/usuarios': { title: 'Usuarios', subtitle: 'Gestión de usuarios y planes' },
  '/obligaciones': { title: 'Obligaciones', subtitle: 'Seguimiento de obligaciones por periodo' },
  '/facturas': { title: 'Facturas', subtitle: 'Captura y gestión de facturas' },
  '/recargas': { title: 'Recargas', subtitle: 'Registro y aprobación de recargas' },
  '/disponible': { title: 'Disponibilidad', subtitle: 'Consulta de saldo disponible por periodo' },
  '/notificaciones': { title: 'Notificaciones', subtitle: 'Centro de notificaciones admin y usuario' },
};

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [showPanel, setShowPanel] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { notifications, adminUnread, markRead, markAllRead } = useNotifications();

  const key = Object.keys(titles)
    .filter((k) => k !== '/')
    .find((k) => pathname.startsWith(k)) ?? '/';
  const { title, subtitle } = titles[key] ?? titles['/'];

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowPanel(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const adminNotifs = notifications.filter((n) => n.target === 'admin').slice(0, 8);

  const handleNotifClick = (n: typeof notifications[0]) => {
    if (!n.read) markRead(n.id);
    setShowPanel(false);
    if (n.actionUrl) {
      router.push(n.actionUrl);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-100 bg-white/80 backdrop-blur-md px-6">
      <div>
        <h1 className="text-lg font-bold text-gray-900 leading-none">{title}</h1>
        <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => setShowPanel(!showPanel)}
            className="relative rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all"
          >
            <BellIcon className="h-5 w-5" />
            {adminUnread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                {adminUnread > 9 ? '9+' : adminUnread}
              </span>
            )}
          </button>

          {showPanel && (
            <div className="absolute right-0 top-12 w-96 rounded-2xl bg-white border border-gray-100 shadow-xl animate-scale-in overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                <p className="text-sm font-semibold text-gray-900">Notificaciones</p>
                {adminUnread > 0 && (
                  <button
                    onClick={() => markAllRead('admin')}
                    className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    <CheckIcon className="h-3 w-3" /> Marcar leídas
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {adminNotifs.length === 0 ? (
                  <div className="py-8 text-center">
                    <BellIcon className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                    <p className="text-xs text-gray-500">Sin notificaciones</p>
                  </div>
                ) : (
                  adminNotifs.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotifClick(n)}
                      className={`flex gap-3 px-4 py-3 border-b border-gray-50 last:border-0 transition-colors cursor-pointer hover:bg-gray-50 ${
                        n.read ? 'opacity-60' : 'bg-indigo-50/40'
                      }`}
                    >
                      <div className="text-lg leading-none mt-0.5 shrink-0">
                        {n.title.split(' ')[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">
                          {n.title.split(' ').slice(1).join(' ')}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[10px] text-gray-400">{formatDateTime(n.timestamp)}</span>
                          {n.actionLabel && (
                            <span className="flex items-center gap-0.5 text-[10px] font-semibold text-indigo-600">
                              {n.actionLabel} <ArrowRightIcon className="h-2.5 w-2.5" />
                            </span>
                          )}
                        </div>
                      </div>
                      {!n.read && (
                        <div className="mt-1.5 h-2 w-2 rounded-full bg-indigo-500 shrink-0" />
                      )}
                    </div>
                  ))
                )}
              </div>
              <Link
                href="/notificaciones"
                onClick={() => setShowPanel(false)}
                className="block text-center py-2.5 text-xs font-semibold text-indigo-600 border-t border-gray-50 hover:bg-gray-50 transition-colors"
              >
                Ver todas las notificaciones
              </Link>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xs shadow-lg shadow-indigo-500/20">
          A
        </div>
      </div>
    </header>
  );
}
