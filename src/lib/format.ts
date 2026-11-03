const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 2 })

export const formatCompact = (n: number): string => (Number.isFinite(n) ? compact.format(n) : '—')

export function formatPrice(n: number): string {
  if (!Number.isFinite(n)) return '—'
  const digits = n >= 1000 ? 2 : n >= 1 ? 4 : n >= 0.01 ? 5 : 8
  return n.toLocaleString('en', { minimumFractionDigits: digits > 4 ? 0 : digits, maximumFractionDigits: digits })
}

export function formatPct(n: number): string {
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}
