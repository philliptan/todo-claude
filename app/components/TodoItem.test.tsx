import { render, screen } from '@testing-library/react'
import TodoItem from './TodoItem'

const mockTodo = {
  id: '1',
  title: 'Buy milk',
  done: false,
  priority: 'HIGH' as const,
  dueDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  tags: [{ id: 't1', name: 'shopping', color: '#3b82f6' }],
}

jest.mock('../actions', () => ({
  toggleTodo: jest.fn(),
  deleteTodo: jest.fn(),
}))

describe('TodoItem', () => {
  it('renders title and priority badge', () => {
    render(<TodoItem todo={mockTodo} onEdit={() => {}} />)
    expect(screen.getByText('Buy milk')).toBeInTheDocument()
    expect(screen.getByText('HIGH')).toBeInTheDocument()
  })

  it('renders tag chip', () => {
    render(<TodoItem todo={mockTodo} onEdit={() => {}} />)
    expect(screen.getByText('shopping')).toBeInTheDocument()
  })

  it('applies line-through when done', () => {
    render(<TodoItem todo={{ ...mockTodo, done: true }} onEdit={() => {}} />)
    expect(screen.getByText('Buy milk')).toHaveClass('line-through')
  })
})
