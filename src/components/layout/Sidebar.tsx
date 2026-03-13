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
      { label: 'Usuarios', href: '/clientes', icon: UserGroupIcon },
      // { label: 'Clientes', href: '/usuarios', icon: UsersIcon },
      { label: 'Facturas', href: '/facturas', icon: CreditCardIcon },
      { label: 'Pagos', href: '/recargas', icon: ArrowPathIcon },
      // { label: 'Obligaciones', href: '/obligaciones', icon: DocumentTextIcon },
    ],
  },
  // {
  //   title: 'Operaciones',
  //   items: [
  //     { label: 'Disponibilidad', href: '/disponible', icon: BanknotesIcon },
  //   ],
  // },
  {
    title: 'Sistema',
    items: [{ label: 'Historial', href: '/historial', icon: ArrowPathIcon },
            { label: 'Notificaciones', href: '/notificaciones', icon: BellIcon} ,
            
    ],
    
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { adminUnread } = useNotifications();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col bg-gray-950 border-r border-white/5">
      {/* Logo */}
      <div className="flex flex-col h-20 items-start gap-1.5 px-5 border-b border-white/5 pt-3 pb-3">
        <img 
          src="/deOne_logo.png" 
          alt="DeOne" 
          className="h-7 w-auto" 
        />
        <p className="text-xs font-bold text-white leading-tight tracking-tight ml-0.5 pt-0.5">Admin</p>
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

      {/* Footer removed per Figma wireframe */}
    </aside>
  );
}
