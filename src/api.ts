/** Typed calls to the Maalbaan API (`/v1/manage/*`). The sign-in cookie is HttpOnly: this code never sees it. */

import { apiBaseFor, environment } from './environment';

const BASE: string = apiBaseFor(environment, import.meta.env.VITE_API_URL, import.meta.env.PROD);

export type LicenseState = 'active' | 'expiring' | 'grace' | 'expired' | 'suspended';

export interface License {
  state: LicenseState;
  daysLeft: number;
  graceLeft: number | null;
}

export interface Account {
  id: string;
  name: string;
  ownerName: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  plan: string;
  notes: string | null;
  status: 'active' | 'suspended';
  suspendedReason: string | null;
  licenseValidUntil: string;
  graceDays: number;
  createdAt: number;
  deviceCount: number;
  lastSeenAt: number | null;
  lastPaidOn: string | null;
  license: License;
}

export interface Device {
  id: string;
  name: string;
  created_at: number;
  last_seen_at: number | null;
  revoked_at: number | null;
}

export interface Payment {
  id: string;
  amount_pkr: number;
  kind: string;
  method: string;
  reference: string | null;
  paid_on: string;
  note: string | null;
  recorded_by: string;
  created_at: number;
}

export interface Plan {
  id: string;
  name: string;
  max_users: number;
  /** One-time licensing fee; empty until decided. */
  license_fee_pkr: number | null;
  monthly_price_pkr: number | null;
  /** A switched-off plan keeps its accounts but cannot be given to new ones. */
  enabled: boolean;
}

export type DemoStatus = 'new' | 'contacted' | 'scheduled' | 'converted' | 'not_interested' | 'spam';

export interface DemoRequest {
  id: string;
  name: string;
  shop: string | null;
  phone: string;
  city: string | null;
  status: DemoStatus;
  notes: string | null;
  dealerId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface AuditEntry {
  id?: number;
  admin_name: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  detail: string | null;
  created_at: number;
}

export interface Staff {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'staff';
  active: number;
  created_at: number;
  last_login_at: number | null;
}

export interface Admin {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'staff';
}

export interface Overview {
  today: string;
  accounts: { total: number; active: number; expiring: number; grace: number; expired: number; suspended: number; trial: number };
  byPlan: { id: string; name: string; count: number }[];
  devices: { total: number; seenToday: number };
  demos: { new: number; last30Days: number; converted30Days: number };
  revenue: { mrrPkr: number; unpricedMonthly: number; months: { month: string; paidPkr: number; newAccounts: number }[] };
  expiringSoon: Account[];
  recentDemos: { id: string; name: string; shop: string | null; phone: string; city: string | null; status: DemoStatus; created_at: number }[];
  activity: AuditEntry[];
}

/** A plain sentence from the server, safe to show as it is. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

let onSignedOut: () => void = () => {};
export function setSignedOutHandler(fn: () => void) {
  onSignedOut = fn;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/v1/manage${path}`, {
      method,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'offline', 'Cannot reach the server. Check your internet and try again.');
  }
  const data = (await res.json().catch(() => null)) as (T & { error?: string; message?: string }) | null;
  if (!res.ok) {
    // A session that ended (or never was) sends the person back to sign in. Sign-in itself answers 401 for a wrong password.
    if (res.status === 401 && data?.error === 'not_signed_in') onSignedOut();
    throw new ApiError(res.status, data?.error ?? 'error', data?.message ?? 'Something went wrong. Try again.');
  }
  return data as T;
}

const get = <T,>(path: string) => request<T>('GET', path);
const post = <T,>(path: string, body?: unknown) => request<T>('POST', path, body ?? {});
const patch = <T,>(path: string, body: unknown) => request<T>('PATCH', path, body);

export interface AccountInput {
  name?: string;
  ownerName?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  plan?: string;
  notes?: string | null;
  licenseValidUntil?: string;
  graceDays?: number;
  status?: 'active' | 'suspended';
  suspendedReason?: string | null;
}

export interface AccountDetail {
  dealer: Account;
  devices: Device[];
  payments: Payment[];
  openCodes: number;
  plan: Plan | null;
}

/** One slice of the Munshi figures (a language, a screen, a role, a model, a day). */
export interface MunshiGroup {
  key: string;
  commands: number;
  failed: number;
  /** Share of spoken lines that stood as spoken once the invoice was saved; null until some were saved. */
  keptPct: number | null;
  costMicro: number;
}

export interface MunshiSummary {
  days: number;
  since: number;
  commands: number;
  failed: number;
  answeredByAi: number;
  answeredByLocal: number;
  outcomes: { added: number; cancelled: number; needsNet: number; settled: number; notReported: number };
  undone: number;
  lines: { kept: number; changed: number; removed: number; keptPct: number | null };
  latencyMs: { p50: number | null; p95: number | null };
  tokens: { input: number; output: number };
  costMicro: number;
  costPerCommandMicro: number | null;
  speech: { clips: number; failed: number; audioSeconds: number };
  failures: Record<string, number>;
  byDay: { day: string; commands: number; failed: number; keptPct: number | null; costMicro: number }[];
  byLanguage: MunshiGroup[];
  bySurface: MunshiGroup[];
  byRole: MunshiGroup[];
  byModel: MunshiGroup[];
  truncated: boolean;
}

export type MunshiView = 'all' | 'failed' | 'edited' | 'cancelled';

export interface MunshiEvent {
  id: string;
  utterance_id: string | null;
  created_at: number;
  kind: 'parse' | 'transcribe' | 'local';
  tier: 'ai' | 'whisper_cloud' | 'local';
  model: string | null;
  surface: string | null;
  channel: string | null;
  language: string | null;
  role: string | null;
  status: 'ok' | 'failed' | 'off';
  failure: string | null;
  latency_ms: number | null;
  audio_ms: number | null;
  cost_micro: number | null;
  lines_total: number | null;
  lines_sure: number | null;
  answered_by: 'ai' | 'local' | null;
  outcome: 'added' | 'cancelled' | 'needs_net' | 'settled' | null;
  lines_kept: number | null;
  lines_changed: number | null;
  lines_removed: number | null;
  undone: number | null;
  transcript: string | null;
  proposed: string | null;
  final: string | null;
  dealer_name: string;
}

export interface MunshiShop {
  id: string;
  name: string;
  shareText: boolean;
  commands: number;
  failed: number;
  keptPct: number | null;
  costMicro: number;
  lastAt: number | null;
}

/** A scored test-set run uploaded by the eval runner in the Munshi Agent repo. Scores are 0 to 1. */
export interface EvalRun {
  id: string;
  createdAt: number;
  label: string;
  kind: 'nlu' | 'speech';
  language: string | null;
  setName: string;
  setSize: number;
  metrics: Record<string, number>;
  notes: string | null;
}

export const api = {
  login: (email: string, password: string) => post<{ admin: Admin }>('/auth/login', { email, password }),
  logout: () => post<{ ok: true }>('/auth/logout'),
  me: () => get<{ admin: Admin }>('/auth/me'),
  changePassword: (current: string, next: string) => post<{ ok: true }>('/auth/password', { current, next }),

  overview: () => get<Overview>('/overview'),

  accounts: (q = '') =>
    get<{ dealers: Account[]; counts: { all: number; active: number; suspended: number; expiring: number; readOnly: number; trial: number } }>(
      `/dealers${q ? `?q=${encodeURIComponent(q)}` : ''}`,
    ),
  account: (id: string) => get<AccountDetail>(`/dealers/${id}`),
  createAccount: (input: AccountInput) => post<AccountDetail>('/dealers', input),
  updateAccount: (id: string, input: AccountInput) => patch<AccountDetail>(`/dealers/${id}`, input),
  issueCode: (id: string, days: number) => post<{ code: string; expiresAt: number }>(`/dealers/${id}/activation-codes`, { days }),
  recordPayment: (id: string, input: { amountPkr: number; kind: string; method: string; paidOn?: string; reference?: string; note?: string; extendLicenseTo?: string }) =>
    post<AccountDetail>(`/dealers/${id}/payments`, input),
  removeDevice: (id: string) => post<{ ok: true }>(`/devices/${id}/revoke`),

  demos: (status = '') => get<{ requests: DemoRequest[]; counts: Record<string, number> }>(`/demo-requests${status ? `?status=${status}` : ''}`),
  updateDemo: (id: string, input: { status?: DemoStatus; notes?: string }) => patch<{ ok: true }>(`/demo-requests/${id}`, input),
  convertDemo: (id: string) => post<{ dealerId: string }>(`/demo-requests/${id}/convert`),

  plans: () => get<{ plans: Plan[] }>('/plans'),
  updatePlan: (id: string, input: { licenseFeePkr?: number | null; monthlyPricePkr?: number | null; enabled?: boolean }) => patch<{ plans: Plan[] }>(`/plans/${id}`, input),

  staff: () => get<{ staff: Staff[] }>('/staff'),
  createStaff: (input: { email: string; name: string; password: string }) => post<{ id: string }>('/staff', input),
  updateStaff: (id: string, input: { active?: boolean; role?: 'owner' | 'staff'; password?: string }) => patch<{ ok: true }>(`/staff/${id}`, input),

  audit: () => get<{ entries: AuditEntry[] }>('/audit?limit=100'),

  munshiSummary: (days: number) => get<MunshiSummary>(`/munshi/summary?days=${days}`),
  munshiEvents: (view: MunshiView, before?: number) => get<{ events: MunshiEvent[] }>(`/munshi/events?view=${view}&limit=50${before ? `&before=${before}` : ''}`),
  munshiShops: (days: number) => get<{ shops: MunshiShop[] }>(`/munshi/shops?days=${days}`),
  setMunshiText: (dealerId: string, shareText: boolean) => patch<{ ok: true }>(`/munshi/shops/${dealerId}`, { shareText }),
  munshiEvalRuns: () => get<{ runs: EvalRun[] }>('/munshi/eval-runs?limit=100'),
};
