'use client';

import { useMemo, useState, useRef } from 'react';
import type { FacturaEnriquecida } from '@/types';
import { formatCurrency } from '@/lib/utils';

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
  onPageChange: (page: number) => void;
  selectedFactura: FacturaEnriquecida | null;
  onSelectFactura: (factura: FacturaEnriquecida) => void;
  onValidar: () => void;
  onRechazar: () => void;
  onPagar: () => void;
  onAproximar: () => void;
  actionLoading: boolean;
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
  onPageChange,
  selectedFactura,
  onSelectFactura,
  onValidar,
  onRechazar,
  onPagar,
  onAproximar,
  actionLoading,
}: TableViewProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar menú cuando el mouse sale del área
  // (sin listener global que interfiera con eventos)
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
      case 'validada':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'rechazada':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    }
  };

  const startIndex = (currentPage - 1) * 50;
  const endIndex = startIndex + 50;

  // Función para determinar si una factura tiene acciones disponibles
  const hasAvailableActions = (factura: FacturaEnriquecida): boolean => {
    return factura.estado === 'extraida' || factura.estado === 'validada' || factura.estado === 'pendiente';
  };

  // Función para obtener las acciones disponibles para una factura
  const getAvailableActionCount = (factura: FacturaEnriquecida): number => {
    if (factura.estado === 'extraida') {
      let count = 2; // Validar + Rechazar
      if (factura.origen === 'auto') count++; // Aproximar
      return count;
    }
    if (factura.estado === 'validada' || factura.estado === 'pendiente') return 1; // Pagar
    return 0;
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-gray-100 rounded-lg p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <button className="px-4 py-2 bg-white border border-orange-500 text-orange-500 rounded-lg text-sm font-medium hover:bg-orange-50 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Próximas a vencer
          </button>

          <select
            value={selectedUser}
            onChange={(e) => onUserChange(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="todos">Todos</option>
            {users.map((user) => (
              <option key={user.usuario_id} value={user.usuario_id}>
                {user.usuario?.nombre}
              </option>
            ))}
          </select>

          <select 
            value={selectedPlan}
            onChange={(e) => onPlanChange(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="todos">Plan: Todos</option>
            {plans.map((plan) => (
              <option key={plan} value={plan}>
                Plan: {plan.charAt(0).toUpperCase() + plan.slice(1)}
              </option>
            ))}
          </select>

          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Buscar por nombre, celular..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 pl-10"
            />
            <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
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
                      <input type="checkbox" className="rounded" />
                    </th>
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        Etiqueta <span className="text-xs">↕</span>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        Tipo de ref <span className="text-xs">↕</span>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        Número de ref <span className="text-xs">↕</span>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        Portal <span className="text-xs">↕</span>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        F. de emisión <span className="text-xs">↕</span>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        F. de vencimiento <span className="text-xs">↕</span>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        Usuario <span className="text-xs">↕</span>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        Monto <span className="text-xs">↕</span>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        Estado <span className="text-xs">↕</span>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {facturas.map((factura, idx) => (
                    <tr key={factura.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3">
                        <input type="checkbox" className="rounded" />
                      </td>
                      <td className="px-4 py-3 text-gray-900 font-medium">
                        @{factura.etiqueta || factura.servicio}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {factura.obligacion?.tipo_referencia || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                        {factura.referencia_pago || '-'}
                      </td>
                      <td className="px-4 py-3">
                        {factura.archivo_url ? (
                          <a
                            href={factura.archivo_url}
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
                        )}
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
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(factura.estado)}`}>
                          {factura.estado.charAt(0).toUpperCase() + factura.estado.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {hasAvailableActions(factura) ? (
                          <div className="relative" ref={menuRef}>
                            {/* Botón trigger */}
                            <button
                              onClick={() => {
                                setOpenMenuId(openMenuId === factura.id ? null : factura.id);
                                onSelectFactura(factura);
                              }}
                              className="px-3 py-2 hover:bg-gray-200 text-gray-700 hover:text-gray-900 rounded-lg transition-all duration-200 border border-gray-300 hover:border-gray-400 flex items-center justify-center gap-1.5 shadow-sm font-medium text-sm"
                              title={`${getAvailableActionCount(factura)} acción(es) disponible(s)`}
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10.5 1.5H9.5V3.5H10.5V1.5ZM10.5 8.5H9.5V10.5H10.5V8.5ZM10.5 15.5H9.5V17.5H10.5V15.5Z" />
                              </svg>
                              <span className="bg-gray-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                                {getAvailableActionCount(factura)}
                              </span>
                            </button>

                            {/* Dropdown Menu */}
                            {openMenuId === factura.id && (
                              <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-max">
                                <div className="py-1">
                                  {factura.estado === 'extraida' && (
                                    <>
                                      <button
                                        onClick={() => {
                                          console.log('Validar clicked', factura);
                                          onSelectFactura(factura);
                                          onValidar();
                                          setOpenMenuId(null);
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 flex items-center gap-2 transition-colors cursor-pointer"
                                      >
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        Validar
                                      </button>

                                      {factura.origen === 'auto' && (
                                        <button
                                          onClick={() => {
                                            console.log('Aproximar clicked', factura);
                                            onSelectFactura(factura);
                                            onAproximar();
                                            setOpenMenuId(null);
                                          }}
                                          className="w-full text-left px-4 py-2 text-sm text-purple-600 hover:bg-purple-50 flex items-center gap-2 transition-colors cursor-pointer"
                                        >
                                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                                          </svg>
                                          Aproximar
                                        </button>
                                      )}

                                      <button
                                        onClick={() => {
                                          console.log('Rechazar clicked', factura);
                                          onSelectFactura(factura);
                                          onRechazar();
                                          setOpenMenuId(null);
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer"
                                      >
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                        Rechazar
                                      </button>
                                    </>
                                  )}

                                  {(factura.estado === 'validada' || factura.estado === 'pendiente') && (
                                    <button
                                      onClick={() => {
                                        console.log('Pagar clicked', factura);
                                        onSelectFactura(factura);
                                        onPagar();
                                        setOpenMenuId(null);
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2 transition-colors cursor-pointer"
                                    >
                                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a1 1 0 100-2 1 1 0 000 2z" />
                                      </svg>
                                      Pagar
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="px-3 py-2 text-gray-400 text-xs italic">
                            Sin acciones
                          </div>
                        )}
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
