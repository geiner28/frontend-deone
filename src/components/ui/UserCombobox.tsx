'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MagnifyingGlassIcon, XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

export interface UserComboboxOption {
  telefono: string;
  nombre: string;
  apellido: string;
}

interface UserComboboxProps {
  options: UserComboboxOption[];
  value: string; // teléfono seleccionado
  onChange: (telefono: string) => void;
  loading?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Combobox con búsqueda por nombre, apellido o teléfono.
 * Permite al admin elegir un usuario sin tener que conocer datos exactos.
 */
export default function UserCombobox({
  options,
  value,
  onChange,
  loading = false,
  placeholder = 'Buscar por nombre o celular…',
  disabled = false,
  className = '',
}: UserComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => options.find((o) => String(o.telefono || '') === String(value || '')) || null,
    [options, value]
  );

  // Texto visible en el input cuando está cerrado
  const closedDisplay = selected
    ? `${selected.nombre} ${selected.apellido} — ${selected.telefono}`.trim()
    : '';

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 50);
    return options
      .filter((o) => {
        const nombre = String(o.nombre || '').toLowerCase();
        const apellido = String(o.apellido || '').toLowerCase();
        const telefono = String(o.telefono || '').toLowerCase();
        return (
          nombre.includes(q) ||
          apellido.includes(q) ||
          telefono.includes(q) ||
          `${nombre} ${apellido}`.trim().includes(q)
        );
      })
      .slice(0, 50);
  }, [options, query]);

  // Cerrar al click fuera
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  // Auto-focus al abrir
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleSelect = (telefono: string) => {
    onChange(telefono);
    setOpen(false);
    setQuery('');
  };

  const handleClear = () => {
    onChange('');
    setQuery('');
  };

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      {/* Botón / display */}
      {!open ? (
        <button
          type="button"
          disabled={disabled || loading}
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-between gap-2 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm text-left text-[#1d212b] focus:outline-none focus:ring-2 focus:ring-[#ff8d2d]/50 focus:border-[#ff8d2d] disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#ff8d2d]/60"
        >
          <span className={selected ? 'truncate' : 'text-[#737780] truncate'}>
            {loading ? 'Cargando…' : selected ? closedDisplay : placeholder}
          </span>
          <span className="flex items-center gap-1 flex-shrink-0">
            {selected && !disabled && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                className="p-0.5 rounded hover:bg-gray-100"
                title="Limpiar"
                role="button"
              >
                <XMarkIcon className="h-4 w-4 text-gray-400" />
              </span>
            )}
            <ChevronDownIcon className="h-4 w-4 text-gray-400" />
          </span>
        </button>
      ) : (
        <div className="rounded-lg border border-[#ff8d2d] bg-white shadow-md">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
            <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="flex-1 bg-transparent text-sm text-[#1d212b] placeholder-[#737780] focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setOpen(false);
                  setQuery('');
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setQuery('');
              }}
              className="p-0.5 rounded hover:bg-gray-100"
              title="Cerrar"
            >
              <XMarkIcon className="h-4 w-4 text-gray-400" />
            </button>
          </div>
          <ul className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-[#737780]">Sin resultados</li>
            ) : (
              filtered.map((u) => {
                const isSel = u.telefono === value;
                return (
                  <li key={u.telefono}>
                    <button
                      type="button"
                      onClick={() => handleSelect(u.telefono)}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 hover:bg-[#fff4e6] ${
                        isSel ? 'bg-[#fff4e6]' : ''
                      }`}
                    >
                      <span className="truncate">
                        <span className="font-medium text-[#1d212b]">
                          {u.nombre} {u.apellido}
                        </span>
                      </span>
                      <span className="text-xs text-[#737780] flex-shrink-0 font-mono">
                        {u.telefono}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
