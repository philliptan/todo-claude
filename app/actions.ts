'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { Priority } from '@prisma/client'

export async function getTodos(filter?: {
  done?: boolean
  priority?: Priority
  tagName?: string
}) {
  return prisma.todo.findMany({
    where: {
      ...(filter?.done !== undefined && { done: filter.done }),
      ...(filter?.priority && { priority: filter.priority }),
      ...(filter?.tagName && {
        tags: { some: { name: filter.tagName } },
      }),
    },
    include: { tags: true },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createTodo(formData: FormData) {
  const title = (formData.get('title') as string)?.trim()
  if (!title) throw new Error('Title is required')

  const priority = (formData.get('priority') as Priority) || 'MEDIUM'
  const dueDateRaw = formData.get('dueDate') as string | null
  const dueDate = dueDateRaw ? new Date(dueDateRaw) : null
  const tagNames = (formData.getAll('tags') as string[]).filter(Boolean)

  await prisma.todo.create({
    data: {
      title,
      priority,
      dueDate,
      tags: {
        connectOrCreate: tagNames.map((name) => ({
          where: { name },
          create: { name },
        })),
      },
    },
  })

  revalidatePath('/')
}

export async function updateTodo(
  id: string,
  data: {
    title?: string
    priority?: Priority
    dueDate?: Date | null
    tagNames?: string[]
  }
) {
  await prisma.todo.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
      ...(data.tagNames !== undefined && {
        tags: {
          set: [],
          connectOrCreate: data.tagNames.map((name) => ({
            where: { name },
            create: { name },
          })),
        },
      }),
    },
  })

  revalidatePath('/')
}

export async function toggleTodo(id: string, currentDone: boolean) {
  await prisma.todo.update({
    where: { id },
    data: { done: !currentDone },
  })
  revalidatePath('/')
}

export async function deleteTodo(id: string) {
  await prisma.todo.delete({ where: { id } })
  revalidatePath('/')
}

export async function getTags() {
  return prisma.tag.findMany({ orderBy: { name: 'asc' } })
}
