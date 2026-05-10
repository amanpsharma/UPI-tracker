// Currency formatting helpers shared across screens.

// Compact form: ₹1.2L, ₹3.4k, ₹523
export function fmtShort(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${Math.round(n)}`;
}

// Full form with Indian locale grouping: ₹12,34,567
export function fmtFull(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`;
}
