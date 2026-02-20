'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  UsersIcon,
  UserGroupIcon,
  DocumentTextIcon,
  CreditCardIcon,
  ArrowPathIcon,
  BanknotesIcon,
  BellIcon,
} from '@heroicons/react/24/outline';
import { useNotifications } from '@/contexts/NotificationContext';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: 'General',
    items: [{ label: 'Dashboard', href: '/', icon: HomeIcon }],
  },
  {
    title: 'Gestión',
    items: [
      { label: 'Clientes', href: '/clientes', icon: UserGroupIcon },
      { label: 'Usuarios', href: '/usuarios', icon: UsersIcon },
      { label: 'Obligaciones', href: '/obligaciones', icon: DocumentTextIcon },
    ],
  },
  {
    title: 'Operaciones',
    items: [
      { label: 'Facturas', href: '/facturas', icon: CreditCardIcon },
      { label: 'Recargas', href: '/recargas', icon: ArrowPathIcon },
      { label: 'Disponibilidad', href: '/disponible', icon: BanknotesIcon },
    ],
  },
  {
    title: 'Sistema',
    items: [{ label: 'Notificaciones', href: '/notificaciones', icon: BellIcon }],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { adminUnread } = useNotifications();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col bg-gray-950 border-r border-white/5">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-5 border-b border-white/5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
          <span className="text-white font-bold text-sm">D1</span>
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-none tracking-tight">DeOne</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Panel Admin</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {navGroups.map((group) => (
          <div key={group.title}>
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
              {group.title}
            </p>
            <ul className="space-y-0.5">
              {group.items.map(({ label, href, icon: Icon }) => {
                const active =
                  href === '/' ? pathname === '/' : pathname.startsWith(href);
                const isNotif = href === '/notificaciones';
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ${
                        active
                          ? 'nav-active text-white'
                          : 'text-gray-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" />
                      <span className="flex-1">{label}</span>
                      {isNotif && adminUnread > 0 && (
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                          {adminUnread > 99 ? '99+' : adminUnread}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/5 px-5 py-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse-dot" />
          <span className="text-[11px] text-gray-500">API Conectada</span>
        </div>
        <p className="text-[10px] text-gray-600 break-all">
          localhost:3001 (local)
        </p>
      </div>
    </aside>
  );
}
