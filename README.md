# Market Monitor

Real-time crypto market dashboard built with React 19, TypeScript and Vite. It streams the full Binance spot market (3,700+ pairs) over WebSocket, renders it in a sortable, filterable virtualized table, and shows a live candlestick chart for the selected pair. Only public market-data endpoints are used, with no API keys.

## What it demonstrates

| Concern | Approach |
|---|---|
| **Real-time updates** | Native WebSocket to `!miniTicker@arr` for the table and `<symbol>@kline_<interval>` for the chart; REST snapshot seeds the initial state. |
| **Connection resilience** | `ReconnectingSocket`: exponential backoff with jitter, stale-connection watchdog (half-open sockets), immediate retry on the browser's `online` event, safe stop/start under React StrictMode. |
| **Render performance** | Incoming messages are coalesced per symbol and flushed every 250 ms into a `useSyncExternalStore` store. Unchanged tickers keep object identity, so memoized rows skip re-rendering. |
| **Large data sets** | TanStack Virtual renders ~30 DOM rows out of 3,700+; TanStack Table handles sorting; search uses `useDeferredValue` to keep typing responsive. |
| **Live visual feedback** | Price cells flash green/red on change (CSS animation restarted by keying on the price, only for visible rows). |
| **Charting** | lightweight-charts candlesticks: 500-candle history over REST, then live `update()` from the kline stream. History loads first so ticks never precede it; stale responses are cancelled on symbol/interval change. |
| **Robust parsing** | Malformed messages and rows are dropped, never thrown. Unit-tested. |

## Run

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # vitest
npm run build
```

## Structure

```
src/
  feed.ts                       shared store + socket wiring, REST seed
  lib/reconnectingSocket.ts     WebSocket with backoff, watchdog, online-retry
  lib/parse.ts                  stream/REST payload -> Ticker
  store/tickerStore.ts          batched external store for useSyncExternalStore
  components/TickerTable.tsx    virtualized, sortable table
  components/CandleChart.tsx    live candlestick chart
```

## Possible next steps

- Move parsing and sorting into a Web Worker for heavier feeds.
- Order-book depth view and a watchlist persisted in `localStorage`.
- E2E test with a mocked WebSocket server.

Data: [Binance public market data](https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams). Not financial advice.
