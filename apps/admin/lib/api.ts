const TOKEN_KEY = 'sehaty-admin-token';

/**
 * Base URL for the Sehaty API. Overridable per-environment via
 * NEXT_PUBLIC_API_URL; defaults to the local API for development.
 */
const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:8000';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      (data as { detail?: string }).detail ?? res.statusText ?? 'Request failed';
    throw new ApiError(res.status, detail);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
};

// ---- Domain types (mirror sehaty-api schemas) ----

export interface TokenOut {
  access: string;
  refresh: string;
  role: string;
}

export interface PendingProfessional {
  user_id: number;
  full_name: string;
  speciality: string | null;
  license_no: string;
  city: string | null;
  email: string;
}

// ---- Endpoints ----

export function login(email: string, password: string): Promise<TokenOut> {
  return api.post<TokenOut>('/api/v1/auth/login', { email, password });
}

export function listPendingProfessionals(): Promise<PendingProfessional[]> {
  return api.get<PendingProfessional[]>(
    '/api/v1/admin/professionals?pending=true',
  );
}

export function accreditProfessional(userId: number): Promise<{ ok: boolean }> {
  return api.post<{ ok: boolean }>(
    `/api/v1/admin/professionals/${userId}/accredit`,
  );
}
