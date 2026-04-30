'use client';

interface MetricCardProps {
  title: string;
  value: string | number;
  label?: string;
  color?: string;
  isCurrency?: boolean;
}

export function MetricCard({ title, value, label, color = '#FF8D2D', isCurrency = false }: MetricCardProps) {
  let displayValue = String(value);

  // Si es moneda y viene como número, formatearlo
  if (isCurrency && typeof value === 'number') {
    displayValue = value.toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  } else if (isCurrency && typeof value === 'string') {
    // Si viene como string formateado, extraer solo el número
    displayValue = value.replace('$COP ', '').trim();
  }

  // Calcular tamaño de fuente basado en longitud del número (escala aumentada)
  let fontSize = '2.25rem'; // base (antes 1.875rem)
  const valueLength = displayValue.length;
  if (valueLength > 30) fontSize = '1rem';
  else if (valueLength > 25) fontSize = '1.125rem';
  else if (valueLength > 20) fontSize = '1.5rem';
  else if (valueLength > 15) fontSize = '1.875rem';

  return (
    <div
      className="rounded-[11.5px] border border-[#C9C9C9] bg-[#F9F9F9] p-6"
      style={{ minHeight: '145px' }}
    >
      <div className="flex flex-col h-full justify-between">
        <div>
          <p className="text-sm font-medium text-[#6D7382] mb-2">{title}</p>
        </div>
        <div>
          {isCurrency ? (
            <div className="flex items-baseline gap-1 mb-2 flex-wrap">
              <p
                className="font-bold text-[#1D212B] break-words leading-tight"
                style={{
                  fontSize: fontSize,
                }}
              >
                ${displayValue}
              </p>
            </div>
          ) : (
            <p
              className="font-bold text-[#1D212B] mb-2 leading-tight"
              style={{
                fontSize: fontSize,
              }}
            >
              {displayValue}
            </p>
          )}
          {label && <p className="text-sm text-[#6D7382]">{label}</p>}
        </div>
      </div>
    </div>
  );
}
