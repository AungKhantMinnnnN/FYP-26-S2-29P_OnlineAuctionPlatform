import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FilterPanel from './FilterPanel'

const categories = [
  { id: 'c1', name: 'Watches', slug: 'watches', is_active: true },
  { id: 'c2', name: 'Coins', slug: 'coins', is_active: true },
]
const conditions = [
  { id: 'new', name: 'New' },
  { id: 'used', name: 'Used' },
]

function renderPanel(overrides: Partial<React.ComponentProps<typeof FilterPanel>> = {}) {
  const props: React.ComponentProps<typeof FilterPanel> = {
    categories,
    selectedCategory: null,
    onCategoryChange: vi.fn(),
    conditions,
    selectedCondition: null,
    onConditionChange: vi.fn(),
    minPrice: '',
    maxPrice: '',
    onPriceChange: vi.fn(),
    onClearAll: vi.fn(),
    ...overrides,
  }
  const utils = render(<FilterPanel {...props} />)
  return { ...utils, props }
}

describe('FilterPanel', () => {
  it('shows "No categories yet." when the category list is empty', () => {
    renderPanel({ categories: [] })
    expect(screen.getByText('No categories yet.')).toBeInTheDocument()
  })

  it('shows "No conditions yet." when the condition list is empty', () => {
    renderPanel({ conditions: [] })
    expect(screen.getByText('No conditions yet.')).toBeInTheDocument()
  })

  it('calls onCategoryChange with the category id when a category radio is picked', async () => {
    const { props } = renderPanel()
    await userEvent.click(screen.getByLabelText('Watches'))
    expect(props.onCategoryChange).toHaveBeenCalledWith('c1')
  })

  it('calls onCategoryChange with null when "All categories" is picked', async () => {
    const { props } = renderPanel({ selectedCategory: 'c1' })
    await userEvent.click(screen.getByLabelText('All categories'))
    expect(props.onCategoryChange).toHaveBeenCalledWith(null)
  })

  it('calls onConditionChange with the condition id when a condition radio is picked', async () => {
    const { props } = renderPanel()
    await userEvent.click(screen.getByLabelText('Used'))
    expect(props.onConditionChange).toHaveBeenCalledWith('used')
  })

  it('hides "Clear all" when no filters are active', () => {
    renderPanel()
    expect(screen.queryByText('Clear all')).toBeNull()
  })

  it('shows "Clear all" and calls onClearAll when a filter is active', async () => {
    const { props } = renderPanel({ selectedCategory: 'c1' })
    const clearButton = screen.getByText('Clear all')
    await userEvent.click(clearButton)
    expect(props.onClearAll).toHaveBeenCalledTimes(1)
  })

  it('collapses/expands a section on header click', async () => {
    renderPanel()
    expect(screen.getByLabelText('Watches')).toBeVisible()
    await userEvent.click(screen.getByText('Category'))
    expect(screen.queryByLabelText('Watches')).toBeNull()
    await userEvent.click(screen.getByText('Category'))
    expect(screen.getByLabelText('Watches')).toBeVisible()
  })

  it('applies a valid min/max price range', async () => {
    const { props } = renderPanel()
    await userEvent.type(screen.getByPlaceholderText('Min'), '10')
    await userEvent.type(screen.getByPlaceholderText('Max'), '100')
    await userEvent.click(screen.getByText('Apply'))
    expect(props.onPriceChange).toHaveBeenCalledWith('10', '100')
  })

  it('rejects a negative price with an inline error instead of calling onPriceChange', async () => {
    const { props } = renderPanel()
    await userEvent.type(screen.getByPlaceholderText('Min'), '-5')
    await userEvent.click(screen.getByText('Apply'))
    expect(screen.getByText('Enter valid non-negative amounts.')).toBeInTheDocument()
    expect(props.onPriceChange).not.toHaveBeenCalled()
  })

  it('rejects min > max with an inline error instead of calling onPriceChange', async () => {
    const { props } = renderPanel()
    await userEvent.type(screen.getByPlaceholderText('Min'), '100')
    await userEvent.type(screen.getByPlaceholderText('Max'), '10')
    await userEvent.click(screen.getByText('Apply'))
    expect(screen.getByText('Min must be less than or equal to max.')).toBeInTheDocument()
    expect(props.onPriceChange).not.toHaveBeenCalled()
  })

  it('treats an all-whitespace price input as empty rather than NaN', async () => {
    const { props } = renderPanel()
    await userEvent.type(screen.getByPlaceholderText('Min'), '   ')
    await userEvent.click(screen.getByText('Apply'))
    expect(screen.queryByText('Enter valid non-negative amounts.')).toBeNull()
    expect(props.onPriceChange).toHaveBeenCalledWith('', '')
  })

  it('re-syncs the price inputs when minPrice/maxPrice props change externally (e.g. cleared elsewhere)', () => {
    const { rerender, props } = renderPanel({ minPrice: '10', maxPrice: '50' })
    expect(screen.getByPlaceholderText('Min')).toHaveValue(10)
    rerender(<FilterPanel {...props} minPrice="" maxPrice="" />)
    expect(screen.getByPlaceholderText('Min')).toHaveValue(null)
    expect(screen.getByPlaceholderText('Max')).toHaveValue(null)
  })
})
