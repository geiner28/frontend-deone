import { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import Button from '@/components/ui/Button';
import type { Factura } from '@/types';
import type { ToastType } from '@/components/ui/Toast';
import { formatDateTime } from '@/lib/utils';

interface UserAccionesCardProps {
  usuario: {
    nombre: string;
    apellido: string;
    telefono: string;
  };
  recargasUsuario: any[];
  facturasUsuario: any[];
  facturasHeredadasUsuario: any[];
  onOpenValidarFactura: (factura: Factura) => void;
  onOpenRechazarFactura: (factura: Factura) => void;
  onOpenAproximarValor: (factura: Factura) => void;
  onOpenAprobarRecarga: (usuarioTelefono: string, recargaId?: string) => void;
  onShowToast: (msg: string, type: ToastType) => void;
}

interface AccionGroupProps {
  icon: string;
  title: string;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function AccionGroup({ icon, title, count, children, defaultOpen = true }: AccionGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-lg bg-gray-50 overflow-hidden">
      {/* Header del subgrupo */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <div className="text-left">
            <p className="font-semibold text-[#1d212b] text-sm">{title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
            {count}
          </span>
          <ChevronDownIcon
            className={`h-4 w-4 text-gray-600 transition-transform duration-300 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Contenido */}
      {isOpen && (
        <div className="px-4 py-3 space-y-3 border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  );
}

export default function UserAccionesCard({
  usuario,
  recargasUsuario,
  facturasUsuario,
  facturasHeredadasUsuario,
  onOpenValidarFactura,
  onOpenRechazarFactura,
  onOpenAproximarValor,
  onOpenAprobarRecarga,
  onShowToast,
}: UserAccionesCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const totalAcciones = recargasUsuario.length + facturasUsuario.length + facturasHeredadasUsuario.length;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-all">
      {/* Header del usuario - ACORDEÓN PRINCIPAL */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-25 border-b border-blue-100 flex items-center justify-between hover:bg-blue-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">👤</span>
          <div className="text-left">
            <p className="font-bold text-[#1d212b]">
              {usuario.nombre} {usuario.apellido}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">📞 {usuario.telefono}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-sm">
            <p className="font-semibold text-blue-900">{totalAcciones} acción{totalAcciones !== 1 ? 'es' : ''}</p>
          </div>
          <ChevronDownIcon
            className={`h-5 w-5 text-gray-600 transition-transform duration-300 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Contenido colapsable - SUBGRUPOS POR TIPO */}
      {isOpen && (
        <div className="px-6 py-4 space-y-3">
          {/* RECARGAS */}
          {recargasUsuario.length > 0 && (
            <AccionGroup icon="📱" title="Recargas Reportadas" count={recargasUsuario.length} defaultOpen={true}>
              <div className="space-y-2">
                {recargasUsuario.map((accion: any) => (
                  <div key={accion.id} className="flex items-center justify-between gap-3 p-3 bg-white rounded border border-gray-200 hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#1d212b]">+${accion.monto}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{formatDateTime(accion.creado_en)}</p>
                      {accion.comprobante_url && (
                        <p className="text-xs mt-1">
                          <a
                            href={accion.comprobante_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            📎 Ver comprobante
                          </a>
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        onOpenAprobarRecarga(usuario.telefono, accion.recarga_id);
                      }}
                      title="Aprobar o rechazar recarga"
                      className="whitespace-nowrap"
                    >
                      Revisar
                    </Button>
                  </div>
                ))}
              </div>
            </AccionGroup>
          )}

          {/* FACTURAS */}
          {facturasUsuario.length > 0 && (
            <AccionGroup icon="📄" title="Facturas en Revisión" count={facturasUsuario.length} defaultOpen={true}>
              <div className="space-y-2">
                {facturasUsuario.map((accion: any) => (
                  <div key={accion.id} className="flex items-center justify-between gap-2 p-3 bg-white rounded border border-gray-200 hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#1d212b] text-sm">{accion.servicio}</p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Período: {accion.periodo} | ${accion.monto}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{formatDateTime(accion.creado_en)}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          if (accion.factura_id) {
                            const facturaPartial: Factura = {
                              id: accion.factura_id,
                              usuario_id: accion.usuario_id,
                              obligacion_id: '',
                              monto: accion.monto || 0,
                              servicio: accion.servicio || '',
                              periodo: accion.periodo || '',
                              estado: accion.factura_estado || 'pendiente',
                              referencia_pago: undefined,
                              etiqueta: undefined,
                              fecha_emision: undefined,
                              fecha_vencimiento: undefined,
                              origen: 'admin_panel',
                              extraccion_estado: 'manual',
                              archivo_url: undefined,
                              creado_en: new Date().toISOString(),
                              actualizado_en: new Date().toISOString(),
                            } as Factura;
                            onOpenValidarFactura(facturaPartial);
                          } else {
                            onShowToast('No se puede identificar la factura', 'error');
                          }
                        }}
                        title="Validar factura"
                        className="px-2"
                      >
                        ✓
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          if (accion.factura_id) {
                            const facturaPartial: Factura = {
                              id: accion.factura_id,
                              usuario_id: accion.usuario_id,
                              obligacion_id: '',
                              monto: accion.monto || 0,
                              servicio: accion.servicio || '',
                              periodo: accion.periodo || '',
                              estado: accion.factura_estado || 'pendiente',
                              referencia_pago: undefined,
                              etiqueta: undefined,
                              fecha_emision: undefined,
                              fecha_vencimiento: undefined,
                              origen: 'admin_panel',
                              extraccion_estado: 'manual',
                              archivo_url: undefined,
                              creado_en: new Date().toISOString(),
                              actualizado_en: new Date().toISOString(),
                            } as Factura;
                            onOpenRechazarFactura(facturaPartial);
                          } else {
                            onShowToast('No se puede identificar la factura', 'error');
                          }
                        }}
                        title="Rechazar factura"
                        className="px-2"
                      >
                        ✗
                      </Button>
                      {accion.extraccion_estado && ['dudosa', 'fallida'].includes(accion.extraccion_estado) && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            if (accion.factura_id) {
                              const facturaPartial: Factura = {
                                id: accion.factura_id,
                                usuario_id: accion.usuario_id,
                                obligacion_id: '',
                                monto: accion.monto || 0,
                                servicio: accion.servicio || '',
                                periodo: accion.periodo || '',
                                estado: accion.factura_estado || 'pendiente',
                                referencia_pago: undefined,
                                etiqueta: undefined,
                                fecha_emision: undefined,
                                fecha_vencimiento: undefined,
                                origen: 'admin_panel',
                                extraccion_estado: 'manual',
                                archivo_url: undefined,
                                creado_en: new Date().toISOString(),
                                actualizado_en: new Date().toISOString(),
                              } as Factura;
                              onOpenAproximarValor(facturaPartial);
                            } else {
                              onShowToast('No se puede identificar la factura', 'error');
                            }
                          }}
                          title="Aproximar valor"
                          className="px-2"
                        >
                          ↻
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </AccionGroup>
          )}

          {/* FACTURAS HEREDADAS */}
          {facturasHeredadasUsuario.length > 0 && (
            <AccionGroup icon="🏛️" title="Facturas Heredadas" count={facturasHeredadasUsuario.length} defaultOpen={false}>
              <div className="space-y-2">
                {facturasHeredadasUsuario.map((accion: any) => (
                  <div key={accion.id} className="flex items-center justify-between gap-2 p-3 bg-white rounded border border-gray-200 hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#1d212b] text-sm">{accion.servicio}</p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Período: {accion.periodo} | ${accion.monto}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{formatDateTime(accion.creado_en)}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          if (accion.factura_id) {
                            const facturaPartial: Factura = {
                              id: accion.factura_id,
                              usuario_id: accion.usuario_id,
                              obligacion_id: '',
                              monto: accion.monto || 0,
                              servicio: accion.servicio || '',
                              periodo: accion.periodo || '',
                              estado: accion.factura_estado || 'pendiente',
                              referencia_pago: undefined,
                              etiqueta: undefined,
                              fecha_emision: undefined,
                              fecha_vencimiento: undefined,
                              origen: 'admin_panel',
                              extraccion_estado: 'manual',
                              archivo_url: undefined,
                              creado_en: new Date().toISOString(),
                              actualizado_en: new Date().toISOString(),
                            } as Factura;
                            onOpenValidarFactura(facturaPartial);
                          } else {
                            onShowToast('No se puede identificar la factura', 'error');
                          }
                        }}
                        title="Validar factura"
                        className="px-2"
                      >
                        ✓
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          if (accion.factura_id) {
                            const facturaPartial: Factura = {
                              id: accion.factura_id,
                              usuario_id: accion.usuario_id,
                              obligacion_id: '',
                              monto: accion.monto || 0,
                              servicio: accion.servicio || '',
                              periodo: accion.periodo || '',
                              estado: accion.factura_estado || 'pendiente',
                              referencia_pago: undefined,
                              etiqueta: undefined,
                              fecha_emision: undefined,
                              fecha_vencimiento: undefined,
                              origen: 'admin_panel',
                              extraccion_estado: 'manual',
                              archivo_url: undefined,
                              creado_en: new Date().toISOString(),
                              actualizado_en: new Date().toISOString(),
                            } as Factura;
                            onOpenRechazarFactura(facturaPartial);
                          } else {
                            onShowToast('No se puede identificar la factura', 'error');
                          }
                        }}
                        title="Rechazar factura"
                        className="px-2"
                      >
                        ✗
                      </Button>
                      {accion.extraccion_estado && ['dudosa', 'fallida'].includes(accion.extraccion_estado) && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            if (accion.factura_id) {
                              const facturaPartial: Factura = {
                                id: accion.factura_id,
                                usuario_id: accion.usuario_id,
                                obligacion_id: '',
                                monto: accion.monto || 0,
                                servicio: accion.servicio || '',
                                periodo: accion.periodo || '',
                                estado: accion.factura_estado || 'pendiente',
                                referencia_pago: undefined,
                                etiqueta: undefined,
                                fecha_emision: undefined,
                                fecha_vencimiento: undefined,
                                origen: 'admin_panel',
                                extraccion_estado: 'manual',
                                archivo_url: undefined,
                                creado_en: new Date().toISOString(),
                                actualizado_en: new Date().toISOString(),
                              } as Factura;
                              onOpenAproximarValor(facturaPartial);
                            } else {
                              onShowToast('No se puede identificar la factura', 'error');
                            }
                          }}
                          title="Aproximar valor"
                          className="px-2"
                        >
                          ↻
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </AccionGroup>
          )}
        </div>
      )}
    </div>
  );
}
