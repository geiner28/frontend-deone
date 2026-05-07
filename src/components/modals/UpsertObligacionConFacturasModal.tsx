'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ChevronDownIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/solid';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Toast, { ToastType } from '@/components/ui/Toast';
import UserCombobox from '@/components/ui/UserCombobox';
import {
  createObligacion,
  capturaFactura,
  getAdminClientes,
  getEtiquetasDistinct,
} from '@/lib/api';
import type { Obligacion } from '@/types';
import { getErrorMsg } from '@/lib/utils';

interface UsuarioOpt {
  telefono: string;
  nombre: string;
  apellido: string;
}

interface UpsertObligacionConFacturasModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (obligacion: Obligacion) => void;
  mode?: 'create' | 'from-profile';
  initialTelefono?: string;
  usuarioNombre?: string;
  cantidadRecargas?: number | null;
  /**
   * Periodo en formato 'YYYY-MM' — cuando se crea desde la sección de un mes
   * específico del usuario, se pre-llenan las fechas con ese mes y no se pide
   * el periodo manualmente.
   */
  initialPeriodo?: string;
}

export default function UpsertObligacionConFacturasModal({
  open,
  onClose,
  onSuccess,
  mode = 'create',
  initialTelefono,
  usuarioNombre,
  cantidadRecargas,
  initialPeriodo,
}: UpsertObligacionConFacturasModalProps) {
  const puedeUsarGrupo2 = Number(cantidadRecargas) === 2;
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [loading, setLoading] = useState(false);

  // Section open/closed
  const [sec1Open, setSec1Open] = useState(true);
  const [sec2Open, setSec2Open] = useState(true);
  const [sec3Open, setSec3Open] = useState(true);

  // Form fields
  const [telefono, setTelefono] = useState('');
  const [etiqueta, setEtiqueta] = useState('');
  const [receptor, setReceptor] = useState('');
  const [tipoReferencia, setTipoReferencia] = useState('');
  const [numeroReferencia, setNumeroReferencia] = useState('');
  const [portalPago, setPortalPago] = useState('');
  const [grupo, setGrupo] = useState<'' | '1' | '2'>('');
  const [fechaEmision, setFechaEmision] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [monto, setMonto] = useState('');

  // Catalogs
  const [usuarios, setUsuarios] = useState<UsuarioOpt[]>([]);
  const [etiquetas, setEtiquetas] = useState<string[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const showToast = (message: string, type: ToastType) => setToast({ message, type });

  // Reset on open
  useEffect(() => {
    if (open) {
      setTelefono(mode === 'from-profile' ? (initialTelefono || '') : '');
      setEtiqueta('');
      setReceptor('');
      setTipoReferencia('');
      setNumeroReferencia('');
      setPortalPago('');
      setGrupo('');
      // Si viene initialPeriodo (YYYY-MM), pre-poblar fechas con primer día / fin de ese mes
      if (initialPeriodo && /^\d{4}-\d{2}$/.test(initialPeriodo)) {
        const [yStr, mStr] = initialPeriodo.split('-');
        const y = parseInt(yStr, 10);
        const m = parseInt(mStr, 10);
        const first = `${yStr}-${mStr}-01`;
        // Último día del mes
        const last = new Date(y, m, 0);
        const lastStr = `${y}-${String(m).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
        setFechaEmision(first);
        setFechaVencimiento(lastStr);
      } else {
        setFechaEmision('');
        setFechaVencimiento('');
      }
      setMonto('');
      setSec1Open(true);
      setSec2Open(true);
      setSec3Open(true);
      setToast(null);
    }
  }, [open, mode, initialTelefono, initialPeriodo]);

  // Load catalogs
  useEffect(() => {
    if (!open) return;
    if (mode === 'create') {
      const loadUsers = async () => {
        setLoadingUsers(true);
        try {
          const res = await getAdminClientes({ page: 1, limit: 100 });
          if (res.ok && res.data) {
            setUsuarios(
              (res.data.clientes || []).map((u) => ({
                telefono: u.telefono,
                nombre: u.nombre || '',
                apellido: u.apellido || '',
              }))
            );
          } else {
            setUsuarios([]);
          }
        } catch {
          setUsuarios([]);
          showToast('No se pudo cargar la lista de usuarios', 'error');
        } finally {
          setLoadingUsers(false);
        }
      };
      loadUsers();
    }
    getEtiquetasDistinct().then((res) => {
      if (res.ok && res.data) setEtiquetas(res.data.etiquetas || []);
    });
  }, [open, mode]);

  // Validations per section
  const sec1Filled = useMemo(() => {
    return mode === 'from-profile' ? Boolean(initialTelefono) : Boolean(telefono);
  }, [mode, initialTelefono, telefono]);

  const sec2Filled = useMemo(() => {
    // "Datos de la obligación": entidad + número de referencia.
    // tipoReferencia es opcional.
    return Boolean(receptor.trim() && numeroReferencia.trim());
  }, [receptor, numeroReferencia]);

  const sec3Filled = useMemo(() => {
    // "Datos de la factura": fechas + monto
    return Boolean(
      fechaEmision && fechaVencimiento && monto && Number(monto) > 0
    );
  }, [fechaEmision, fechaVencimiento, monto]);

  const canSubmit = sec1Filled && sec2Filled && sec3Filled;

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      showToast('Por favor completa todos los campos requeridos', 'error');
      return;
    }
    setLoading(true);

    const tel = mode === 'from-profile' ? (initialTelefono || telefono) : telefono;
    const periodo = fechaEmision || new Date().toISOString().split('T')[0];

    const obRes = await createObligacion({
      telefono: tel,
      descripcion: etiqueta,
      periodo,
      servicio: etiqueta,
      tipo_referencia: tipoReferencia || undefined,
      numero_referencia: numeroReferencia || undefined,
      pagina_pago: portalPago || undefined,
      receptor: receptor || undefined,
      grupo: grupo ? ((puedeUsarGrupo2 ? Number(grupo) : 1) as 1 | 2) : undefined,
    });

    if (!obRes.ok || !obRes.data) {
      setLoading(false);
      const err = getErrorMsg(obRes, 'Error al crear obligación');
      showToast(err, 'error');
      return;
    }

    const obligacion = obRes.data as unknown as Obligacion;
    const obligacionId = obligacion.id;

    const facRes = await capturaFactura({
      telefono: tel,
      obligacion_id: obligacionId,
      servicio: etiqueta,
      monto: Number(monto),
      periodo,
      etiqueta,
      tipo_referencia: tipoReferencia || undefined,
      referencia_pago: numeroReferencia || undefined,
      fecha_emision: fechaEmision,
      fecha_vencimiento: fechaVencimiento,
      origen: 'admin',
    });

    setLoading(false);

    if (facRes.ok) {
      showToast('Obligación y factura creadas correctamente', 'success');
      onSuccess?.(obligacion);
      setTimeout(() => handleClose(), 700);
    } else {
      showToast(getErrorMsg(facRes, 'Error al crear factura'), 'error');
    }
  };

  const SectionHeader = ({
    title,
    open: o,
    filled,
    onToggle,
  }: {
    title: string;
    open: boolean;
    filled: boolean;
    onToggle: () => void;
  }) => (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between gap-2 text-left"
    >
      <div className="flex items-center gap-2">
        <h4 className="text-base font-bold text-[#1d212b]">{title}</h4>
        {filled ? (
          <CheckCircleIcon className="h-5 w-5 text-[#ff8d2d]" />
        ) : (
          <ExclamationCircleIcon className="h-5 w-5 text-[#ff8d2d]" />
        )}
      </div>
      <ChevronDownIcon
        className={`h-4 w-4 text-[#737780] transition-transform ${o ? '' : '-rotate-90'}`}
      />
    </button>
  );

  const inputCls =
    'w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm text-[#1d212b] placeholder-[#737780] focus:outline-none focus:ring-2 focus:ring-[#ff8d2d]/50 focus:border-[#ff8d2d]';

  const labelReq = (txt: string) => (
    <label className="text-sm font-medium text-[#1d212b]">
      {txt} <span className="text-[#ef4444]">*</span>
    </label>
  );

  const labelOpt = (txt: string) => (
    <label className="text-sm font-medium text-[#1d212b]">{txt}</label>
  );

  return (
    <>
      {toast && (
        <div className="fixed top-4 right-4 z-[9999] animate-fade-in">
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}

      <Modal open={open} onClose={handleClose} title="Agregar obligación" maxWidth="md">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Sección 1 - Usuario (solo visible cuando se crea desde el dashboard).
              En modo from-profile, el usuario ya está en contexto y se envía por detrás. */}
          {mode === 'create' && (
            <div className="border-b border-[#e5e7eb] pb-4">
              <SectionHeader
                title="Usuario"
                open={sec1Open}
                filled={sec1Filled}
                onToggle={() => setSec1Open((v) => !v)}
              />
              {sec1Open && (
                <div className="mt-4">
                  <div className="flex flex-col gap-1">
                    {labelReq('Usuario')}
                    <UserCombobox
                      options={usuarios}
                      value={telefono}
                      onChange={setTelefono}
                      loading={loadingUsers}
                      placeholder="Buscar por nombre o celular…"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sección - Datos de la obligación */}
          <div className="border-b border-[#e5e7eb] pb-4">
            <SectionHeader
              title="Datos de la obligación"
              open={sec2Open}
              filled={sec2Filled}
              onToggle={() => setSec2Open((v) => !v)}
            />
            {sec2Open && (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    {labelReq('Etiqueta')}
                    <input
                      value={etiqueta}
                      onChange={(e) => setEtiqueta(e.target.value)}
                      placeholder="Ej: Factura Marzo"
                      className={inputCls}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    {labelReq('Entidad')}
                    <input
                      value={receptor}
                      onChange={(e) => setReceptor(e.target.value)}
                      placeholder="Placeholder"
                      className={inputCls}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    {labelOpt('Tipo de referencia')}
                    <select
                      value={tipoReferencia}
                      onChange={(e) => setTipoReferencia(e.target.value)}
                      className={inputCls}
                    >
                      <option value="">Seleccione</option>
                      <option value="numero_cuenta">Número de cuenta</option>
                      <option value="cedula">Cédula</option>
                      <option value="codigo_barras">Código de barras</option>
                      <option value="referencia">Referencia</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    {labelReq('Número de referencia')}
                    <input
                      value={numeroReferencia}
                      onChange={(e) => setNumeroReferencia(e.target.value)}
                      placeholder="Placeholder"
                      className={inputCls}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    {labelOpt('Portal de pago')}
                    <input
                      value={portalPago}
                      onChange={(e) => setPortalPago(e.target.value)}
                      placeholder="Seleccione"
                      className={inputCls}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    {labelOpt('Grupo')}
                    <select
                      value={grupo}
                      onChange={(e) => setGrupo(e.target.value as '' | '1' | '2')}
                      className={`${inputCls} disabled:bg-gray-100 disabled:text-gray-500`}
                      disabled={mode === 'from-profile' && !puedeUsarGrupo2}
                    >
                      <option value="">Seleccione</option>
                      <option value="1">Grupo 1</option>
                      {(mode !== 'from-profile' || puedeUsarGrupo2) && <option value="2">Grupo 2</option>}
                    </select>
                    {mode === 'from-profile' && !puedeUsarGrupo2 && (
                      <p className="text-xs text-[#737780]">Con una sola fecha de recarga solo aplica Grupo 1.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sección - Datos de la factura */}
          <div className="pb-2">
            <SectionHeader
              title="Datos de la factura"
              open={sec3Open}
              filled={sec3Filled}
              onToggle={() => setSec3Open((v) => !v)}
            />
            {sec3Open && (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    {labelReq('Fecha de emisión')}
                    <input
                      type="date"
                      value={fechaEmision}
                      onChange={(e) => setFechaEmision(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    {labelReq('Fecha de vencimiento')}
                    <input
                      type="date"
                      value={fechaVencimiento}
                      onChange={(e) => setFechaVencimiento(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  {labelReq('Monto')}
                  <input
                    type="number"
                    placeholder="$ 0.00"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    className={inputCls}
                  />
                </div>
                {initialPeriodo && (
                  <p className="text-xs text-[#737780]">
                    Periodo prellenado a partir del mes seleccionado. Puedes ajustar las fechas si es necesario.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-4 mt-2 border-t border-[#e5e7eb]">
          <Button variant="secondary" onClick={handleClose} disabled={loading} className="w-full">
            Cancelar
          </Button>
          <Button
            loading={loading}
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full"
          >
            Agregar
          </Button>
        </div>
      </Modal>
    </>
  );
}
