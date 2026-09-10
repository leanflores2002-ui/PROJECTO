import { config } from '../config';

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

export async function apiRequest(path, { token, method = 'GET', body, signal } = {}) {
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
    const message = (typeof detail === 'string' ? detail : validation) || messages[response.status] || 'No se pudo completar la solicitud.';
    throw new ApiError(message, response.status, payload);
  }

  return payload;
}
