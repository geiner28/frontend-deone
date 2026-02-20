import { NextResponse } from 'next/server';
import { EXTERNAL_API_BASE_URL } from '@/lib/config';

const EXTERNAL_BASE = EXTERNAL_API_BASE_URL;
const API_KEY = process.env.DEONE_API_KEY; // debe estar en .env.local y NO en el cliente

// params may be either a plain object or a Promise that resolves to the object
async function proxyRequest(req: Request | any, params: any) {
  if (!API_KEY) {
    return NextResponse.json(
      { ok: false, data: null, error: { code: 'SERVER_CONFIG', message: 'DEONE_API_KEY no configurada en el servidor', details: null } },
      { status: 500 }
    );
  }

  // Normalize params: await if it's a Promise (some Next versions provide params as Promise)
  let resolvedParams = params;
  try {
    if (params && typeof params.then === 'function') {
      resolvedParams = await params;
    }
  } catch (e) {
    resolvedParams = params;
  }

  const pathSuffix = resolvedParams && resolvedParams.path ? resolvedParams.path.join('/') : '';
  
  // Construir URL con query string
  const urlObj = new URL(req.url, `http://localhost:3000`);
  const queryString = urlObj.search ? `?${urlObj.searchParams.toString()}` : '';
  const url = `${EXTERNAL_BASE}/${pathSuffix}${queryString}`;

  const init: RequestInit = {
    method: req.method,
    headers: {
      'Content-Type': 'application/json',
      'X-admin-api-key': API_KEY,
      'X-bot-api-key': API_KEY,
    },
    body: ['GET', 'HEAD'].includes(req.method || '') ? undefined : await req.text(),
  };

  try {
    const res = await fetch(url, init);
    const text = await res.text();

    let body: any = text;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }

    return NextResponse.json(body, { status: res.status });
  } catch (error) {
    console.error('[Proxy Error]', error);
    return NextResponse.json(
      { ok: false, data: null, error: { code: 'PROXY_ERROR', message: 'Error al conectar con el API externo', details: String(error) } },
      { status: 502 }
    );
  }
}
export const GET = async (req: any, context: any) => {
  return proxyRequest(req, context?.params);
};
export const POST = async (req: any, context: any) => {
  return proxyRequest(req, context?.params);
};
export const PUT = async (req: any, context: any) => {
  return proxyRequest(req, context?.params);
};
export const PATCH = async (req: any, context: any) => {
  return proxyRequest(req, context?.params);
};
export const DELETE = async (req: any, context: any) => {
  return proxyRequest(req, context?.params);
};
