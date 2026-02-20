'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { Notification, NotificationType } from '@/types';

interface NotificationContextType {
  notifications: Notification[];
  adminUnread: number;
  userUnread: number;
  addNotification: (n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markRead: (id: string) => void;
  markAllRead: (target: 'admin' | 'usuario') => void;
  clearAll: (target: 'admin' | 'usuario') => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be inside NotificationProvider');
  return ctx;
}

let counter = 0;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback(
    (n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
      counter += 1;
      const notif: Notification = {
        ...n,
        id: `notif-${Date.now()}-${counter}`,
        timestamp: new Date().toISOString(),
        read: false,
      };
      setNotifications((prev) => [notif, ...prev]);
    },
    []
  );

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllRead = useCallback((target: 'admin' | 'usuario') => {
    setNotifications((prev) =>
      prev.map((n) => (n.target === target ? { ...n, read: true } : n))
    );
  }, []);

  const clearAll = useCallback((target: 'admin' | 'usuario') => {
    setNotifications((prev) => prev.filter((n) => n.target !== target));
  }, []);

  const adminUnread = notifications.filter((n) => n.target === 'admin' && !n.read).length;
  const userUnread = notifications.filter((n) => n.target === 'usuario' && !n.read).length;

  return (
    <NotificationContext.Provider
      value={{ notifications, adminUnread, userUnread, addNotification, markRead, markAllRead, clearAll }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

// ─── Helper: generar notificaciones según acciones del admin ──────────────────
export function notifFromAction(
  type: NotificationType,
  meta?: Record<string, string>
): Omit<Notification, 'id' | 'timestamp' | 'read'> {
  const map: Record<NotificationType, { title: string; message: string; target: 'admin' | 'usuario'; actionUrl?: string; actionLabel?: string }> = {
    recarga_pendiente: {
      title: '💰 Nueva recarga por aprobar',
      message: `Recarga de ${meta?.monto ?? ''} reportada por ${meta?.telefono ?? 'usuario'}`,
      target: 'admin',
      actionUrl: meta?.recarga_id ? `/clientes?action=aprobar_recarga&id=${meta.recarga_id}&telefono=${meta.telefono ?? ''}` : '/recargas',
      actionLabel: 'Aprobar recarga',
    },
    factura_nueva: {
      title: '📄 Nueva factura capturada',
      message: `Factura de ${meta?.servicio ?? 'servicio'} por ${meta?.monto ?? ''} registrada`,
      target: 'admin',
      actionUrl: meta?.telefono ? `/clientes?action=ver_cliente&telefono=${meta.telefono}` : '/facturas',
      actionLabel: 'Ver factura',
    },
    recarga_aprobada: {
      title: '✅ Tu recarga fue aprobada',
      message: `Tu recarga ha sido verificada y aprobada. Tu saldo está disponible.`,
      target: 'usuario',
      actionUrl: '/disponible',
      actionLabel: 'Ver saldo',
    },
    obligacion_cumplida: {
      title: '🎉 Obligación del mes cumplida',
      message: `Todas las facturas del periodo ${meta?.periodo ?? ''} han sido pagadas.`,
      target: 'usuario',
      actionUrl: '/obligaciones',
      actionLabel: 'Ver obligaciones',
    },
    pago_confirmado: {
      title: '💳 Pago confirmado',
      message: `El pago de ${meta?.servicio ?? 'tu factura'} por ${meta?.monto ?? ''} fue confirmado.`,
      target: 'usuario',
      actionUrl: meta?.telefono ? `/clientes?action=ver_cliente&telefono=${meta.telefono}` : '/facturas',
      actionLabel: 'Ver detalles',
    },
    usuario_nuevo: {
      title: '👤 Nuevo usuario registrado',
      message: `${meta?.nombre ?? 'Usuario'} se registró con el teléfono ${meta?.telefono ?? ''}.`,
      target: 'admin',
      actionUrl: meta?.telefono ? `/clientes?action=ver_cliente&telefono=${meta.telefono}` : '/clientes',
      actionLabel: 'Ver cliente',
    },
    plan_actualizado: {
      title: '📋 Plan actualizado',
      message: `Tu plan cambió de ${meta?.plan_anterior ?? ''} a ${meta?.plan_nuevo ?? ''}.`,
      target: 'usuario',
      actionUrl: '/usuarios',
      actionLabel: 'Ver perfil',
    },
  };

  const info = map[type];
  return {
    type,
    title: info.title,
    message: info.message,
    target: info.target,
    meta,
    actionUrl: info.actionUrl,
    actionLabel: info.actionLabel,
  };
}
