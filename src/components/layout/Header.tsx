'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { BellIcon, CheckIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { useNotifications } from '@/contexts/NotificationContext';
import { formatDateTime } from '@/lib/utils';
import Link from 'next/link';

const titles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: '', subtitle: '' },
  '/clientes': { title: '', subtitle: '' },
  '/usuarios': { title: 'Usuarios', subtitle: 'Gestión de usuarios y planes' },
  '/obligaciones': { title: 'Obligaciones', subtitle: 'Seguimiento de obligaciones por periodo' },
  '/facturas': { title: '', subtitle: '' },
  '/recargas': { title: '', subtitle: '' },
  '/disponible': { title: 'Disponibilidad', subtitle: 'Consulta de saldo disponible por periodo' },
  '/notificaciones': { title: '', subtitle: '' },
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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#e5e7eb] bg-white/80 backdrop-blur-md px-6 glass">
      <div>
        <h1 className="text-lg font-bold text-[#1d212b] leading-none">{title}</h1>
        <p className="text-xs text-[#6d7382] mt-0.5">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => setShowPanel(!showPanel)}
            className="relative rounded-xl p-2 text-[#6d7382] hover:bg-[#f9f9f9] hover:text-[#1d212b] transition-all"
          >
            <BellIcon className="h-5 w-5" />
            {adminUnread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#ff8d2d] px-1 text-[9px] font-bold text-white shadow-[0_0_20px_rgba(255,141,45,0.3)]">
                {adminUnread > 9 ? '9+' : adminUnread}
              </span>
            )}
          </button>

          {showPanel && (
            <div className="absolute right-0 top-12 w-96 rounded-2xl bg-white border border-[#e5e7eb] shadow-xl animate-scale-in overflow-hidden glass">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#f0f0f0]">
                <p className="text-sm font-semibold text-[#1d212b]">Notificaciones</p>
                {adminUnread > 0 && (
                  <button
                    onClick={() => markAllRead('admin')}
                    className="flex items-center gap-1 text-[11px] font-medium text-[#ff8d2d] hover:text-[#ff7a0a]"
                  >
                    <CheckIcon className="h-3 w-3" /> Marcar leídas
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {adminNotifs.length === 0 ? (
                  <div className="py-8 text-center">
                    <BellIcon className="mx-auto h-8 w-8 text-[#e5e7eb] mb-2" />
                    <p className="text-xs text-[#6d7382]">Sin notificaciones</p>
                  </div>
                ) : (
                  adminNotifs.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotifClick(n)}
                      className={`flex gap-3 px-4 py-3 border-b border-[#f0f0f0] last:border-0 transition-colors cursor-pointer hover:bg-[#f9f9f9] ${
                        n.read ? 'opacity-60' : 'bg-[#ff8d2d]/10'
                      }`}
                    >
                      <div className="text-lg leading-none mt-0.5 shrink-0">
                        {n.title.split(' ')[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#1d212b] truncate">
                          {n.title.split(' ').slice(1).join(' ')}
                        </p>
                        <p className="text-[11px] text-[#6d7382] mt-0.5 line-clamp-2">{n.message}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[10px] text-[#737780]">{formatDateTime(n.timestamp)}</span>
                          {n.actionLabel && (
                            <span className="flex items-center gap-0.5 text-[10px] font-semibold text-[#ff8d2d]">
                              {n.actionLabel} <ArrowRightIcon className="h-2.5 w-2.5" />
                            </span>
                          )}
                        </div>
                      </div>
                      {!n.read && (
                        <div className="mt-1.5 h-2 w-2 rounded-full bg-[#ff8d2d] shrink-0" />
                      )}
                    </div>
                  ))
                )}
              </div>
              <Link
                href="/notificaciones"
                onClick={() => setShowPanel(false)}
                className="block text-center py-2.5 text-xs font-semibold text-[#ff8d2d] border-t border-[#f0f0f0] hover:bg-[#f9f9f9] transition-colors"
              >
                Ver todas las notificaciones
              </Link>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff8d2d] to-[#ff7a0a] text-white font-bold text-xs shadow-lg shadow-[#ff8d2d]/30">
          A
        </div>
      </div>
    </header>
  );
}
