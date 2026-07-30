import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Search } from 'lucide-react'
import FormInput from './FormInput'

describe('FormInput', () => {
  it('renders a label when provided', () => {
    render(<FormInput label="Email" value="" onChange={() => {}} />)
    expect(screen.getByText('Email')).toBeInTheDocument()
  })

  it('omits the label element when none is provided', () => {
    const { container } = render(<FormInput value="" onChange={() => {}} />)
    expect(container.querySelector('label')).toBeNull()
  })

  it('associates the label with the input via htmlFor/id so getByLabelText works', () => {
    render(<FormInput label="Email" value="" onChange={() => {}} />)
    expect(screen.getByLabelText('Email')).toBe(screen.getByRole('textbox'))
  })

  it('respects an explicit id prop instead of the generated one', () => {
    render(<FormInput label="Email" id="custom-id" value="" onChange={() => {}} />)
    expect(screen.getByLabelText('Email')).toHaveAttribute('id', 'custom-id')
  })

  it('shows the error message and applies error styling', () => {
    render(<FormInput label="Email" value="" onChange={() => {}} error="Required" />)
    expect(screen.getByText('Required')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveClass('border-red-300')
  })

  it('applies default styling when there is no error', () => {
    render(<FormInput value="" onChange={() => {}} />)
    expect(screen.getByRole('textbox')).toHaveClass('border-slate-200')
    expect(screen.getByRole('textbox')).not.toHaveClass('border-red-300')
  })

  it('renders the icon and adds left padding to make room for it', () => {
    const { container } = render(<FormInput value="" onChange={() => {}} icon={Search} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveClass('pl-10')
  })

  it('calls onChange as the user types', async () => {
    const handleChange = vi.fn()
    function Controlled() {
      const [value, setValue] = useState('')
      return (
        <FormInput
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            handleChange(e.target.value)
          }}
        />
      )
    }
    render(<Controlled />)
    await userEvent.type(screen.getByRole('textbox'), 'hi')
    expect(handleChange).toHaveBeenLastCalledWith('hi')
  })
})
