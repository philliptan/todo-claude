import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FilterBar from './FilterBar'

const tags = [
  { id: '1', name: 'work', color: '#3b82f6' },
  { id: '2', name: 'personal', color: '#10b981' },
]

describe('FilterBar', () => {
  it('renders status filter buttons', () => {
    render(<FilterBar tags={tags} filter={{}} onChange={() => {}} />)
    expect(screen.getByText('All')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
  })

  it('calls onChange with done:false when Active is clicked', async () => {
    const onChange = jest.fn()
    render(<FilterBar tags={tags} filter={{}} onChange={onChange} />)
    await userEvent.click(screen.getByText('Active'))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ done: false }))
  })
})
