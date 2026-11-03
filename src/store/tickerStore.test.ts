import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Ticker } from '../types'
import { TickerStore } from './tickerStore'

const t = (symbol: string, price: number): Ticker => ({
  symbol, base: symbol, quote: 'USDT', price, prevPrice: price, open: price, high: price, low: price,
  baseVolume: 0, quoteVolume: 0, changePct: 0, eventTime: 0,
})

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('TickerStore', () => {
  it('coalesces many updates into a single notification per flush', () => {
    const store = new TickerStore(250)
    const listener = vi.fn()
    store.subscribe(listener)

    for (let i = 0; i < 1000; i++) store.push([t('BTC', 100 + i)])
    expect(listener).not.toHaveBeenCalled()

    vi.advanceTimersByTime(250)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(store.getSnapshot().tickers).toHaveLength(1)
    expect(store.getSnapshot().tickers[0].price).toBe(1099)
  })

  it('tracks the previous price across flushes', () => {
    const store = new TickerStore(10)
    store.push([t('ETH', 100)])
    vi.advanceTimersByTime(10)
    store.push([t('ETH', 105)])
    vi.advanceTimersByTime(10)
    const [eth] = store.getSnapshot().tickers
    expect([eth.prevPrice, eth.price]).toEqual([100, 105])
  })

  it('keeps object identity for symbols that did not update', () => {
    const store = new TickerStore(10)
    store.push([t('A', 1), t('B', 1)])
    vi.advanceTimersByTime(10)
    const before = store.getSnapshot().tickers.find((x) => x.symbol === 'A')
    store.push([t('B', 2)])
    vi.advanceTimersByTime(10)
    const after = store.getSnapshot().tickers.find((x) => x.symbol === 'A')
    expect(after).toBe(before)
  })

  it('only notifies on a real status change', () => {
    const store = new TickerStore()
    const listener = vi.fn()
    store.subscribe(listener)
    store.setStatus('connecting')
    expect(listener).not.toHaveBeenCalled()
    store.setStatus('open')
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
