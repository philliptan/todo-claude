import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TodoForm from './TodoForm'

jest.mock('../actions', () => ({
  createTodo: jest.fn().mockResolvedValue(undefined),
  updateTodo: jest.fn().mockResolvedValue(undefined),
}))

describe('TodoForm', () => {
  it('renders form fields', () => {
    render(<TodoForm onClose={() => {}} />)
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/priority/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/due date/i)).toBeInTheDocument()
  })

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = jest.fn()
    render(<TodoForm onClose={onClose} />)
    await userEvent.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalled()
  })

  it('shows validation error when title is empty and Save is clicked', async () => {
    render(<TodoForm onClose={() => {}} />)
    await userEvent.click(screen.getByText('Save'))
    expect(screen.getByText(/title is required/i)).toBeInTheDocument()
  })
})
