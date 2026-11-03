import type { ConnectionStatus } from '../lib/reconnectingSocket'
import type { Ticker } from '../types'

export interface MarketState {
  tickers: readonly Ticker[]
  status: ConnectionStatus
  lastUpdate: number
}

/**
 * External store for React's useSyncExternalStore.
 *
 * Socket messages arrive far more often than the UI needs to paint, so updates are
 * coalesced per symbol into `pending` and flushed on a fixed interval. Tickers that
 * did not change keep their object identity, so memoized rows skip re-rendering.
 */
export class TickerStore {
  private readonly bySymbol = new Map<string, Ticker>()
  private readonly pending = new Map<string, Ticker>()
  private readonly listeners = new Set<() => void>()
  private readonly flushMs: number
  private timer: ReturnType<typeof setTimeout> | null = null
  private state: MarketState = { tickers: [], status: 'connecting', lastUpdate: 0 }

  constructor(flushMs = 250) {
    this.flushMs = flushMs
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = (): MarketState => this.state

  push(updates: Ticker[]): void {
    if (updates.length === 0) return
    for (const u of updates) this.pending.set(u.symbol, u)
    if (!this.timer) this.timer = setTimeout(() => this.flush(), this.flushMs)
  }

  flush(): void {
    this.timer = null
    if (this.pending.size === 0) return
    for (const [symbol, next] of this.pending) {
      const prev = this.bySymbol.get(symbol)
      this.bySymbol.set(symbol, { ...next, prevPrice: prev ? prev.price : next.price })
    }
    this.pending.clear()
    this.state = { ...this.state, tickers: [...this.bySymbol.values()], lastUpdate: Date.now() }
    this.emit()
  }

  setStatus(status: ConnectionStatus): void {
    if (status === this.state.status) return
    this.state = { ...this.state, status }
    this.emit()
  }

  dispose(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    this.pending.clear()
  }

  private emit(): void {
    for (const l of this.listeners) l()
  }
}
