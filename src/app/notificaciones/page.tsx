'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { useNotifications } from '@/contexts/NotificationContext';
import { formatDateTime } from '@/lib/utils';
import {
  BellIcon,
  CheckIcon,
  TrashIcon,
  UserIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

type Tab = 'admin' | 'usuario';

export default function NotificacionesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('admin');
  const router = useRouter();
  const { notifications, adminUnread, userUnread, markRead, markAllRead, clearAll } =
    useNotifications();

  const filtered = notifications.filter((n) => n.target === activeTab);
  const unreadCount = activeTab === 'admin' ? adminUnread : userUnread;

  const handleNotifClick = (n: typeof notifications[0]) => {
    if (!n.read) markRead(n.id);
    if (n.actionUrl) {
      router.push(n.actionUrl);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex bg-white rounded-xl border border-[#e5e7eb] p-1 shadow-sm">
          <TabButton
            active={activeTab === 'admin'}
            onClick={() => setActiveTab('admin')}
            icon={<ShieldCheckIcon className="h-4 w-4" />}
            label="Administrador"
            count={adminUnread}
          />
          <TabButton
            active={activeTab === 'usuario'}
            onClick={() => setActiveTab('usuario')}
            icon={<UserIcon className="h-4 w-4" />}
            label="Usuario (simuladas)"
            count={userUnread}
          />
        </div>

        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button size="sm" variant="secondary" onClick={() => markAllRead(activeTab)}>
              <CheckIcon className="h-3.5 w-3.5" /> Marcar todas leídas
            </Button>
          )}
          {filtered.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => clearAll(activeTab)}>
              <TrashIcon className="h-3.5 w-3.5" /> Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Info banner */}
      {activeTab === 'usuario' && (
        <div className="rounded-xl bg-purple-50 border border-purple-100 px-4 py-3 text-sm text-purple-700">
          💡 Estas son las <strong>notificaciones que recibiría el usuario</strong> tras cada acción del admin.
          Sirven para simular la experiencia del usuario final.
        </div>
      )}

      {/* Notification list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<BellIcon className="h-6 w-6" />}
          title="Sin notificaciones"
          description={
            activeTab === 'admin'
              ? 'Las notificaciones de administrador aparecerán aquí cuando realices acciones.'
              : 'Las notificaciones simuladas del usuario aparecerán aquí al operar desde el panel.'
          }
        />
      ) : (
        <div className="space-y-2 stagger-children">
          {filtered.map((n) => (
            <Card
              key={n.id}
              className={`!p-0 overflow-hidden transition-all cursor-pointer hover:shadow-md ${
                n.read ? 'opacity-70' : ''
              }`}
            >
              <div
                className="flex gap-4 px-5 py-4"
                onClick={() => handleNotifClick(n)}
              >
                {/* Icon */}
                <div className="text-2xl leading-none mt-0.5 shrink-0">
                  {n.title.split(' ')[0]}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-bold text-[#1d212b] truncate">
                      {n.title.split(' ').slice(1).join(' ')}
                    </p>
                    {!n.read && (
                      <span className="h-2 w-2 rounded-full bg-[#ff8d2d] shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{n.message}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] text-gray-400">{formatDateTime(n.timestamp)}</span>
                    <Badge label={n.type.replace(/_/g, ' ')} variant="neutral" dot={false} />
                  </div>
                </div>

                {/* Action button */}
                <div className="flex flex-col items-end gap-2 shrink-0 self-center">
                  {n.actionLabel && n.actionUrl && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!n.read) markRead(n.id);
                        router.push(n.actionUrl!);
                      }}
                      className="flex items-center gap-1 rounded-lg bg-[#ff8d2d]/10 px-3 py-1.5 text-xs font-semibold text-[#ff8d2d] hover:bg-[#ff8d2d]/20 transition-colors"
                    >
                      {n.actionLabel} <ArrowRightIcon className="h-3 w-3" />
                    </button>
                  )}
                  {!n.read && !n.actionLabel && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        markRead(n.id);
                      }}
                    >
                      <CheckIcon className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBox label="Total" value={filtered.length} />
        <StatBox label="No leídas" value={unreadCount} highlight={unreadCount > 0} />
        <StatBox label="Leídas" value={filtered.length - unreadCount} />
        <StatBox
          label="Tipos"
          value={new Set(filtered.map((n) => n.type)).size}
        />
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
        active
          ? 'bg-[#ff8d2d] text-white shadow-sm'
          : 'text-[#6d7382] hover:text-[#1d212b] hover:bg-[#f9f9f9]'
      }`}
    >
      {icon}
      {label}
      {count > 0 && (
        <span
          className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
            active ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function StatBox({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? '!border-[#ff8d2d]/20 !bg-[#ff8d2d]/5' : ''}>
      <p className="text-[10px] text-[#6d7382] font-medium uppercase tracking-wider">{label}</p>
      <p className={`text-xl font-bold mt-0.5 ${highlight ? 'text-[#ff8d2d]' : 'text-[#1d212b]'}`}>
        {value}
      </p>
    </Card>
  );
}
