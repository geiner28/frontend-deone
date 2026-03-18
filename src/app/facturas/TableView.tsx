'use client';

import { useMemo } from 'react';
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
  onPageChange: (page: number) => void;
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
  onPageChange,
}: TableViewProps) {
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
            <option value="todos">User: Todos</option>
            {users.map((user) => (
              <option key={user.usuario_id} value={user.usuario_id}>
                User: {user.usuario?.nombre}
              </option>
            ))}
          </select>

          <select className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
            <option>Plan: Todos</option>
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
                    <th className="px-4 py-3 text-left font-medium flex items-center gap-1">
                      Etiqueta <span className="text-xs">↕</span>
                    </th>
                    <th className="px-4 py-3 text-left font-medium flex items-center gap-1">
                      Tipo de ref <span className="text-xs">↕</span>
                    </th>
                    <th className="px-4 py-3 text-left font-medium flex items-center gap-1">
                      Número de ref <span className="text-xs">↕</span>
                    </th>
                    <th className="px-4 py-3 text-left font-medium flex items-center gap-1">
                      Portal <span className="text-xs">↕</span>
                    </th>
                    <th className="px-4 py-3 text-left font-medium flex items-center gap-1">
                      F. de emisión <span className="text-xs">↕</span>
                    </th>
                    <th className="px-4 py-3 text-left font-medium flex items-center gap-1">
                      F. de vencimiento <span className="text-xs">↕</span>
                    </th>
                    <th className="px-4 py-3 text-left font-medium flex items-center gap-1">
                      Usuario <span className="text-xs">↕</span>
                    </th>
                    <th className="px-4 py-3 text-left font-medium flex items-center gap-1">
                      Monto <span className="text-xs">↕</span>
                    </th>
                    <th className="px-4 py-3 text-left font-medium flex items-center gap-1">
                      Estado <span className="text-xs">↕</span>
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
                        {factura.obligacion?.tipo_referencia || 'N. de contrato'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                        {factura.obligacion?.numero_referencia || factura.referencia_pago || '-'}
                      </td>
                      <td className="px-4 py-3">
                        {factura.obligacion?.pagina_pago ? (
                          <a
                            href={factura.obligacion.pagina_pago}
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
                        <button className="text-gray-400 hover:text-gray-600">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
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
