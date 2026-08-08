import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { getErrorMessage, formatDate, formatDateTime, slugify, DetailRow, Pagination } from './adminShared'

describe('getErrorMessage', () => {
  it('extracts the backend detail message from an axios-style error', () => {
    const error = { response: { data: { detail: 'Username already taken' } } }
    expect(getErrorMessage(error, 'fallback')).toBe('Username already taken')
  })

  it('falls back when there is no response at all (network error)', () => {
    expect(getErrorMessage(new Error('network down'), 'fallback')).toBe('fallback')
  })

  it('falls back when response.data has no detail field', () => {
    const error = { response: { data: {} } }
    expect(getErrorMessage(error, 'fallback')).toBe('fallback')
  })

  it('falls back for null/undefined error', () => {
    expect(getErrorMessage(null, 'fallback')).toBe('fallback')
    expect(getErrorMessage(undefined, 'fallback')).toBe('fallback')
  })
})

describe('formatDate', () => {
  it('formats an ISO date as "DD Mon YYYY"', () => {
    expect(formatDate('2026-03-05T00:00:00Z')).toBe('05 Mar 2026')
  })

  it('returns "Not available" for null', () => {
    expect(formatDate(null)).toBe('Not available')
  })

  it('returns the raw string unchanged for an unparseable date', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date')
  })
})

describe('formatDateTime', () => {
  // formatDateTime never sets `timeZone`, so the clock time shown is the host
  // machine's local time, not Singapore time -- 'en-SG' only controls formatting
  // style. So this only asserts the (timezone-stable) date part and time shape.
  it('formats an ISO date with a 24h time (exact hour is host-timezone-dependent — see comment above)', () => {
    const result = formatDateTime('2026-03-05T14:30:00Z')
    expect(result).toContain('05 Mar 2026')
    expect(result).toMatch(/\d{2}:\d{2}:\d{2}$/)
  })

  it('returns "Not available" for null', () => {
    expect(formatDateTime(null)).toBe('Not available')
  })

  it('returns the raw string unchanged for an unparseable date', () => {
    expect(formatDateTime('garbage')).toBe('garbage')
  })
})

describe('slugify', () => {
  it('lowercases and hyphenates spaces', () => {
    expect(slugify('Vintage Watches')).toBe('vintage-watches')
  })

  it('trims and collapses non-alphanumeric runs into a single hyphen', () => {
    expect(slugify('  Coins & Currency!!  ')).toBe('coins-currency')
  })

  it('strips leading/trailing hyphens produced by punctuation at the edges', () => {
    expect(slugify('-- Antiques --')).toBe('antiques')
  })

  it('produces an empty string for input with no alphanumeric characters', () => {
    expect(slugify('!!!')).toBe('')
  })

  it('preserves existing numbers', () => {
    expect(slugify('Top 10 Picks')).toBe('top-10-picks')
  })
})

describe('DetailRow', () => {
  it('renders label and value', () => {
    render(<DetailRow label="Status" value="active" />)
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('active')).toBeInTheDocument()
  })

  it('applies the capitalize class by default', () => {
    render(<DetailRow label="Status" value="active" />)
    expect(screen.getByText('active')).toHaveClass('capitalize')
  })

  it('omits the capitalize class when preserveCapitalisation is set', () => {
    render(<DetailRow label="Email" value="Bob@Example.com" preserveCapitalisation />)
    expect(screen.getByText('Bob@Example.com')).not.toHaveClass('capitalize')
  })
})

describe('Pagination', () => {
  it('renders nothing when there is only one page', () => {
    const { container } = render(<Pagination page={1} pages={1} onPage={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when pages is 0', () => {
    const { container } = render(<Pagination page={1} pages={0} onPage={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the current page and total', () => {
    render(<Pagination page={2} pages={5} onPage={() => {}} />)
    expect(screen.getByText('Page 2 of 5')).toBeInTheDocument()
  })

  it('disables the previous button on the first page', () => {
    render(<Pagination page={1} pages={5} onPage={() => {}} />)
    const [prev] = screen.getAllByRole('button')
    expect(prev).toBeDisabled()
  })

  it('disables the next button on the last page', () => {
    render(<Pagination page={5} pages={5} onPage={() => {}} />)
    const [, next] = screen.getAllByRole('button')
    expect(next).toBeDisabled()
  })

  it('calls onPage with page-1 / page+1', async () => {
    const onPage = vi.fn()
    render(<Pagination page={3} pages={5} onPage={onPage} />)
    const [prev, next] = screen.getAllByRole('button')
    await userEvent.click(prev)
    expect(onPage).toHaveBeenCalledWith(2)
    await userEvent.click(next)
    expect(onPage).toHaveBeenCalledWith(4)
  })
})
