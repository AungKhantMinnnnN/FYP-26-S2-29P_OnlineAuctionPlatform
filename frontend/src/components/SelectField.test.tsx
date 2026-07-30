import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SelectField from './SelectField'

describe('SelectField', () => {
  it('renders the label', () => {
    render(<SelectField label="Condition" options={[]} />)
    expect(screen.getByText('Condition')).toBeInTheDocument()
  })

  it('associates the label with the select via htmlFor/id so getByLabelText works', () => {
    render(<SelectField label="Condition" options={[]} />)
    expect(screen.getByLabelText('Condition')).toBe(screen.getByRole('combobox'))
  })

  it('renders a disabled placeholder option when given', () => {
    render(<SelectField label="Condition" options={[]} placeholder="Select condition" />)
    const placeholderOption = screen.getByRole('option', { name: 'Select condition' })
    expect(placeholderOption).toBeDisabled()
  })

  it('renders string/number options as both value and label', () => {
    render(<SelectField label="Size" options={['S', 'M', 10]} />)
    expect(screen.getByRole('option', { name: 'S' })).toHaveValue('S')
    expect(screen.getByRole('option', { name: 'M' })).toHaveValue('M')
    expect(screen.getByRole('option', { name: '10' })).toHaveValue('10')
  })

  it('renders object options using their value/label pair', () => {
    render(<SelectField label="Category" options={[{ value: 'c1', label: 'Watches' }]} />)
    expect(screen.getByRole('option', { name: 'Watches' })).toHaveValue('c1')
  })

  it('falls back to an empty string for an object option missing value/label', () => {
    render(<SelectField label="Category" options={[{}]} />)
    const option = screen.getByRole('option') as HTMLOptionElement
    expect(option.value).toBe('')
    expect(option.textContent).toBe('')
  })

  it('forwards onChange', async () => {
    const onChange = vi.fn()
    render(<SelectField label="Size" value="S" onChange={onChange} options={['S', 'M']} />)
    await userEvent.selectOptions(screen.getByRole('combobox'), 'M')
    expect(onChange).toHaveBeenCalled()
  })
})
