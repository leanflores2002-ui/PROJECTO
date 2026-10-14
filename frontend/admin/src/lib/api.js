import { config } from '../config';

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

async function performRequest(path, { token, method = 'GET', body, signal } = {}) {
  const multipart = body instanceof FormData;
  const response = await fetch(`${config.apiUrl}${path}`, {
    method,
    signal,
    headers: {
      Accept: 'application/json',
      ...(body && !multipart ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: multipart ? body : JSON.stringify(body) } : {}),
  });

  const raw = await response.text();
  let payload = null;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const detail = payload?.detail;
    const messages = { 401: 'Tu sesión venció. Volvé a ingresar.', 403: 'No tenés permisos para esta acción.',
      404: 'No se encontró el recurso.', 409: 'Los datos cambiaron. Recargá antes de guardar.',
      422: 'Revisá los campos del formulario.', 500: 'No se pudo completar la operación.',
      503: 'El servicio no está disponible. Intentá nuevamente.' };
    const validation = Array.isArray(detail) ? detail.map((item) =>
      `${(item.loc || []).filter((part) => part !== 'body').join(' / ')}: ${item.msg || 'Valor inválido'}`).join('; ') : '';
    const message = (response.status >= 500 ? messages[response.status] : (typeof detail === 'string' ? detail : validation)) || messages[response.status] || 'No se pudo completar la solicitud.';
    throw new ApiError(message, response.status, payload);
  }

  return payload;
}

const inFlight = new Map();
// Share reads only while in flight; never cache stock or administrative data.
export function apiRequest(path, options = {}) {
  if (options.method && options.method !== 'GET') return performRequest(path, options);
  const { signal } = options;
  if (signal?.aborted) return Promise.reject(new DOMException('Solicitud cancelada', 'AbortError'));
  const key = `${options.token || ''}\n${path}`;
  let entry = inFlight.get(key);
  if (!entry || entry.controller.signal.aborted) {
    const controller = new AbortController();
    entry = { controller, users: 0, timer: null };
    entry.promise = performRequest(path, { ...options, signal: controller.signal }).finally(() => { if (inFlight.get(key) === entry) inFlight.delete(key); });
    inFlight.set(key, entry);
  }
  clearTimeout(entry.timer);
  entry.users++;
  return new Promise((resolve, reject) => {
    let done = false;
    function finish(fn, value) {
      if (done) return;
      done = true; signal?.removeEventListener('abort', abort); entry.users--;
      if (!entry.users) entry.timer = setTimeout(() => { if (!entry.users) entry.controller.abort(); }, 0);
      fn(value);
    }
    const abort = () => finish(reject, new DOMException('Solicitud cancelada', 'AbortError'));
    signal?.addEventListener('abort', abort, { once: true });
    entry.promise.then(value => finish(resolve,value), error => finish(reject,error));
  });
}

export function uploadImages(path, { token, body, onProgress }) {
  return new Promise((resolve,reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${config.apiUrl}${path}`);
    xhr.timeout = 120000;
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress(Math.round(e.loaded/e.total*100)); };
    xhr.onerror = xhr.ontimeout = () => reject(new ApiError('No pudimos subir la imagen. Revisá la galería antes de reintentar.', 0));
    xhr.onload = () => {
      let result; try { result=JSON.parse(xhr.responseText); } catch { result=null; }
      if (xhr.status >= 200 && xhr.status < 300) resolve(result);
      else reject(new ApiError(xhr.status < 500 && typeof result?.detail === 'string' ? result.detail : 'No pudimos subir la imagen. Revisá la galería y reintentá.',xhr.status,result));
    };
    xhr.send(body);
  });
}
