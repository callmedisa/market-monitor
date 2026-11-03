import { ReconnectingSocket } from './lib/reconnectingSocket'
import { parseMiniTickers, parseRestTickers } from './lib/parse'
import { TickerStore } from './store/tickerStore'

export const MINI_TICKER_URL = 'wss://stream.binance.com:9443/ws/!miniTicker@arr'

export const store = new TickerStore(250)

const socket = new ReconnectingSocket({
  url: MINI_TICKER_URL,
  onMessage: (raw) => store.push(parseMiniTickers(raw)),
  onStatus: (s) => store.setStatus(s),
})

/** The stream only carries symbols that changed in the last second, so seed the full list over REST. */
async function seed(signal: AbortSignal): Promise<void> {
  try {
    const res = await fetch('https://api.binance.com/api/v3/ticker/24hr?type=MINI', { signal })
    if (res.ok) store.push(parseRestTickers(await res.json()))
  } catch {
    // Non-fatal: the stream alone still fills the table over time.
  }
}

/** Starts the shared feed; returns a stop function (safe under StrictMode double-mount). */
export function startFeed(): () => void {
  const ctrl = new AbortController()
  socket.start()
  void seed(ctrl.signal)
  return () => {
    ctrl.abort()
    socket.stop()
  }
}
