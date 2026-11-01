import type { FeedbackKind, FeedbackStatus } from './api';

export const KIND_LABEL: Record<FeedbackKind, string> = { bug: 'Bug', issue: 'Issue', change: 'Change request' };
export const STATUS_LABEL: Record<FeedbackStatus, string> = { new: 'New', seen: 'Seen', working: 'Working on it', done: 'Done', declined: 'Declined' };
export const STATUSES: FeedbackStatus[] = ['new', 'seen', 'working', 'done', 'declined'];
export const KINDS: FeedbackKind[] = ['bug', 'issue', 'change'];

/** A voice note's length as m:ss. */
export function noteLength(ms: number | null): string {
  const s = Math.max(0, Math.round((ms ?? 0) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** What a report carries besides its words, in one line: "Voice note 0:12 · 2 screenshots". */
export function attachments(files: { name: string }[], audioMs: number | null): string {
  const shots = files.filter((f) => f.name.startsWith('shot-')).length;
  const parts: string[] = [];
  if (files.some((f) => f.name === 'audio')) parts.push(`Voice note ${noteLength(audioMs)}`);
  if (shots > 0) parts.push(shots === 1 ? '1 screenshot' : `${shots} screenshots`);
  return parts.join(' · ');
}

/** The first line of a report for a list: its words, or what it carries when it has none. */
export function headline(message: string | null, files: { name: string }[], audioMs: number | null): string {
  const text = (message ?? '').replace(/\s+/g, ' ').trim();
  if (text === '') return attachments(files, audioMs) || 'No details';
  return text.length > 140 ? `${text.slice(0, 137)}...` : text;
}
