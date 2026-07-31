import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TextAreaField from './TextAreaField'

describe('TextAreaField', () => {
  it('renders a label when provided', () => {
    render(<TextAreaField label="Description" value="" onChange={() => {}} />)
    expect(screen.getByText('Description')).toBeInTheDocument()
  })

  it('omits the label when none is provided', () => {
    const { container } = render(<TextAreaField value="" onChange={() => {}} />)
    expect(container.querySelector('label')).toBeNull()
  })

  it('associates the label with the textarea via htmlFor/id so getByLabelText works', () => {
    render(<TextAreaField label="Description" value="" onChange={() => {}} />)
    expect(screen.getByLabelText('Description')).toBe(screen.getByRole('textbox'))
  })

  it('defaults to 4 rows', () => {
    render(<TextAreaField value="" onChange={() => {}} />)
    expect(screen.getByRole('textbox')).toHaveAttribute('rows', '4')
  })

  it('forwards an explicit rows value', () => {
    render(<TextAreaField value="" onChange={() => {}} rows={8} />)
    expect(screen.getByRole('textbox')).toHaveAttribute('rows', '8')
  })

  it('calls onChange as the user types', async () => {
    const handleChange = vi.fn()
    function Controlled() {
      const [value, setValue] = useState('')
      return (
        <TextAreaField
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
