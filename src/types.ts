export interface Ticker {
  symbol: string
  base: string
  quote: string
  price: number
  prevPrice: number
  open: number
  high: number
  low: number
  baseVolume: number
  quoteVolume: number
  changePct: number
  eventTime: number
}
