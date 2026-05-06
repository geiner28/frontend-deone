'use client';

import type { FacturaEnriquecida } from '@/types';
import { formatCurrency } from '@/lib/utils';
import {
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface TableViewProps {
  facturas: FacturaEnriquecida[];
  total: number;
  currentPage: number;
  totalPages: number;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedUser: string;
  onUserChange: (userId: string) => void;
  users: FacturaEnriquecida[];
  selectedPlan: string;
  onPlanChange: (plan: string) => void;
  plans: string[];
  selectedMes: string;
  onMesChange: (mes: string) => void;
  mesesOptions: { value: string; label: string }[];
  sortProximos: boolean;
  onToggleSort: () => void;
  onPageChange: (page: number) => void;
  selectedFactura: FacturaEnriquecida | null;
  onSelectFactura: (factura: FacturaEnriquecida) => void;
  onEstadoChange: (factura: FacturaEnriquecida, estado: 'pagada' | 'pendiente' | 'sin_factura' | 'aproximada') => void;
  onGrupoChange: (factura: FacturaEnriquecida, grupo: 1 | 2) => void;
  onDelete: (factura: FacturaEnriquecida) => void;
  onEditar: () => void;
  updatingFacturaId: string | null;
}

export default function TableView({
  facturas,
  total,
  currentPage,
  totalPages,
  searchTerm,
  onSearchChange,
  selectedUser,
  onUserChange,
  users,
  selectedPlan,
  onPlanChange,
  plans,
  selectedMes,
  onMesChange,
  mesesOptions,
  sortProximos,
  onToggleSort,
  onPageChange,
  selectedFactura,
  onSelectFactura,
  onEstadoChange,
  onGrupoChange,
  onDelete,
  onEditar,
  updatingFacturaId,
}: TableViewProps) {
  // Si hay un usuario seleccionado, deshabilitar filtro de plan
  const planDisabled = selectedUser !== 'todos';

  const isOverdue = (fecha?: string) => {
    if (!fecha) return false;
    const vencimiento = new Date(fecha);
    const hoy = new Date();
    return vencimiento < hoy;
  };

  const isExpiringSoon = (fecha?: string) => {
    if (!fecha) return false;
    const vencimiento = new Date(fecha);
    const hoy = new Date();
    const diasFaltantes = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    return diasFaltantes <= 7 && diasFaltantes > 0;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'pagada':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'pendiente':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'aproximada':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'sin_factura':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      default:
        return 'bg-amber-100 text-amber-800 border-amber-300';
    }
  };

  // Color para validacion_estado (columna separada del estado de pago)
  const getValidacionColor = (validacion: string) => {
    switch (validacion) {
      case 'validada':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'rechazada':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'extraida':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'sin_validar':
      default:
        return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  const startIndex = (currentPage - 1) * 50;
  const endIndex = startIndex + 50;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-gray-100 rounded-lg p-3">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <button
            onClick={onToggleSort}
            className="px-4 py-2 bg-white border border-orange-500 text-orange-500 rounded-lg text-sm font-medium hover:bg-orange-50 flex items-center gap-2"
          >
            {sortProximos ? 'Próximos a vencer' : 'Más lejanos'}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            </svg>
          </button>

          <select
            value={selectedMes}
            onChange={(e) => onMesChange(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {mesesOptions.map((m) => (
              <option key={m.value} value={m.value}>
                Mes: {m.label}
              </option>
            ))}
          </select>

          <select
            value={selectedUser}
            onChange={(e) => {
              onUserChange(e.target.value);
              // Reset plan si se selecciona un usuario
              if (e.target.value !== 'todos') onPlanChange('todos');
            }}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="todos">User: Todos</option>
            {users.map((user) => (
              <option key={user.usuario_id} value={user.usuario_id}>
                User: {user.usuario?.nombre}
              </option>
            ))}
          </select>

          <select
            value={selectedPlan}
            onChange={(e) => onPlanChange(e.target.value)}
            disabled={planDisabled}
            title={planDisabled ? 'Quita el filtro de Usuario para filtrar por plan' : ''}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="todos">Plan: Todos</option>
            <option value="tranquilidad">Plan: Tranquilidad</option>
            <option value="respaldo">Plan: Respaldo</option>
          </select>

          <div className="relative ml-auto w-[300px] flex-shrink-0">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o etiqueta..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 pl-10"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {facturas.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No hay facturas que coincidan con los filtros
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-900 text-white">
                    <th className="px-4 py-3 text-left font-medium">
                      <span className="flex items-center gap-1">Etiqueta <span className="text-xs">↕</span></span>
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      <span className="flex items-center gap-1">Número de ref <span className="text-xs">↕</span></span>
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      <span className="flex items-center gap-1">Tipo de ref <span className="text-xs">↕</span></span>
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      <span className="flex items-center gap-1">Portal <span className="text-xs">↕</span></span>
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      <span className="flex items-center gap-1">F. emisión <span className="text-xs">↕</span></span>
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      <span className="flex items-center gap-1">F. vencimiento <span className="text-xs">↕</span></span>
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      <span className="flex items-center gap-1">Usuario <span className="text-xs">↕</span></span>
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      <span className="flex items-center gap-1">Monto <span className="text-xs">↕</span></span>
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      <span className="flex items-center gap-1">Grupo <span className="text-xs">↕</span></span>
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      <span className="flex items-center gap-1">Estado pago <span className="text-xs">↕</span></span>
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      <span className="flex items-center gap-1">Validación <span className="text-xs">↕</span></span>
                    </th>
                    <th className="px-4 py-3 text-left font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {facturas.map((factura, idx) => (
                    <tr key={factura.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="px-4 py-4 text-gray-900 font-medium">
                        @{factura.etiqueta || factura.servicio}
                      </td>
                      <td className="px-4 py-4 text-gray-600 font-mono text-xs">
                        {factura.referencia_pago || '-'}
                      </td>
                      <td className="px-4 py-4 text-gray-600 text-xs">
                        {factura.tipo_referencia || '-'}
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const portal = factura.pagina_pago || factura.archivo_url;
                          return portal ? (
                          <a
                            href={portal}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                          >
                            Link
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M11 3a1 1 0 100 2h3.586L9.293 9.293a1 1 0 001.414 1.414L16 6.414V10a1 1 0 102 0V4a1 1 0 00-1-1h-6z" />
                            </svg>
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        );
                        })()}
                      </td>
                      <td className={`px-4 py-3 ${isExpiringSoon(factura.fecha_emision) ? 'text-orange-600 font-medium' : 'text-gray-600'}`}>
                        {formatDate(factura.fecha_emision)}
                      </td>
                      <td className={`px-4 py-3 font-medium ${isOverdue(factura.fecha_vencimiento) ? 'text-orange-600' : isExpiringSoon(factura.fecha_vencimiento) ? 'text-orange-600' : 'text-gray-600'}`}>
                        {formatDate(factura.fecha_vencimiento)}
                      </td>
                      <td className="px-4 py-3 text-gray-900">
                        {factura.usuario_nombre}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{formatCurrency(factura.monto)}</span>
                          {factura.estado === 'aproximada' && (
                            <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={String(factura.grupo || 1)}
                          disabled={updatingFacturaId === factura.id}
                          onChange={(e) => {
                            const next = Number(e.target.value);
                            if (next === 1 || next === 2) onGrupoChange(factura, next as 1 | 2);
                          }}
                          className="h-9 min-w-[86px] rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-700 disabled:opacity-60"
                        >
                          <option value="1">Grupo 1</option>
                          <option value="2">Grupo 2</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={String(factura.estado || 'pendiente')}
                          disabled={updatingFacturaId === factura.id}
                          onChange={(e) => {
                            const next = e.target.value as 'pagada' | 'pendiente' | 'sin_factura' | 'aproximada';
                            onEstadoChange(factura, next);
                          }}
                          className={`h-9 min-w-[132px] rounded-full border px-3 text-sm font-medium bg-white ${getStatusColor(String(factura.estado || 'pendiente'))} disabled:opacity-60`}
                        >
                          <option value="pagada">Pagada</option>
                          <option value="pendiente">Pendiente</option>
                          <option value="sin_factura">Sin factura</option>
                          <option value="aproximada">Aproximada</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getValidacionColor(String(factura.validacion_estado || 'sin_validar'))}`}>
                          {String(factura.validacion_estado || 'sin_validar').replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { onSelectFactura(factura); onEditar(); }}
                            disabled={updatingFacturaId === factura.id}
                            title="Editar"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-gray-800 disabled:opacity-50"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onDelete(factura)}
                            disabled={updatingFacturaId === factura.id}
                            title="Eliminar"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-white border-t border-gray-200 px-4 py-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Mostrando {startIndex + 1}-{Math.min(endIndex, total)} de {total} registros
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Anterior
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    if (pageNum > totalPages) return null;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => onPageChange(pageNum)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium ${
                          pageNum === currentPage
                            ? 'bg-orange-500 text-white'
                            : 'border border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  {totalPages > 5 && <span className="px-2">...</span>}
                </div>

                <button
                  onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
