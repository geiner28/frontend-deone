'use client';

import { useState, useEffect, useCallback } from 'react';
import Toast, { ToastType } from '@/components/ui/Toast';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { getAdminTransacciones } from '@/lib/api';
import type { Transaccion, TransaccionTipo } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

// ─── Tab config ──────────────────────────────────────────────────────────────
type TabKey = 'todos' | 'recarga' | 'pago';

const tabs: { key: TabKey; label: string; tipo?: TransaccionTipo }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'recarga', label: 'Recargas', tipo: 'recarga' },
  { key: 'pago', label: 'Pagos', tipo: 'pago' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatDateShort = (dateStr: string) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

const pagadorBadge = (pagador: string) => {
  const lower = pagador?.toLowerCase() || '';
  if (lower.includes('deone') || lower.includes('de one') || lower === 'deone') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 ring-1 ring-green-200">
        deOne
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 ring-1 ring-orange-200">
      {pagador || 'N/A'}
    </span>
  );
};

const tipoBadge = (tipo: TransaccionTipo) => {
  if (tipo === 'pago') {
    return (
      <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 ring-1 ring-green-200">
        Pago
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 ring-1 ring-orange-200">
      Recarga
    </span>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════════════
export default function PagosPage() {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const showToast = (message: string, type: ToastType) => setToast({ message, type });

  const [entries, setEntries] = useState<Transaccion[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('todos');
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  // Filtro de mes (YYYY-MM o 'todos'). Por defecto: mes actual.
  const _now = new Date();
  const [selectedMes, setSelectedMes] = useState<string>(
    `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}`
  );
  const [sortNewest, setSortNewest] = useState(true);
  const limit = 8;

  // Unique users from entries
  const uniqueUsers = Array.from(
    new Map(entries.map((e) => [e.usuario_id, e.usuario_nombre])).entries()
  ).map(([id, nombre]) => ({ id, nombre }));

  // Fetch
  const fetchTransacciones = useCallback(async () => {
    setLoading(true);
    const tipoFilter = tabs.find((t) => t.key === activeTab)?.tipo;
    const res = await getAdminTransacciones({
      page,
      limit,
      tipo: tipoFilter,
      usuario_id: selectedUser || undefined,
      search: search || undefined,
    });
    setLoading(false);
    if (res.ok && res.data) {
      setEntries(res.data.transacciones);
      setTotal(res.data.total);
      setTotalPages(res.data.total_pages);
    } else {
      const msg =
        res.error && typeof res.error === 'object' && 'message' in res.error
          ? res.error.message
          : 'Error al cargar transacciones';
      showToast(msg, 'error');
    }
  }, [page, activeTab, search, selectedUser]);

  useEffect(() => {
    fetchTransacciones();
  }, [fetchTransacciones]);

  const handleTabChange = (key: TabKey) => {
    setActiveTab(key);
    setPage(1);
  };

  const handleSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setPage(1);
      fetchTransacciones();
    }
  };

  const sorted = sortNewest ? entries : [...entries].reverse();

  // Filtro local por mes (sobre fecha)
  const filteredByMes = selectedMes === 'todos'
    ? sorted
    : sorted.filter((e) => {
        if (!e.fecha) return false;
        const d = new Date(e.fecha);
        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return m === selectedMes;
      });

  // Construir opciones de mes a partir de las entradas + mes actual y anterior
  const mesesOptions = (() => {
    const labels = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const set = new Set<string>();
    const cur = new Date(_now.getFullYear(), _now.getMonth(), 1);
    const prev = new Date(_now.getFullYear(), _now.getMonth() - 1, 1);
    [cur, prev].forEach((d) => set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`));
    entries.forEach((e) => {
      if (e.fecha) {
        const d = new Date(e.fecha);
        set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
    });
    return [
      { value: 'todos', label: 'Todos' },
      ...Array.from(set).sort().reverse().map((v) => {
        const [y, m] = v.split('-');
        return { value: v, label: `${labels[parseInt(m, 10) - 1]} ${y}` };
      }),
    ];
  })();

  const startIndex = (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, total);

  const getPageNumbers = () => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, '...', totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(1, '...', totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', page, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Pagos</h1>
        <p className="text-sm text-gray-500 mt-1">Descripción</p>
        <div className="h-px bg-gray-200 w-full mt-4" />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 p-1 inline-flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === tab.key
                ? 'bg-white text-orange-500 border border-orange-500'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {tab.key === 'todos' && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            )}
            {tab.label}
            {tab.key === 'todos' && total > 0 && (
              <span className="bg-orange-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                {total > 99 ? '99+' : total}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-gray-100 rounded-lg p-3">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <button
            onClick={() => setSortNewest((v) => !v)}
            className="px-4 py-2 bg-white border border-orange-500 text-orange-500 rounded-lg text-sm font-medium hover:bg-orange-50 flex items-center gap-2"
          >
            {sortNewest ? 'Más recientes' : 'Más antiguos'}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            </svg>
          </button>

          <select
            value={selectedUser}
            onChange={(e) => { setSelectedUser(e.target.value); setPage(1); }}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">User: Todos</option>
            {uniqueUsers.map((u) => (
              <option key={u.id} value={u.id}>User: {u.nombre}</option>
            ))}
          </select>

          <select
            value={selectedMes}
            onChange={(e) => setSelectedMes(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {mesesOptions.map((m) => (
              <option key={m.value} value={m.value}>Mes: {m.label}</option>
            ))}
          </select>

          <div className="relative ml-auto w-[300px] flex-shrink-0">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o entidad..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKey}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 pl-10"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <FullPageSpinner />
          </div>
        ) : sorted.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No hay transacciones registradas
          </div>
        ) : filteredByMes.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No hay transacciones en el mes seleccionado
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-900 text-white">
                    <th className="px-4 py-3 text-left font-medium">
                      <span className="flex items-center gap-1">Nombre <span className="text-xs">↕</span></span>
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      <span className="flex items-center gap-1">Tipo de ref <span className="text-xs">↕</span></span>
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      <span className="flex items-center gap-1">Número de ref <span className="text-xs">↕</span></span>
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      <span className="flex items-center gap-1">Fecha <span className="text-xs">↕</span></span>
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      <span className="flex items-center gap-1">Usuario <span className="text-xs">↕</span></span>
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      <span className="flex items-center gap-1">Pagador <span className="text-xs">↕</span></span>
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      <span className="flex items-center gap-1">Monto <span className="text-xs">↕</span></span>
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      <span className="flex items-center gap-1">Tipo <span className="text-xs">↕</span></span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredByMes.map((entry, idx) => (
                    <tr
                      key={entry.id}
                      className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <input type="checkbox" className="rounded border-gray-300" />
                          <span className="text-gray-900 font-medium">{entry.nombre}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-gray-600">
                        {entry.tipo_referencia || '-'}
                      </td>
                      <td className="px-4 py-4 text-gray-600 font-mono text-xs">
                        {entry.numero_referencia || '-'}
                      </td>
                      <td className="px-4 py-4 text-gray-600">
                        {formatDateShort(entry.fecha)}
                      </td>
                      <td className="px-4 py-4 text-gray-700">
                        {entry.usuario_nombre}
                      </td>
                      <td className="px-4 py-4">
                        {pagadorBadge(entry.pagador)}
                      </td>
                      <td className="px-4 py-4 text-gray-900 font-medium">
                        {formatCurrency(entry.monto)}
                      </td>
                      <td className="px-4 py-4">
                        {tipoBadge(entry.tipo)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-white border-t border-gray-200 px-4 py-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Mostrando {startIndex}-{endIndex} de {total.toLocaleString()} registros
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  ‹ Anterior
                </button>

                <div className="flex items-center gap-1">
                  {getPageNumbers().map((p, i) =>
                    p === '...' ? (
                      <span key={`dots-${i}`} className="px-2 text-gray-400">•••</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium ${
                          p === page
                            ? 'bg-orange-500 text-white'
                            : 'border border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                </div>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  Siguiente ›
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
