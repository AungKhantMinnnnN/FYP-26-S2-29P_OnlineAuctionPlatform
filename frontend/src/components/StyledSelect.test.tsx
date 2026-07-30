import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StyledSelect from './StyledSelect'

describe('StyledSelect', () => {
  it('renders its option children', () => {
    render(
      <StyledSelect value="b" onChange={() => {}}>
        <option value="a">A</option>
        <option value="b">B</option>
      </StyledSelect>
    )
    expect(screen.getByRole('combobox')).toHaveValue('b')
    expect(screen.getByRole('option', { name: 'A' })).toBeInTheDocument()
  })

  it('forwards onChange', async () => {
    const onChange = vi.fn()
    render(
      <StyledSelect value="a" onChange={onChange}>
        <option value="a">A</option>
        <option value="b">B</option>
      </StyledSelect>
    )
    await userEvent.selectOptions(screen.getByRole('combobox'), 'b')
    expect(onChange).toHaveBeenCalled()
  })

  it('applies wrapperClassName to the wrapper div, not the select', () => {
    const { container } = render(
      <StyledSelect wrapperClassName="mt-4" value="a" onChange={() => {}}>
        <option value="a">A</option>
      </StyledSelect>
    )
    expect(container.querySelector('div.mt-4')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).not.toHaveClass('mt-4')
  })

  it('forwards arbitrary native select props (e.g. disabled)', () => {
    render(
      <StyledSelect value="a" onChange={() => {}} disabled>
        <option value="a">A</option>
      </StyledSelect>
    )
    expect(screen.getByRole('combobox')).toBeDisabled()
  })
})
