import { useDeferredValue, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { CandleChart } from './components/CandleChart'
import { TickerTable } from './components/TickerTable'
import { startFeed, store } from './feed'

const QUOTE_FILTERS = ['USDT', 'USDC', 'FDUSD', 'BTC', 'ETH', 'BNB', 'ALL'] as const

export default function App() {
  const { tickers, status, lastUpdate } = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const [search, setSearch] = useState('')
  const [quote, setQuote] = useState<string>('USDT')
  const [selected, setSelected] = useState('BTCUSDT')
  const deferredSearch = useDeferredValue(search)

  useEffect(() => startFeed(), [])

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toUpperCase()
    return tickers.filter(
      (t) => (quote === 'ALL' || t.quote === quote) && (!q || t.symbol.includes(q)),
    )
  }, [tickers, deferredSearch, quote])

  return (
    <div className="app">
      <header>
        <h1>Market Monitor</h1>
        <span className={`status ${status}`}>
          <i /> {status}
        </span>
        <span className="muted">
          {tickers.length} pairs · updated {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : '—'}
        </span>
      </header>

      <main>
        <section className="panel">
          <div className="filters">
            <input
              type="search"
              placeholder="Search pair, e.g. SOL"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="seg">
              {QUOTE_FILTERS.map((q) => (
                <button key={q} className={q === quote ? 'on' : ''} onClick={() => setQuote(q)}>
                  {q}
                </button>
              ))}
            </div>
            <span className="muted">
              {filtered.length} / {tickers.length}
            </span>
          </div>
          {tickers.length === 0 ? (
            <p className="empty">Waiting for market data…</p>
          ) : (
            <TickerTable data={filtered} selected={selected} onSelect={setSelected} />
          )}
        </section>

        <section className="panel">
          <CandleChart symbol={selected} />
        </section>
      </main>
    </div>
  )
}
