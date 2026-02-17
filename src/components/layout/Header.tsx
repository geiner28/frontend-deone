'use client';

import { usePathname } from 'next/navigation';
import { BellIcon } from '@heroicons/react/24/outline';

const titles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Resumen general de la plataforma' },
  '/usuarios': { title: 'Usuarios', subtitle: 'Gestión de usuarios y planes' },
  '/obligaciones': { title: 'Obligaciones', subtitle: 'Seguimiento de obligaciones por periodo' },
  '/facturas': { title: 'Facturas', subtitle: 'Captura y gestión de facturas' },
  '/recargas': { title: 'Recargas', subtitle: 'Registro y aprobación de recargas' },
  '/disponible': { title: 'Disponibilidad', subtitle: 'Consulta de saldo disponible por periodo' },
};

export default function Header() {
  const pathname = usePathname();
  const key = Object.keys(titles)
    .filter((k) => k !== '/')
    .find((k) => pathname.startsWith(k)) ?? '/';
  const { title, subtitle } = titles[key] ?? titles['/'];

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-100 bg-white px-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900 leading-none">{title}</h1>
        <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <button className="relative rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
          <BellIcon className="h-5 w-5" />
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-semibold text-sm">
          A
        </div>
      </div>
    </header>
  );
}
