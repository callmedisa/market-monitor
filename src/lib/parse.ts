import type { Ticker } from '../types'

// Longest first so FDUSD wins over USD-like suffixes.
const QUOTES = ['FDUSD', 'USDT', 'USDC', 'TUSD', 'BUSD', 'USDP', 'BTC', 'ETH', 'BNB', 'EUR', 'TRY', 'BRL', 'JPY', 'GBP']

export function splitSymbol(symbol: string): { base: string; quote: string } {
  for (const q of QUOTES) {
    if (symbol.endsWith(q) && symbol.length > q.length) {
      return { base: symbol.slice(0, -q.length), quote: q }
    }
  }
  return { base: symbol, quote: 'OTHER' }
}

interface RawMiniTicker {
  E: number
  s: string
  c: string
  o: string
  h: string
  l: string
  v: string
  q: string
}

/** Parses a `!miniTicker@arr` payload. Malformed messages and rows are dropped, never thrown. */
export function parseMiniTickers(raw: string): Ticker[] {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(data)) return []

  const out: Ticker[] = []
  for (const r of data as RawMiniTicker[]) {
    const price = Number(r.c)
    const open = Number(r.o)
    if (!r.s || !Number.isFinite(price) || !Number.isFinite(open)) continue
    const { base, quote } = splitSymbol(r.s)
    out.push({
      symbol: r.s,
      base,
      quote,
      price,
      prevPrice: price,
      open,
      high: Number(r.h),
      low: Number(r.l),
      baseVolume: Number(r.v),
      quoteVolume: Number(r.q),
      changePct: open > 0 ? ((price - open) / open) * 100 : 0,
      eventTime: r.E,
    })
  }
  return out
}

interface RawRestTicker {
  symbol: string
  lastPrice: string
  openPrice: string
  highPrice: string
  lowPrice: string
  volume: string
  quoteVolume: string
  closeTime: number
}

/** Parses the REST `/ticker/24hr?type=MINI` snapshot used to seed the table before the stream catches up. */
export function parseRestTickers(rows: RawRestTicker[]): Ticker[] {
  const out: Ticker[] = []
  for (const r of rows) {
    const price = Number(r.lastPrice)
    const open = Number(r.openPrice)
    if (!r.symbol || !Number.isFinite(price) || !Number.isFinite(open)) continue
    const { base, quote } = splitSymbol(r.symbol)
    out.push({
      symbol: r.symbol,
      base,
      quote,
      price,
      prevPrice: price,
      open,
      high: Number(r.highPrice),
      low: Number(r.lowPrice),
      baseVolume: Number(r.volume),
      quoteVolume: Number(r.quoteVolume),
      changePct: open > 0 ? ((price - open) / open) * 100 : 0,
      eventTime: r.closeTime,
    })
  }
  return out
}
