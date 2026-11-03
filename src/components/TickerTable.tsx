import { memo, useMemo, useRef, useState } from 'react'
import {
  type ColumnDef,
  type SortingState,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { formatCompact, formatPct, formatPrice } from '../lib/format'
import type { Ticker } from '../types'

const ROW_HEIGHT = 34

interface Col {
  id: keyof Ticker
  label: string
  align?: 'right'
}

const COLS: Col[] = [
  { id: 'symbol', label: 'Pair' },
  { id: 'price', label: 'Last price', align: 'right' },
  { id: 'changePct', label: '24h %', align: 'right' },
  { id: 'high', label: '24h high', align: 'right' },
  { id: 'low', label: '24h low', align: 'right' },
  { id: 'quoteVolume', label: 'Volume (quote)', align: 'right' },
]

const columns: ColumnDef<Ticker>[] = COLS.map((c) => ({
  id: c.id,
  accessorKey: c.id,
  header: c.label,
  sortDescFirst: c.id !== 'symbol',
}))

const GRID = 'minmax(110px,1.2fr) repeat(5,minmax(0,1fr))'

const Row = memo(function Row({
  ticker,
  selected,
  top,
  onSelect,
}: {
  ticker: Ticker
  selected: boolean
  top: number
  onSelect: (symbol: string) => void
}) {
  const dir = ticker.price > ticker.prevPrice ? 'up' : ticker.price < ticker.prevPrice ? 'down' : ''
  return (
    <div
      className={`row${selected ? ' selected' : ''}`}
      style={{ gridTemplateColumns: GRID, height: ROW_HEIGHT, transform: `translateY(${top}px)` }}
      onClick={() => onSelect(ticker.symbol)}
      role="row"
    >
      <span className="sym">
        {ticker.base}
        <small>/{ticker.quote}</small>
      </span>
      {/* key on price restarts the CSS flash animation only when the price actually changed */}
      <span key={ticker.price} className={`num flash ${dir}`}>
        {formatPrice(ticker.price)}
      </span>
      <span className={`num ${ticker.changePct >= 0 ? 'pos' : 'neg'}`}>{formatPct(ticker.changePct)}</span>
      <span className="num">{formatPrice(ticker.high)}</span>
      <span className="num">{formatPrice(ticker.low)}</span>
      <span className="num">{formatCompact(ticker.quoteVolume)}</span>
    </div>
  )
})

export function TickerTable({
  data,
  selected,
  onSelect,
}: {
  data: readonly Ticker[]
  selected: string
  onSelect: (symbol: string) => void
}) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'quoteVolume', desc: true }])
  const scrollRef = useRef<HTMLDivElement>(null)

  const rows = useMemo(() => data as Ticker[], [data])
  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getRowId: (r) => r.symbol,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })
  const sorted = table.getRowModel().rows

  const virtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  })

  return (
    <div className="table" role="table">
      <div className="row head" style={{ gridTemplateColumns: GRID }} role="row">
        {table.getHeaderGroups()[0].headers.map((h, i) => {
          const dir = h.column.getIsSorted()
          return (
            <button
              key={h.id}
              className={`th${COLS[i].align ? ' num' : ''}`}
              onClick={h.column.getToggleSortingHandler()}
              aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none'}
            >
              {COLS[i].label}
              <i>{dir === 'asc' ? '▲' : dir === 'desc' ? '▼' : ''}</i>
            </button>
          )
        })}
      </div>
      <div className="body" ref={scrollRef}>
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map((v) => {
            const t = sorted[v.index].original
            return (
              <Row
                key={t.symbol}
                ticker={t}
                selected={t.symbol === selected}
                top={v.start}
                onSelect={onSelect}
              />
            )
          })}
        </div>
        {sorted.length === 0 && <p className="empty">No pairs match the current filters.</p>}
      </div>
    </div>
  )
}
