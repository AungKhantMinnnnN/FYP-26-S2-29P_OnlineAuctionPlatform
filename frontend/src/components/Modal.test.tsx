import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Modal from './Modal'

describe('Modal', () => {
  afterEach(() => {
    document.body.style.overflow = ''
  })

  it('renders nothing when closed', () => {
    const { container } = render(
      <Modal isOpen={false} onClose={() => {}}>
        content
      </Modal>
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the title and children when open', () => {
    render(
      <Modal isOpen title="Confirm" onClose={() => {}}>
        Are you sure?
      </Modal>
    )
    expect(screen.getByText('Confirm')).toBeInTheDocument()
    expect(screen.getByText('Are you sure?')).toBeInTheDocument()
  })

  it('locks body scroll while open and restores it on close', () => {
    const { rerender } = render(
      <Modal isOpen title="t" onClose={() => {}}>
        x
      </Modal>
    )
    expect(document.body.style.overflow).toBe('hidden')
    rerender(
      <Modal isOpen={false} title="t" onClose={() => {}}>
        x
      </Modal>
    )
    expect(document.body.style.overflow).toBe('unset')
  })

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen title="Confirm" onClose={onClose}>
        body
      </Modal>
    )
    await userEvent.click(screen.getByRole('button'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the backdrop is clicked', async () => {
    const onClose = vi.fn()
    const { container } = render(
      <Modal isOpen onClose={onClose}>
        body
      </Modal>
    )
    const backdrop = container.querySelector('.backdrop-blur-sm') as HTMLElement
    await userEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
