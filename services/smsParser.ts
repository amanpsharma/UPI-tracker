import { Category, Transaction } from '@/types';

interface ParsedPayment {
  amount: number;
  recipient: string;
  upiId: string;
  transactionId: string;
  paidAt: Date;
}

function extractAmount(body: string): number | null {
  // Matches: Rs.500, Rs 500, INR500, INR 500, ₹500 — with optional commas/decimals
  const match = body.match(/(?:Rs\.?\s*|INR\s*|₹\s*)([\d,]+(?:\.\d{1,2})?)/i);
  if (!match) return null;
  const amount = parseFloat(match[1].replace(/,/g, ''));
  return isNaN(amount) || amount <= 0 ? null : amount;
}

function extractUpiId(body: string): string | null {
  // UPI VPA is always localpart@provider, e.g. name@paytm, 9876543210@okicici
  // Exclude email-like patterns from headers (e.g. noreply@bank.com)
  const matches = body.match(/([a-zA-Z0-9._+\-]{2,}@[a-zA-Z]{2,15})/g);
  if (!matches) return null;
  // Prefer the first VPA that looks like a payment handle (short provider suffix)
  return matches[0];
}

function extractTransactionId(body: string): string {
  const match = body.match(
    /(?:UPI\s*Ref(?:erence)?\s*(?:No\.?|ID|#)?|Ref(?:erence)?\s*(?:No\.?|ID|#)?|Txn(?:\s*ID)?|Transaction\s*(?:ID|No\.?))\s*[:\-]?\s*([A-Z0-9]{6,})/i
  );
  return match ? match[1] : '';
}

function isUpiDebitSms(body: string): boolean {
  const hasDebitKeyword = /\b(?:debited|paid|sent|transferred)\b/i.test(body);
  // Must look like a UPI payment: has UPI/VPA/@  or explicitly says UPI
  const hasUpiSignal = /\b(?:upi|vpa)\b/i.test(body) || /@[a-zA-Z]{2,15}\b/.test(body);
  // Must have a rupee amount
  const hasAmount = /(?:Rs\.?\s*|INR\s*|₹\s*)[\d,]+/i.test(body);
  return hasDebitKeyword && hasUpiSignal && hasAmount;
}

export function parseUpiSms(body: string, date: Date): ParsedPayment | null {
  if (!isUpiDebitSms(body)) return null;

  const amount = extractAmount(body);
  if (!amount) return null;

  const upiId = extractUpiId(body);
  // Require at least a UPI ID or an explicit UPI mention
  if (!upiId && !/\bupi\b/i.test(body)) return null;

  const recipient = upiId ? upiId.split('@')[0] : 'UPI Payment';
  const transactionId = extractTransactionId(body);

  return { amount, recipient, upiId: upiId ?? '', transactionId, paidAt: date };
}

function makeDedupeKey(parsed: ParsedPayment): string {
  // Use bank-provided ref ID if available — most reliable
  if (parsed.transactionId) return `txn_${parsed.transactionId}`;
  // Fallback: amount + UPI ID + time truncated to the minute
  const minute = parsed.paidAt.toISOString().slice(0, 16);
  return `sms_${parsed.amount}_${parsed.upiId || parsed.recipient}_${minute}`;
}

export function parsedToTransaction(
  parsed: ParsedPayment
): Omit<Transaction, '_id' | 'createdAt'> {
  return {
    amount: parsed.amount,
    recipient: parsed.recipient,
    upiId: parsed.upiId,
    note: '',
    category: 'Other' as Category,
    source: 'sms',
    transactionId: parsed.transactionId,
    paidAt: parsed.paidAt.toISOString(),
    dedupeKey: makeDedupeKey(parsed),
  };
}
