import { describe, expect, it } from 'vitest'
import { parseMiniTickers, splitSymbol } from './parse'

const row = (s: string, c: string, o: string) => ({ E: 1, s, c, o, h: c, l: o, v: '1', q: '2' })

describe('splitSymbol', () => {
  it('splits known quote assets', () => {
    expect(splitSymbol('BTCUSDT')).toEqual({ base: 'BTC', quote: 'USDT' })
    expect(splitSymbol('ETHBTC')).toEqual({ base: 'ETH', quote: 'BTC' })
    expect(splitSymbol('SOLFDUSD')).toEqual({ base: 'SOL', quote: 'FDUSD' })
  })

  it('does not treat the whole symbol as a quote', () => {
    expect(splitSymbol('BTC')).toEqual({ base: 'BTC', quote: 'OTHER' })
  })
})

describe('parseMiniTickers', () => {
  it('computes 24h change from open and close', () => {
    const [t] = parseMiniTickers(JSON.stringify([row('BTCUSDT', '110', '100')]))
    expect(t.price).toBe(110)
    expect(t.changePct).toBeCloseTo(10)
  })

  it('drops malformed JSON, non-arrays and bad rows instead of throwing', () => {
    expect(parseMiniTickers('not json')).toEqual([])
    expect(parseMiniTickers('{"a":1}')).toEqual([])
    const out = parseMiniTickers(JSON.stringify([row('BADUSDT', 'x', '1'), row('GOODUSDT', '2', '1')]))
    expect(out.map((t) => t.symbol)).toEqual(['GOODUSDT'])
  })
})
