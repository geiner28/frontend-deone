'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  UsersIcon,
  DocumentTextIcon,
  CreditCardIcon,
  ArrowPathIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';

const nav = [
  { label: 'Dashboard', href: '/', icon: HomeIcon },
  { label: 'Usuarios', href: '/usuarios', icon: UsersIcon },
  { label: 'Obligaciones', href: '/obligaciones', icon: DocumentTextIcon },
  { label: 'Facturas', href: '/facturas', icon: CreditCardIcon },
  { label: 'Recargas', href: '/recargas', icon: ArrowPathIcon },
  { label: 'Disponibilidad', href: '/disponible', icon: BanknotesIcon },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-gray-950 border-r border-white/5">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 px-6 border-b border-white/5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
          <span className="text-white font-bold text-sm">D1</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-white leading-none">DeOne</p>
          <p className="text-xs text-gray-500 mt-0.5">Panel de Administración</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-600">
          Módulos
        </p>
        <ul className="space-y-0.5">
          {nav.map(({ label, href, icon: Icon }) => {
            const active =
              href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-white/5 px-4 py-4">
        <p className="text-[10px] text-gray-600">
          Base URL:{' '}
          <span className="text-gray-500 break-all">prueba-supabase.onrender.com</span>
        </p>
      </div>
    </aside>
  );
}
