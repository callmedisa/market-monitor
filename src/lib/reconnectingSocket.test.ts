import { describe, expect, it } from 'vitest'
import { backoffDelay } from './reconnectingSocket'

describe('backoffDelay', () => {
  it('grows exponentially with jitter between 50% and 100% of the step', () => {
    expect(backoffDelay(0, () => 0)).toBe(500)
    expect(backoffDelay(0, () => 1)).toBe(1000)
    expect(backoffDelay(3, () => 1)).toBe(8000)
  })

  it('is capped at the maximum', () => {
    expect(backoffDelay(20, () => 1)).toBe(30_000)
    expect(backoffDelay(20, () => 0)).toBe(15_000)
  })
})
