import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AnalyticsRouteTracker } from './AnalyticsRouteTracker'
import { analytics } from './analytics'

vi.mock('./analytics', () => ({
  analytics: { pageView: vi.fn() },
}))

describe('analytics routing', () => {
  it('tracks initial page and client-side route changes once, not query-only navigation', async () => {
    render(
      <MemoryRouter initialEntries={['/?email=buyer@example.com']}>
        <AnalyticsRouteTracker />
        <Routes>
          <Route path="/" element={<Link to="/cart">Open cart</Link>} />
          <Route path="/cart" element={<Link to="/cart?token=secret">Query only</Link>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(analytics.pageView).toHaveBeenCalledTimes(1)
    expect(analytics.pageView).toHaveBeenLastCalledWith('/')
    await userEvent.click(screen.getByRole('link', { name: 'Open cart' }))
    expect(analytics.pageView).toHaveBeenCalledTimes(2)
    expect(analytics.pageView).toHaveBeenLastCalledWith('/cart')
    await userEvent.click(screen.getByRole('link', { name: 'Query only' }))
    expect(analytics.pageView).toHaveBeenCalledTimes(2)
  })
})
