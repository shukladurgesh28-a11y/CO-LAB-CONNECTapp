/** Display-only formatting. Money math always comes from the backend. */
export function inr(value?: number | string | null): string {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return '₹0.00';
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function prettyStatus(status?: string): string {
  return (status || '—').replaceAll('_', ' ');
}

export function shortDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso).slice(0, 10) : d.toLocaleDateString('en-IN');
}
