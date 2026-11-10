/**
 * Plans the one-off contact export that has to land before the waitlist
 * database is dropped (zenkogg/zenko#694). Pure, so the rules are unit-tested.
 *
 * Loops is the marketing contact store, but its contacts are keyed by email, so
 * two kinds of row cannot live there in full: a row with no email (an X sign-in
 * never has one), and the second row of an email two sign-ins share. Both go to
 * the vault CSV instead, so no contact detail is left only in the waitlist DB.
 * Every row is accounted for exactly once, and `planContactExport` throws if
 * the totals ever disagree.
 */

import { LOOPS_VALUE_MAX } from './loops/client';
import { toLoopsContact, type LoopsWaitlistContact, type WaitlistContactInput } from './loops/contact';

export type ExportUser = WaitlistContactInput & { updatedAt: Date };

/** The old email-only signup table, from before OAuth sign-in. */
export interface ExportLegacyEntry {
  id: string;
  email: string;
  games: string[];
  status: string;
  createdAt: Date;
}

/** Whether the legacy email-only rows are kept as contacts or dropped. */
export type LegacyDecision = 'keep' | 'drop';

export type LoopsLegacyContact = Pick<
  LoopsWaitlistContact,
  'email' | 'waitlistGames' | 'waitlistJoinedAt'
>;

export type CsvReason = 'no_email' | 'duplicate_email' | 'legacy';

export interface CsvRow {
  source: 'waitlist_users' | 'whitelist_entries';
  reason: CsvReason;
  id: string;
  provider: string;
  email: string;
  displayName: string;
  username: string;
  twitterHandle: string;
  games: string;
  status: string;
  createdAt: string;
}

export interface ContactExportCounts {
  users: number;
  usersWithEmail: number;
  distinctEmails: number;
  noEmailUsers: number;
  duplicateEmailUsers: number;
  xHandles: number;
  legacyRows: number;
  legacyAlreadyCovered: number;
  legacyUnique: number;
  legacyDecision: LegacyDecision | null;
  loopsContacts: number;
  csvRows: number;
}

export interface ContactExportPlan {
  loops: Array<LoopsWaitlistContact | LoopsLegacyContact>;
  csv: CsvRow[];
  counts: ContactExportCounts;
}

function userCsvRow(user: ExportUser, reason: CsvReason): CsvRow {
  return {
    source: 'waitlist_users',
    reason,
    id: user.id,
    provider: user.oauthProvider,
    email: user.email ?? '',
    displayName: user.displayName ?? '',
    username: user.username ?? '',
    twitterHandle: user.twitterHandle ?? '',
    games: user.games.join(';'),
    status: user.status,
    createdAt: user.createdAt.toISOString(),
  };
}

/**
 * The row whose details Loops keeps when sign-ins share an email: the most
 * recently updated, which is the one the live sync wrote last.
 */
function newerFirst(a: ExportUser, b: ExportUser): number {
  return b.updatedAt.getTime() - a.updatedAt.getTime() || a.id.localeCompare(b.id);
}

export function planContactExport(
  users: ExportUser[],
  legacy: ExportLegacyEntry[],
  legacyDecision: LegacyDecision | null
): ContactExportPlan {
  const loops: ContactExportPlan['loops'] = [];
  const csv: CsvRow[] = [];

  const byEmail = new Map<string, ExportUser[]>();
  let noEmailUsers = 0;
  for (const user of users) {
    const email = user.email?.trim().toLowerCase();
    if (!email) {
      noEmailUsers += 1;
      csv.push(userCsvRow(user, 'no_email'));
      continue;
    }
    byEmail.set(email, [...(byEmail.get(email) ?? []), user]);
  }

  let duplicateEmailUsers = 0;
  for (const group of byEmail.values()) {
    const [kept, ...rest] = [...group].sort(newerFirst);
    const contact = toLoopsContact(kept);
    if (!contact) throw new Error(`Row ${kept.id} has an email but maps to no contact`);
    loops.push(contact);
    for (const user of rest) {
      duplicateEmailUsers += 1;
      csv.push(userCsvRow(user, 'duplicate_email'));
    }
  }

  let legacyAlreadyCovered = 0;
  let legacyUnique = 0;
  const legacySeen = new Set<string>();
  for (const entry of legacy) {
    const email = entry.email.trim().toLowerCase();
    if (byEmail.has(email) || legacySeen.has(email)) {
      legacyAlreadyCovered += 1;
      continue;
    }
    legacySeen.add(email);
    legacyUnique += 1;
    if (legacyDecision !== 'keep') continue;
    loops.push({
      email,
      waitlistJoinedAt: entry.createdAt.toISOString(),
      ...(entry.games.length > 0 ? { waitlistGames: entry.games.join(',').slice(0, LOOPS_VALUE_MAX) } : {}),
    });
    csv.push({
      source: 'whitelist_entries',
      reason: 'legacy',
      id: entry.id,
      provider: 'email',
      email,
      displayName: '',
      username: '',
      twitterHandle: '',
      games: entry.games.join(';'),
      status: entry.status,
      createdAt: entry.createdAt.toISOString(),
    });
  }

  const legacyExported = legacyDecision === 'keep' ? legacyUnique : 0;
  const usersAccounted = byEmail.size + duplicateEmailUsers + noEmailUsers;
  if (usersAccounted !== users.length) {
    throw new Error(`Export accounts for ${usersAccounted} of ${users.length} waitlist rows`);
  }
  if (loops.length !== byEmail.size + legacyExported) {
    throw new Error('Loops contact count does not reconcile');
  }
  if (legacyAlreadyCovered + legacyUnique !== legacy.length) {
    throw new Error('Legacy row count does not reconcile');
  }

  return {
    loops,
    csv,
    counts: {
      users: users.length,
      usersWithEmail: users.length - noEmailUsers,
      distinctEmails: byEmail.size,
      noEmailUsers,
      duplicateEmailUsers,
      xHandles: users.filter((u) => u.twitterHandle).length,
      legacyRows: legacy.length,
      legacyAlreadyCovered,
      legacyUnique,
      legacyDecision,
      loopsContacts: loops.length,
      csvRows: csv.length,
    },
  };
}

const CSV_COLUMNS: Array<keyof CsvRow> = [
  'source',
  'reason',
  'id',
  'provider',
  'email',
  'displayName',
  'username',
  'twitterHandle',
  'games',
  'status',
  'createdAt',
];

function csvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function toCsv(rows: CsvRow[]): string {
  const lines = [CSV_COLUMNS.join(',')];
  for (const row of rows) lines.push(CSV_COLUMNS.map((c) => csvField(row[c])).join(','));
  return `${lines.join('\r\n')}\r\n`;
}
