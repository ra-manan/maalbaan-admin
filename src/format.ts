import type { DemoStatus, License } from './api';

export function pkr(amount: number): string {
  return `PKR ${amount.toLocaleString('en-US')}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 2026-10-28 -> 28 Oct 2026. Takes the text as it is, so the time zone cannot shift the day. */
export function dateText(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : iso;
}

/** 2026-10 -> Oct */
export function monthShort(ym: string): string {
  return MONTHS[Number(ym.slice(5, 7)) - 1] ?? ym;
}

export function dayTime(ms: number): string {
  const d = new Date(ms);
  const h = d.getHours() % 12 || 12;
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${h}:${min} ${d.getHours() < 12 ? 'am' : 'pm'}`;
}

/** "2 min ago", "Yesterday", "3 days ago"; older than a month falls back to the date. */
export function ago(ms: number | null, now = Date.now()): string {
  if (!ms) return 'Never';
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86_400) {
    const h = Math.floor(s / 3600);
    return `${h} ${h === 1 ? 'hour' : 'hours'} ago`;
  }
  const d = Math.floor(s / 86_400);
  if (d === 1) return 'Yesterday';
  if (d < 31) return `${d} days ago`;
  return new Date(ms).toISOString().slice(0, 10).replace(/^(\d{4})-(\d{2})-(\d{2})$/, (_, y, mo, da) => `${Number(da)} ${MONTHS[Number(mo) - 1]} ${y}`);
}

export type Tone = 'success' | 'warning' | 'danger' | 'neutral';

export function licenseBadge(l: License, trial = false): { text: string; tone: Tone } {
  const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;
  switch (l.state) {
    case 'suspended':
      return { text: 'Suspended', tone: 'danger' };
    case 'expired':
      return { text: `Read-only · ended ${days(-l.daysLeft)} ago`, tone: 'danger' };
    case 'grace':
      return { text: `Grace period · ${days(l.graceLeft ?? 0)} left`, tone: 'warning' };
    case 'expiring':
      return { text: l.daysLeft === 0 ? 'Ends today' : `Expires in ${days(l.daysLeft)}`, tone: 'warning' };
    default:
      return { text: `${trial ? 'Trial' : 'Active'} · ${days(l.daysLeft)}`, tone: 'success' };
  }
}

export const PLAN_NAMES: Record<string, string> = { trial: 'Trial', standard: 'Standard', pro: 'Pro' };
export const planName = (id: string) => PLAN_NAMES[id] ?? id;


export const DEMO_STATUS: Record<DemoStatus, { label: string; tone: Tone }> = {
  new: { label: 'New', tone: 'warning' },
  contacted: { label: 'Contacted', tone: 'neutral' },
  scheduled: { label: 'Demo booked', tone: 'neutral' },
  converted: { label: 'Account created', tone: 'success' },
  not_interested: { label: 'Not interested', tone: 'neutral' },
  spam: { label: 'Spam', tone: 'danger' },
};

export const PAYMENT_METHODS: Record<string, string> = { cash: 'Cash', bank: 'Bank transfer', jazzcash: 'JazzCash', easypaisa: 'Easypaisa', other: 'Other' };

/** 0300 1234567 -> 923001234567, for wa.me links. */
export function whatsappDigits(phone: string): string {
  const d = phone.replace(/\D/g, '');
  return d.startsWith('0') ? `92${d.slice(1)}` : d;
}

/** 03001234567 -> 0300 1234567 */
export function phoneText(phone: string): string {
  return /^03\d{9}$/.test(phone) ? `${phone.slice(0, 4)} ${phone.slice(4)}` : phone;
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');
}

const ACTIONS: Record<string, string> = {
  account_created: 'Added account',
  account_updated: 'Changed account',
  account_suspended: 'Suspended account',
  account_reactivated: 'Reactivated account',
  code_issued: 'Issued activation code',
  payment_recorded: 'Recorded payment',
  device_removed: 'Removed a computer',
  demo_updated: 'Updated demo request',
  demo_converted: 'Created trial account from demo request',
  plan_updated: 'Changed plan prices',
  staff_created: 'Added staff login',
  staff_updated: 'Changed staff login',
  password_changed: 'Changed own password',
};
export const actionText = (action: string) => ACTIONS[action] ?? action;

/** Adds whole months to a YYYY-MM-DD date, clamping to the last day (31 Jan + 1 month = 28 Feb). */
export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const total = (m - 1) + months;
  const year = y + Math.floor(total / 12);
  const month = ((total % 12) + 12) % 12;
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`;
}

export const PAYMENT_KINDS: Record<string, string> = { license: 'Licence fee', monthly: 'Monthly fee', other: 'Other' };

/**
 * Where an account stands on its fees. The licence fee is paid once and covers the first month; the monthly fee
 * is due in every later calendar month (Pakistan time) until a monthly payment is recorded in that month.
 */
export function feeStatus(createdAt: number, payments: { kind: string; paid_on: string }[], today: string) {
  const licensePaidOn = payments.filter((p) => p.kind === 'license').map((p) => p.paid_on).sort().at(-1) ?? null;
  const thisMonth = today.slice(0, 7);
  const startedIn = new Date(createdAt + 5 * 3_600_000).toISOString().slice(0, 7);
  const monthlyPaid = payments.some((p) => p.kind === 'monthly' && p.paid_on.slice(0, 7) === thisMonth);
  return { licensePaidOn, monthlyPaid, monthlyStarted: thisMonth > startedIn };
}
