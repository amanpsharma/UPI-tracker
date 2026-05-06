import { PermissionsAndroid, Platform } from 'react-native';
import { parseUpiSms, parsedToTransaction } from './smsParser';
import { api } from './api';
import { Transaction } from '@/types';

export async function requestSmsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_SMS, {
    title: 'SMS Permission',
    message: 'UPI Tracker needs SMS access to automatically detect your UPI payments.',
    buttonPositive: 'Allow',
    buttonNegative: 'Deny',
  });
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

function getSmsModule() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-get-sms-android');
    return mod?.default ?? mod ?? null;
  } catch {
    return null;
  }
}

// Fingerprint that works whether or not dedupeKey was stored previously.
// Truncates time to the minute so minor timestamp drift doesn't break matching.
function fingerprint(amount: number, paidAt: string, upiId: string): string {
  const minute = new Date(paidAt).toISOString().slice(0, 16);
  return `${amount}_${upiId}_${minute}`;
}

function buildExistingSet(existing: Transaction[]): Set<string> {
  const set = new Set<string>();
  for (const t of existing) {
    if (t.dedupeKey) set.add(t.dedupeKey);
    set.add(fingerprint(t.amount, t.paidAt, t.upiId));
  }
  return set;
}

// Returns true when the stored name is a poor placeholder and the parsed name is a real full name.
function shouldUpdateRecipient(stored: string, parsed: string): boolean {
  if (!parsed || stored === parsed) return false;
  const storedIsPoor = stored === 'UPI Payment' || !stored.includes(' ');
  const parsedIsRicher = parsed.includes(' ') || parsed.length > stored.length;
  return storedIsPoor && parsedIsRicher;
}

function findExisting(txs: Transaction[], dedupeKey: string, fp: string): Transaction | undefined {
  return txs.find((t) => (t.dedupeKey && t.dedupeKey === dedupeKey) || fingerprint(t.amount, t.paidAt, t.upiId) === fp);
}

export async function syncSmsToMongo(
  sinceDate: Date = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
): Promise<{ scanned: number; found: number; imported: number }> {
  if (Platform.OS !== 'android') {
    throw new Error('SMS sync is only supported on Android.');
  }

  const SmsAndroid = getSmsModule();
  if (!SmsAndroid) {
    throw new Error(
      'Native SMS module not linked. Run "npx expo prebuild --platform android" then "npx expo run:android".'
    );
  }

  const granted = await requestSmsPermission();
  if (!granted) {
    throw new Error('SMS permission denied. Please allow it in device settings.');
  }

  const messages: { body: string; date: string }[] = await new Promise((resolve, reject) => {
    SmsAndroid.list(
      JSON.stringify({ box: 'inbox', minDate: sinceDate.getTime(), maxCount: 500 }),
      (fail: string) => reject(new Error(`Could not read SMS: ${fail}`)),
      (_count: number, smsList: string) => resolve(JSON.parse(smsList))
    );
  });

  const scanned = messages.length;

  const parsed = messages
    .map((msg) => parseUpiSms(msg.body, new Date(parseInt(msg.date, 10))))
    .filter(Boolean);

  if (parsed.length === 0) return { scanned, found: 0, imported: 0 };

  const candidates = parsed.map((p) => parsedToTransaction(p!));

  const existingTxs = await api.getTransactions({ source: 'sms', limit: 1000 });
  const existingSet = buildExistingSet(existingTxs);

  const nameRepairs: { id: string; recipient: string }[] = [];

  const newTransactions = candidates.filter((tx) => {
    const fp = fingerprint(tx.amount, tx.paidAt, tx.upiId);
    const isDupe =
      (tx.dedupeKey && existingSet.has(tx.dedupeKey)) ||
      existingSet.has(fp);

    if (isDupe) {
      // Fix stale "UPI Payment" / bare-username names now that we can extract a real name.
      const match = findExisting(existingTxs, tx.dedupeKey, fp);
      if (match && shouldUpdateRecipient(match.recipient, tx.recipient)) {
        nameRepairs.push({ id: match._id, recipient: tx.recipient });
      }
      return false;
    }
    return true;
  });

  // Patch stale recipient names in parallel (fire-and-forget errors).
  if (nameRepairs.length > 0) {
    await Promise.all(
      nameRepairs.map(({ id, recipient }) =>
        api.updateTransaction(id, { recipient }).catch(() => {})
      )
    );
  }

  if (newTransactions.length === 0) {
    return { scanned, found: parsed.length, imported: 0 };
  }

  const imported = await api.bulkAdd(newTransactions);
  return { scanned, found: parsed.length, imported };
}
