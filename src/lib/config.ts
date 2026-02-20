// ══════════════════════════════════════════════════════════════════════════════
// 🔧 ÚNICA LÍNEA A CAMBIAR PARA PRODUCCIÓN — URL del backend API
// ══════════════════════════════════════════════════════════════════════════════
export const EXTERNAL_API_BASE_URL =
  process.env.DEONE_API_BASE_URL || 'https://prueba-supabase.onrender.com/api';
// ══════════════════════════════════════════════════════════════════════════════

// NOTE: No exponer la API key al cliente. Configure `DEONE_API_KEY` en el entorno del servidor (.env.local)
// Ejemplo en .env.local: DEONE_API_KEY=TK2026A7F9X3M8N2P5Q1R4T6Y8U0I9O3
