import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { BarChart } from '@/features/analytics/BarChart'

describe('BarChart', () => {
  it('shows the empty text when every total is zero', () => {
    render(<BarChart totals={[{ label: 'Petrol', amount: 0 }]} emptyText="No data yet." />)
    expect(screen.getByText('No data yet.')).toBeInTheDocument()
  })

  it('shows the empty text with no totals at all', () => {
    render(<BarChart totals={[]} emptyText="No data yet." />)
    expect(screen.getByText('No data yet.')).toBeInTheDocument()
  })

  it('renders a labeled row with its formatted amount for each total', () => {
    render(
      <BarChart
        totals={[
          { label: 'Petrol', amount: 900 },
          { label: 'Egg', amount: 300 },
        ]}
        emptyText="No data yet."
      />,
    )
    expect(screen.getByText('Petrol')).toBeInTheDocument()
    expect(screen.getByText('₹900.00')).toBeInTheDocument()
    expect(screen.getByText('Egg')).toBeInTheDocument()
    expect(screen.getByText('₹300.00')).toBeInTheDocument()
  })

  it('scales the largest bar to 100% width', () => {
    const { container } = render(
      <BarChart
        totals={[
          { label: 'Petrol', amount: 900 },
          { label: 'Egg', amount: 450 },
        ]}
        emptyText="No data yet."
      />,
    )
    const fills = container.querySelectorAll('.bg-primary')
    expect(fills[0]).toHaveStyle({ width: '100%' })
    expect(fills[1]).toHaveStyle({ width: '50%' })
  })
})
