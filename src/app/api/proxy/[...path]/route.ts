import { NextResponse } from 'next/server';

const EXTERNAL_BASE = process.env.DEONE_API_BASE_URL || 'https://prueba-supabase.onrender.com/api';
const API_KEY = process.env.DEONE_API_KEY; // debe estar en .env.local y NO en el cliente

async function proxyRequest(req: Request, params: { path: string[] }) {
  if (!API_KEY) {
    return NextResponse.json({ ok: false, data: null, error: { code: 'SERVER_CONFIG', message: 'DEONE_API_KEY no configurada en el servidor', details: null } }, { status: 500 });
  }

  const pathSuffix = params.path ? params.path.join('/') : '';
  const url = `${EXTERNAL_BASE}/${pathSuffix}${req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''}`;

  const init: RequestInit = {
    method: req.method,
    headers: {
      // copiar content-type si viene del cliente
      ...Object.fromEntries(req.headers),
      'X-admin-api-key': API_KEY,
    },
    // forward body if present
    body: ['GET', 'HEAD'].includes(req.method || '') ? undefined : await req.text(),
    // keep credentials mode default
  };

  // Perform fetch to external API
  const res = await fetch(url, init);
  const text = await res.text();

  // Try to parse JSON, but return raw text if not JSON
  let body: any = text;
  try {
    body = JSON.parse(text);
  } catch (e) {
    body = text;
  }

  // Forward status and selected headers
  const response = NextResponse.json(body, { status: res.status });
  return response;
}

export async function GET(req: Request, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params);
}
export async function POST(req: Request, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params);
}
export async function PUT(req: Request, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params);
}
export async function PATCH(req: Request, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params);
}
export async function DELETE(req: Request, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params);
}
