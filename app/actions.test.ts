// Server Actions can't be unit-tested directly without mocking prisma.
// We mock the prisma module and test action logic.

jest.mock('@/lib/db', () => ({
  prisma: {
    todo: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
    tag: {
      findMany: jest.fn(),
    },
  },
}))

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

import { prisma } from '@/lib/db'
import { createTodo, toggleTodo, deleteTodo } from './actions'

describe('createTodo', () => {
  beforeEach(() => jest.clearAllMocks())

  it('creates a todo with title and default priority', async () => {
    ;(prisma.todo.create as jest.Mock).mockResolvedValue({
      id: '1', title: 'Buy milk', done: false, priority: 'MEDIUM',
      dueDate: null, createdAt: new Date(), updatedAt: new Date(), tags: [],
    })

    const formData = new FormData()
    formData.set('title', 'Buy milk')

    await createTodo(formData)

    expect(prisma.todo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: 'Buy milk' }),
      })
    )
  })

  it('throws if title is empty', async () => {
    const formData = new FormData()
    formData.set('title', '')
    await expect(createTodo(formData)).rejects.toThrow('Title is required')
  })
})

describe('toggleTodo', () => {
  beforeEach(() => jest.clearAllMocks())

  it('flips done status from false to true', async () => {
    ;(prisma.todo.update as jest.Mock).mockResolvedValue({})
    await toggleTodo('1', false)
    expect(prisma.todo.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: { done: true },
    })
  })
})

describe('deleteTodo', () => {
  beforeEach(() => jest.clearAllMocks())

  it('deletes by id', async () => {
    ;(prisma.todo.delete as jest.Mock).mockResolvedValue({})
    await deleteTodo('1')
    expect(prisma.todo.delete).toHaveBeenCalledWith({ where: { id: '1' } })
  })
})
