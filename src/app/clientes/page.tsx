'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Toast, { ToastType } from '@/components/ui/Toast';
import EmptyState from '@/components/ui/EmptyState';
import { FullPageSpinner } from '@/components/ui/Spinner';
import ClientDetailViewAlternative from './ClientDetailViewAlternative';
import {
  getAdminClientes,
  getAdminClientePerfil,
} from '@/lib/api';
import type {
  Usuario,
  AdminClientePerfilData,
} from '@/types';
import { formatCurrency, getErrorMsg } from '@/lib/utils';
import {
  UserGroupIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';


// ─── Helpers ──────────────────────────────────────────────────────────────────
const getPlanVariant = (plan: string): string => {
  switch (plan) {
    case 'control': return 'inline-flex items-center px-2.5 py-0.5 rounded-full font-medium border text-xs text-blue-700 bg-blue-100 border-blue-400 hover:bg-blue-200';
    case 'tranquilidad': return 'inline-flex items-center px-2.5 py-0.5 rounded-full font-medium border text-xs text-red-700 bg-red-100 border-red-400 hover:bg-red-200';
    case 'respaldo': return 'inline-flex items-center px-2.5 py-0.5 rounded-full font-medium border text-xs text-green-700 bg-green-100 border-green-400 hover:bg-green-200';
    default: return 'inline-flex items-center px-2.5 py-0.5 rounded-full font-medium border text-xs text-gray-600 bg-gray-100 border-gray-300 hover:bg-gray-200';
  }
};


const estadoRecargaVariant = (e: string) => {
  if (e === 'aprobada') return 'success' as const;
  if (e === 'rechazada') return 'error' as const;
  return 'warning' as const;
};

// ═══════════════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════════════
export default function ClientesPage() {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const showToast = (message: string, type: ToastType) => setToast({ message, type });

  // ─── List state ───────────────────────────────────────────────────────
  const [clientes, setClientes] = useState<Usuario[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
const [filterPlan, setFilterPlan] = useState('');
  const [filterFactura, setFilterFactura] = useState('');
const [listLoading, setListLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');

  // ─── Detail state ─────────────────────────────────────────────────────
  const [selectedTelefono, setSelectedTelefono] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<AdminClientePerfilData | null>(null);
  const [perfilLoading, setPerfilLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'obligaciones' | 'recargas' | 'pagos' | 'notificaciones'>('obligaciones');

  // ─── Fetch list ───────────────────────────────────────────────────────
  const fetchClientes = useCallback(async () => {
    setListLoading(true);
      const res = await getAdminClientes({ 
        page, 
        limit: 20, 
        search: search || undefined, 
        plan: filterPlan || undefined
      });
    setListLoading(false);
    if (res.ok && res.data) {
      setClientes(res.data.clientes);
      setTotal(res.data.total);
      setTotalPages(res.data.total_pages);
    } else {
      showToast(getErrorMsg(res, 'Error al cargar clientes'), 'error');
    }
  }, [page, search, filterPlan, filterFactura]);

  useEffect(() => { fetchClientes(); }, [fetchClientes]);

  // ─── Fetch detail ─────────────────────────────────────────────────────
  const openClientProfile = async (telefono: string) => {
    setSelectedTelefono(telefono);
    setPerfilLoading(true);
    setActiveTab('obligaciones');
    const res = await getAdminClientePerfil(telefono);
    setPerfilLoading(false);
    if (res.ok && res.data) {
      setPerfil(res.data);
    } else {
      showToast(getErrorMsg(res, 'Error al cargar perfil del cliente'), 'error');
      setSelectedTelefono(null);
    }
  };

  const reloadProfile = async () => {
    if (!selectedTelefono) return;
    const res = await getAdminClientePerfil(selectedTelefono);
    if (res.ok && res.data) setPerfil(res.data);
  };

  const goBack = () => {
    setSelectedTelefono(null);
    setPerfil(null);
    fetchClientes();
  };

  // ─── Search on enter ──────────────────────────────────────────────────
  const handleSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { setPage(1); fetchClientes(); }
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // DETAIL VIEW
  // ═════════════════════════════════════════════════════════════════════════════
  if (selectedTelefono) {
    if (perfilLoading) return <FullPageSpinner />;
    if (!perfil) return null;

    return (
      <ClientDetailViewAlternative
        perfil={perfil}
        onBack={goBack}
      />
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // LIST VIEW
  // ═════════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Usuarios</h1>
            <p className="text-sm text-gray-500 mt-1">Gestión integral de usuarios</p>
          </div>
          
          {/* Toggle Vista */}
          <div className="view-toggle flex bg-gray-100 border border-gray-200 rounded-xl p-1">
            <button 
              className={`toggle-btn flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${viewMode === 'table' ? 'bg-amber-500 text-white shadow-md border-amber-500' : 'text-gray-600 hover:bg-gray-200 border-gray-200'}`}
              onClick={() => setViewMode('table')}
            >
              <i className="fa-solid fa-table"></i>
              Tabla
            </button>
            <button 
              className={`toggle-btn flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${viewMode === 'card' ? 'bg-amber-500 text-white shadow-md border-amber-500' : 'text-gray-600 hover:bg-gray-200 border-gray-200'}`}
              onClick={() => setViewMode('card')}
            >
              <i className="fa-regular fa-address-card"></i>
              Cards
            </button>
          </div>
        </div>
        <div className="h-px bg-gray-200 w-full mt-4"></div>
      </div>

{/* Filters */}
<div className="bg-white border border-gray-200 rounded-lg p-3 mb-6">
  <div className="flex flex-wrap items-center gap-3 justify-between">
    
    {/* Contenedor del Select (Izquierda) */}
    <div className="filter-select flex items-center border border-gray-200 rounded-md bg-white px-3 py-2 hover:bg-gray-50 focus-within:ring-2 focus-within:ring-[var(--table-header)]/50">
      <i className="fa-regular fa-building text-gray-500" style={{ marginRight: '6px' }} />
      <select 
        value={filterPlan}
        onChange={(e) => { setFilterPlan(e.target.value); setPage(1); }}
        className="bg-transparent border-none outline-none flex-1 text-sm text-gray-700"
      >
        <option value="">Plan: Todas</option>
        <option value="control">Control</option>
        <option value="tranquilidad">Tranquilidad</option>
        <option value="respaldo">Respaldo</option>
      </select>
    </div>

    <div className="relative ml-auto w-[300px] flex-shrink-0">
      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      
      <Input
        placeholder="Buscar por nombre, celular.."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={handleSearchKey}
        className="w-full rounded-full border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm text-gray-700 outline-none focus:border-[var(--table-header)] focus:ring-[var(--table-header)]/50"
      />
    </div>

  </div>
</div>

      {/* List */}
      {listLoading ? (
        <FullPageSpinner />
      ) : clientes.length === 0 ? (
        <EmptyState
          icon={<UserGroupIcon className="h-6 w-6" />}
          title="Sin clientes"
          description="No se encontraron clientes con los filtros actuales."
        />
      ) : (
        <>
{viewMode === 'table' ? (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full table-auto">
                <thead className="bg-[var(--table-header)] text-white">
                  <tr>
                    <th className="p-4 text-left"><input type="checkbox" /></th>
                    <th className="p-4 text-left font-medium w-48">Usuario</th>
                    <th className="p-4 text-left font-medium w-40">Celular</th>
                    <th className="p-4 text-left font-medium">Facturas</th>
                    <th className="p-4 text-center font-medium">Pagadas</th>
<th className="p-4 text-center font-medium">Pendientes</th>
                    <th className="p-4 text-right font-medium">Saldo</th>
                    <th className="p-4 text-left font-medium">Plan</th>
                  </tr>
                </thead>
                <tbody>

{clientes.map((c: any) => {
                    const ultima = c.ultima_obligacion?.[0] || {};
                    const totalF = ultima.total_facturas || 0;
                    const pagadas = ultima.facturas_pagadas || 0;
                    const pendientes = Math.max(0, totalF - pagadas);
                    return (
                    <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => openClientProfile(c.telefono)}>
                      <td className="p-4"><input type="checkbox" /></td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="font-medium text-gray-900">{c.nombre} {c.apellido}</div>
                          <PencilSquareIcon className="h-4 w-4 text-gray-400 hover:text-[var(--table-header)] cursor-pointer ml-2" />
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center">
                          <span>{c.telefono}</span>
                          <PencilSquareIcon className="h-4 w-4 text-gray-400 hover:text-[var(--table-header)] cursor-pointer ml-2" />
                        </div>
                      </td>
                      <td className="p-4 font-medium text-[var(--table-header)]">{totalF}</td>
                      <td className="p-4 text-center text-emerald-600 font-medium">{pagadas}</td>
                      <td className="p-4 text-center text-amber-600 font-medium">{pendientes}</td>
                      <td className="p-4 text-right font-bold text-emerald-600">{formatCurrency(c.saldo || 0)}</td>
                      <td className="p-4">
                        <span className={getPlanVariant(c.plan)} style={{fontSize: '0.75rem', fontWeight: 500}}>
                          {c.plan}
                        </span>
                      </td>
                    </tr>
                  )})}

                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid gap-3 stagger-children">
              {clientes.map((c) => (
                <Card key={c.id} className="!p-0 overflow-hidden cursor-pointer hover:shadow-md transition-all group">
                  <div className="flex items-center gap-4 px-5 py-4" onClick={() => openClientProfile(c.telefono)}>
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--table-header)] text-white font-bold text-sm shadow-lg">
                      {(c.nombre?.[0] ?? '?').toUpperCase()}{(c.apellido?.[0] ?? '').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{c.nombre} {c.apellido}</p>
                      <p className="text-xs text-gray-500 mt-0.5">📱 {c.telefono} · ✉️ {c.correo || '—'}</p>
                    </div>
                    <span className={getPlanVariant(c.plan)} style={{fontSize: '0.75rem', fontWeight: 500}}>
                          {c.plan}
                        </span>
                    <Badge label={c.activo ? 'Activo' : 'Inactivo'} variant={c.activo ? 'success' : 'error'} />
                    <ChevronRightIcon className="h-5 w-5 text-gray-300 group-hover:text-indigo-500 transition-colors shrink-0" />
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeftIcon className="h-4 w-4" /> Anterior
              </Button>
              <span className="text-sm text-gray-600">
                Página {page} de {totalPages}
              </span>
              <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Siguiente <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
