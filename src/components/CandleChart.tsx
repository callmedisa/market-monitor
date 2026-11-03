import { useEffect, useRef, useState } from 'react'
import {
  CandlestickSeries,
  ColorType,
  createChart,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts'
import { ReconnectingSocket } from '../lib/reconnectingSocket'

const INTERVALS = ['1m', '5m', '15m', '1h'] as const
type Interval = (typeof INTERVALS)[number]

type Kline = [number, string, string, string, string, ...unknown[]]

const toCandle = (t: number, o: string, h: string, l: string, c: string): CandlestickData => ({
  time: (t / 1000) as UTCTimestamp,
  open: Number(o),
  high: Number(h),
  low: Number(l),
  close: Number(c),
})

export function CandleChart({ symbol }: { symbol: string }) {
  const host = useRef<HTMLDivElement>(null)
  const chart = useRef<IChartApi | null>(null)
  const series = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const [interval, setInterval] = useState<Interval>('1m')
  const [state, setState] = useState<'loading' | 'live' | 'error'>('loading')

  useEffect(() => {
    const c = createChart(host.current!, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#9aa4b2' },
      grid: { vertLines: { color: '#1c2430' }, horzLines: { color: '#1c2430' } },
      rightPriceScale: { borderColor: '#2a3442' },
      timeScale: { borderColor: '#2a3442', timeVisible: true },
    })
    chart.current = c
    series.current = c.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      borderVisible: false,
    })
    return () => {
      c.remove()
      chart.current = series.current = null
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    let socket: ReconnectingSocket | null = null
    const ctrl = new AbortController()
    setState('loading')

    ;(async () => {
      try {
        const res = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=500`,
          { signal: ctrl.signal },
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const klines = (await res.json()) as Kline[]
        if (cancelled || !series.current) return
        series.current.setData(klines.map((k) => toCandle(k[0], k[1], k[2], k[3], k[4])))
        chart.current?.timeScale().fitContent()

        // Subscribe only after history is in place, so live ticks never precede it.
        socket = new ReconnectingSocket({
          url: `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`,
          onStatus: (s) => !cancelled && s === 'open' && setState('live'),
          onMessage: (raw) => {
            const k = (JSON.parse(raw) as { k?: { t: number; o: string; h: string; l: string; c: string } }).k
            if (k && !cancelled) series.current?.update(toCandle(k.t, k.o, k.h, k.l, k.c))
          },
        })
        socket.start()
      } catch (e) {
        if (!cancelled && (e as Error).name !== 'AbortError') setState('error')
      }
    })()

    return () => {
      cancelled = true
      ctrl.abort()
      socket?.stop()
    }
  }, [symbol, interval])

  return (
    <div className="chart">
      <div className="chart-bar">
        <strong>{symbol}</strong>
        <span className={`dot ${state}`} title={state} />
        <div className="seg">
          {INTERVALS.map((i) => (
            <button key={i} className={i === interval ? 'on' : ''} onClick={() => setInterval(i)}>
              {i}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-host" ref={host} />
      {state === 'error' && <p className="empty">Could not load candles for {symbol}.</p>}
    </div>
  )
}
