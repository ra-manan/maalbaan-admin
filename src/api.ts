/** Typed calls to the Maalbaan API (`/v1/manage/*`). The sign-in cookie is HttpOnly: this code never sees it. */

const BASE: string = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? 'https://api.maalbaan.com' : '');

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
  billing: 'license' | 'monthly';
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
  billing?: 'license' | 'monthly';
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
  recordPayment: (id: string, input: { amountPkr: number; method: string; paidOn?: string; reference?: string; note?: string; extendLicenseTo?: string }) =>
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
};
