export type ConnectionStatus = 'connecting' | 'open' | 'reconnecting' | 'closed'

/** Exponential backoff with "equal jitter": half fixed, half random, capped at `max`. */
export function backoffDelay(
  attempt: number,
  random: () => number = Math.random,
  base = 1000,
  max = 30_000,
): number {
  const exp = Math.min(max, base * 2 ** attempt)
  return Math.round(exp / 2 + (random() * exp) / 2)
}

interface Options {
  url: string
  onMessage: (data: string) => void
  onStatus?: (status: ConnectionStatus) => void
  /** Reconnect if nothing arrives for this long (half-open TCP connections never fire `close`). */
  staleAfterMs?: number
}

export class ReconnectingSocket {
  private readonly opts: Options
  private ws: WebSocket | null = null
  private attempt = 0
  private stopped = true
  private lastMessageAt = 0
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private watchdog: ReturnType<typeof setInterval> | null = null

  constructor(opts: Options) {
    this.opts = opts
  }

  start(): void {
    if (!this.stopped) return
    this.stopped = false
    this.attempt = 0
    window.addEventListener('online', this.onOnline)
    this.connect()
  }

  stop(): void {
    this.stopped = true
    window.removeEventListener('online', this.onOnline)
    this.clearTimers()
    const ws = this.ws
    this.ws = null
    if (ws) {
      ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null
      ws.close()
    }
    this.opts.onStatus?.('closed')
  }

  private connect(): void {
    this.opts.onStatus?.(this.attempt === 0 ? 'connecting' : 'reconnecting')
    const ws = new WebSocket(this.opts.url)
    this.ws = ws

    ws.onopen = () => {
      if (this.ws !== ws) return
      this.attempt = 0
      this.lastMessageAt = Date.now()
      this.opts.onStatus?.('open')
      this.startWatchdog()
    }
    ws.onmessage = (e) => {
      if (this.ws !== ws) return
      this.lastMessageAt = Date.now()
      this.opts.onMessage(String(e.data))
    }
    ws.onclose = () => {
      if (this.ws !== ws) return
      this.dropAndRetry()
    }
    ws.onerror = () => ws.close()
  }

  private dropAndRetry(): void {
    const ws = this.ws
    this.ws = null
    if (ws) {
      ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null
      ws.close()
    }
    this.clearTimers()
    if (this.stopped) return
    this.opts.onStatus?.('reconnecting')
    this.retryTimer = setTimeout(() => this.connect(), backoffDelay(this.attempt++))
  }

  private startWatchdog(): void {
    const staleAfter = this.opts.staleAfterMs ?? 15_000
    this.watchdog = setInterval(() => {
      if (Date.now() - this.lastMessageAt > staleAfter) this.dropAndRetry()
    }, 5000)
  }

  private clearTimers(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer)
    if (this.watchdog) clearInterval(this.watchdog)
    this.retryTimer = this.watchdog = null
  }

  private onOnline = (): void => {
    // Network is back: don't wait out the remaining backoff.
    if (!this.stopped && !this.ws) {
      this.clearTimers()
      this.attempt = 0
      this.connect()
    }
  }
}
