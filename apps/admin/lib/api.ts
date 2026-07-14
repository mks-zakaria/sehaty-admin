import axios, { AxiosError, type AxiosInstance } from 'axios';

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

/**
 * The shared axios instance for every call to the Sehaty API. A request
 * interceptor attaches the admin Bearer token; a response interceptor
 * normalises any failure into an {@link ApiError} carrying the HTTP status
 * and the API's `detail` message, so callers can keep the same
 * `err instanceof ApiError` / `err.status === 401` handling everywhere.
 */
export const http: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ detail?: string }>) => {
    const status = error.response?.status ?? 0;
    const detail =
      error.response?.data?.detail ??
      error.response?.statusText ??
      error.message ??
      'Request failed';
    return Promise.reject(new ApiError(status, detail));
  },
);

export const api = {
  get: async <T>(path: string): Promise<T> => {
    const res = await http.get<T>(path);
    return res.data;
  },
  post: async <T>(path: string, body?: unknown): Promise<T> => {
    const res = await http.post<T>(path, body ?? {});
    return res.data;
  },
};

/**
 * Fetch a protected endpoint that streams a file (e.g. the CSV accounting
 * export) and return it as a Blob. Goes through the same authed axios
 * instance but keeps the raw body instead of parsing JSON.
 */
export async function requestBlob(path: string): Promise<Blob> {
  const res = await http.get(path, { responseType: 'blob' });
  return res.data as Blob;
}

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

// ---- Reporting (admin dashboard) ----

export interface Kpis {
  doctors_total: number;
  doctors_verified: number;
  patients_total: number;
  appointments_by_status: Record<string, number>;
  reviews_published: number;
  referrals_rewarded: number;
  active_subscriptions: number;
}

export interface MonthRevenue {
  month: number;
  collected: number;
  payments: number;
}

export interface RevenueSummary {
  year: number;
  total_collected: number;
  currency: string;
  by_month: MonthRevenue[];
  active_subscriptions: number;
  mrr: number;
}

export function getKpis(): Promise<Kpis> {
  return api.get<Kpis>('/api/v1/admin/reports/kpis');
}

export function getRevenue(year: number): Promise<RevenueSummary> {
  return api.get<RevenueSummary>(`/api/v1/admin/reports/revenue?year=${year}`);
}

export function getAccountingExport(year: number): Promise<Blob> {
  return requestBlob(`/api/v1/admin/reports/accounting-export?year=${year}`);
}

// ---- Billing (cash) ----

export interface Plan {
  code: string;
  name: string;
  price_month: number;
  currency: string;
}

export interface Payment {
  id: number;
  invoice_id: number;
  amount: number;
  method: string;
  paid_at: string;
}

export interface CashPaymentInput {
  invoice_id: number;
  amount: number;
  receipt_no: string;
  paid_at?: string;
}

export function listPlans(): Promise<Plan[]> {
  return api.get<Plan[]>('/api/v1/billing/plans');
}

export function seedPlans(): Promise<{ created: number }> {
  return api.post<{ created: number }>('/api/v1/billing/admin/seed-plans');
}

export function recordCashPayment(body: CashPaymentInput): Promise<Payment> {
  return api.post<Payment>('/api/v1/billing/admin/payments', body);
}

export function runDunning(): Promise<{ past_due: number }> {
  return api.post<{ past_due: number }>('/api/v1/billing/admin/dunning');
}
