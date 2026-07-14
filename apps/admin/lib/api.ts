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
  put: async <T>(path: string, body?: unknown): Promise<T> => {
    const res = await http.put<T>(path, body ?? {});
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

// ---- Reviews (moderation queue) ----

export type ReviewDirection = 'PATIENT_ON_DOCTOR' | 'DOCTOR_ON_PATIENT';

export type ReviewStatus = 'PENDING' | 'PUBLISHED' | 'FLAGGED' | 'REMOVED';

/** A moderation decision — mirrors `ReviewModerateIn.action` in sehaty-api. */
export type ReviewModerateAction = 'PUBLISH' | 'REMOVE';

export interface Review {
  id: number;
  author_id: number;
  target_id: number;
  appointment_id: number;
  direction: ReviewDirection;
  stars: number;
  comment: string | null;
  status: ReviewStatus;
  reply: string | null;
  reply_at: string | null;
  created_at: string;
}

/** The moderation queue: every PENDING or FLAGGED review, newest first. */
export function listReviewQueue(): Promise<Review[]> {
  return api.get<Review[]>('/api/v1/admin/reviews');
}

/** Publish or remove a review; returns the updated row. */
export function moderateReview(
  reviewId: number,
  action: ReviewModerateAction,
): Promise<Review> {
  return api.post<Review>(`/api/v1/admin/reviews/${reviewId}/moderate`, {
    action,
  });
}

// ---- Configuration (ranking weights + feature flags) ----

/**
 * The doctor-locator ranking weights — mirrors `RankingWeightsOut` in
 * sehaty-api. Each weight scales one signal in the search ranking score.
 */
export interface RankingWeights {
  w_rating: number;
  w_distance: number;
  w_responsiveness: number;
  w_verified: number;
  w_recency: number;
}

/** The tunable weight keys, in display order. */
export type RankingWeightKey = keyof RankingWeights;

/**
 * A partial update of the ranking weights — mirrors `RankingWeightsIn`. Only
 * the weights actually sent are applied server-side; the rest stay untouched.
 */
export type RankingWeightsInput = Partial<RankingWeights>;

/** Every feature flag as a `{key: enabled}` mapping (`FeatureFlagsOut`). */
export interface FeatureFlags {
  flags: Record<string, boolean>;
}

/** A single feature flag row — mirrors `FeatureFlagOut`. */
export interface FeatureFlag {
  key: string;
  enabled: boolean;
  description: string | null;
}

/** Load the live ranking weights (defaults until an admin tunes them). */
export function getRankingWeights(): Promise<RankingWeights> {
  return api.get<RankingWeights>('/api/v1/admin/config/ranking-weights');
}

/** Update one or more ranking weights; unspecified weights stay unchanged. */
export function setRankingWeights(
  body: RankingWeightsInput,
): Promise<RankingWeights> {
  return api.put<RankingWeights>('/api/v1/admin/config/ranking-weights', body);
}

/** Load every feature flag as a `{key: enabled}` mapping. */
export function getFeatureFlags(): Promise<FeatureFlags> {
  return api.get<FeatureFlags>('/api/v1/admin/config/feature-flags');
}

/** Create or flip a named feature flag (upsert); returns the updated flag. */
export function setFeatureFlag(
  key: string,
  enabled: boolean,
): Promise<FeatureFlag> {
  return api.put<FeatureFlag>(
    `/api/v1/admin/config/feature-flags/${encodeURIComponent(key)}`,
    { enabled },
  );
}

// ---- Users (admin) ----

/** A platform role. Mirrors `UserRole` in sehaty-api. */
export type UserRole = 'DOCTOR' | 'PATIENT' | 'ADMIN';

/** One row of the admin Users page — mirrors `AdminUserOut` in sehaty-api. */
export interface AdminUser {
  id: number;
  email: string;
  phone: string | null;
  role: string;
  is_active: boolean;
  full_name: string | null;
  created_at: string;
}

/** Filters for the admin Users listing; all optional. */
export interface AdminUsersQuery {
  role?: UserRole;
  is_active?: boolean;
  limit?: number;
  offset?: number;
}

/** List platform users, newest first; optional role / active filters. */
export function listAdminUsers(
  query: AdminUsersQuery = {},
): Promise<AdminUser[]> {
  const params = new URLSearchParams();
  if (query.role) params.set('role', query.role);
  if (query.is_active !== undefined) {
    params.set('is_active', String(query.is_active));
  }
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  if (query.offset !== undefined) params.set('offset', String(query.offset));
  const qs = params.toString();
  return api.get<AdminUser[]>(`/api/v1/admin/users${qs ? `?${qs}` : ''}`);
}

// ---- Subscriptions (admin) ----

/** A subscription lifecycle status. Mirrors `SubscriptionStatus`. */
export type SubscriptionStatus =
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELLED';

/**
 * One row of the admin Subscriptions page — mirrors `AdminSubscriptionOut`
 * in sehaty-api.
 */
export interface AdminSubscription {
  id: number;
  doctor_id: number;
  doctor_name: string | null;
  plan_code: string;
  plan_name: string;
  price_month: number;
  currency: string;
  status: string;
  current_period_end: string;
}

/** Filters for the admin Subscriptions listing; all optional. */
export interface AdminSubscriptionsQuery {
  status?: SubscriptionStatus;
  limit?: number;
  offset?: number;
}

/** List subscriptions, newest first; optional status filter. */
export function listAdminSubscriptions(
  query: AdminSubscriptionsQuery = {},
): Promise<AdminSubscription[]> {
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  if (query.offset !== undefined) params.set('offset', String(query.offset));
  const qs = params.toString();
  return api.get<AdminSubscription[]>(
    `/api/v1/admin/subscriptions${qs ? `?${qs}` : ''}`,
  );
}
