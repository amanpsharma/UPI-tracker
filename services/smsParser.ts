import { MERCHANT_CATEGORY_MAP } from '@/constants';
import { Category, Transaction, TransactionType } from '@/types';

function suggestCategory(recipient: string, upiId: string): Category {
  const text = `${recipient} ${upiId}`.toLowerCase();
  for (const { pattern, category } of MERCHANT_CATEGORY_MAP) {
    if (pattern.test(text)) return category;
  }
  return 'Other';
}

interface ParsedPayment {
  amount: number;
  recipient: string;
  upiId: string;
  transactionId: string;
  paidAt: Date;
  type: TransactionType;
}

function extractAmount(body: string): number | null {
  const match = body.match(/(?:Rs\.?\s*|INR\s*|₹\s*)([\d,]+(?:\.\d{1,2})?)/i);
  if (!match) return null;
  const amount = parseFloat(match[1].replace(/,/g, ''));
  return isNaN(amount) || amount <= 0 ? null : amount;
}

function extractUpiId(body: string): string | null {
  const matches = body.match(/([a-zA-Z0-9._+\-]{2,}@[a-zA-Z]{2,15})/g);
  if (!matches) return null;
  return matches[0];
}

// "To Shree Dev narayan Panipur On" / "to Priya Sharma UPI" / "to Raj Kumar Ref"
// Also: Axis/HDFC format "UPI/P2A/612472427368/MANISH KUMAR SHARMA Not you?"
function extractRecipientName(body: string): string | null {
  // Axis Bank / inline UPI format: UPI/P2A|P2P|P2M/<txnId>/<NAME>
  const axisMatch = body.match(/UPI\/P2[A-Z]\/\d+\/([A-Z][A-Z\s]+?)(?=\s+[A-Z][a-z]|\s*$)/);
  if (axisMatch) {
    const name = axisMatch[1].trim();
    if (name.length >= 2 && name.length <= 60) return name;
  }
  // HDFC / standard format: "To <Name> On|At|via|Ref|..."
  const toMatch = body.match(/\bTo\s+([A-Za-z][A-Za-z\s]+?)\s+(?:On|At|via|Ref|UPI|\d{2}[\/\-])/i);
  if (toMatch) {
    const name = toMatch[1].trim();
    if (name.length >= 2 && name.length <= 50) return name;
  }
  return null;
}

// "from Priya Sharma via" / "by Raj Kumar UPI" / "from user on"
function extractSenderName(body: string): string | null {
  const match = body.match(/\b(?:from|by)\s+([A-Za-z][A-Za-z\s]+?)\s+(?:via|on|UPI|Ref|\d{2}[\/\-])/i);
  if (!match) return null;
  const name = match[1].trim();
  return name.length >= 2 && name.length <= 50 ? name : null;
}

function extractTransactionId(body: string): string {
  // Axis Bank format: UPI/P2A/612472427368/NAME
  const axisMatch = body.match(/UPI\/P2[A-Z]\/(\d{8,})\//i);
  if (axisMatch) return axisMatch[1];
  // Standard: "UPI Ref 123456", "Ref No 123456", "Txn ID 123456"
  const match = body.match(
    /(?:UPI\s*Ref(?:erence)?\s*(?:No\.?|ID|#)?|Ref(?:erence)?\s*(?:No\.?|ID|#)?|Txn(?:\s*ID)?|Transaction\s*(?:ID|No\.?))\s*[:\-]?\s*([A-Z0-9]{6,})/i
  );
  return match ? match[1] : '';
}

function hasUpiSignal(body: string): boolean {
  return /\b(?:upi|vpa)\b/i.test(body) || /@[a-zA-Z]{2,15}\b/.test(body);
}

function hasRupeeAmount(body: string): boolean {
  return /(?:Rs\.?\s*|INR\s*|₹\s*)[\d,]+/i.test(body);
}

function isUpiDebitSms(body: string): boolean {
  return (
    /\b(?:debited|paid|sent|transferred)\b/i.test(body) &&
    hasUpiSignal(body) &&
    hasRupeeAmount(body)
  );
}

function isUpiCreditSms(body: string): boolean {
  return (
    /\b(?:credited|received|credit)\b/i.test(body) &&
    hasUpiSignal(body) &&
    hasRupeeAmount(body)
  );
}

export function parseUpiSms(body: string, date: Date): ParsedPayment | null {
  const isDebit = isUpiDebitSms(body);
  const isCredit = !isDebit && isUpiCreditSms(body);
  if (!isDebit && !isCredit) return null;

  const type: TransactionType = isDebit ? 'sent' : 'received';

  const amount = extractAmount(body);
  if (!amount) return null;

  const upiId = extractUpiId(body);
  if (!upiId && !/\bupi\b/i.test(body)) return null;

  let recipient: string;
  if (isDebit) {
    recipient = extractRecipientName(body) ?? (upiId ? upiId.split('@')[0] : 'UPI Payment');
  } else {
    recipient = extractSenderName(body) ?? (upiId ? upiId.split('@')[0] : 'UPI Credit');
  }

  const transactionId = extractTransactionId(body);
  return { amount, recipient, upiId: upiId ?? '', transactionId, paidAt: date, type };
}

function makeDedupeKey(parsed: ParsedPayment): string {
  if (parsed.transactionId) return `txn_${parsed.transactionId}`;
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
    category: suggestCategory(parsed.recipient, parsed.upiId),
    source: 'sms',
    type: parsed.type,
    transactionId: parsed.transactionId,
    paidAt: parsed.paidAt.toISOString(),
    dedupeKey: makeDedupeKey(parsed),
  };
}
