# Todo Webapp Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a personal single-user todo webapp with CRUD, due dates, tags, and priority using Next.js fullstack.

**Architecture:** Next.js 14 App Router with Server Actions for all mutations. Prisma ORM manages a local SQLite database. Components are React Server Components by default; only forms and interactive elements are Client Components.

**Tech Stack:** Next.js 14, TypeScript, Prisma, SQLite (`better-sqlite3`), Tailwind CSS, Jest + React Testing Library

---

### Task 1: Scaffold Next.js project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.js`

**Step 1: Create Next.js app**

```bash
cd /home/rshcm167pcc/data/projects/todo-claude
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --yes
```

Expected: project files created in current directory.

**Step 2: Install Prisma and SQLite driver**

```bash
npm install prisma @prisma/client
npm install better-sqlite3
npm install -D @types/better-sqlite3
```

**Step 3: Install testing dependencies**

```bash
npm install -D jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event ts-jest
```

**Step 4: Create Jest config**

Create `jest.config.ts`:
```typescript
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
}

export default createJestConfig(config)
```

Create `jest.setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

**Step 5: Verify app boots**

```bash
npm run dev
```

Expected: server starts on http://localhost:3000

**Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Prisma and test setup"
```

---

### Task 2: Prisma schema and database setup

**Files:**
- Create: `prisma/schema.prisma`
- Create: `lib/db.ts`

**Step 1: Initialize Prisma**

```bash
npx prisma init --datasource-provider sqlite
```

Expected: `prisma/schema.prisma` and `.env` created.

**Step 2: Write schema**

Replace `prisma/schema.prisma` content:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Todo {
  id        String    @id @default(cuid())
  title     String
  done      Boolean   @default(false)
  priority  Priority  @default(MEDIUM)
  dueDate   DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  tags      Tag[]     @relation("TodoTags")
}

model Tag {
  id    String @id @default(cuid())
  name  String @unique
  color String @default("#6b7280")
  todos Todo[] @relation("TodoTags")
}

enum Priority {
  LOW
  MEDIUM
  HIGH
}
```

**Step 3: Set DATABASE_URL in `.env`**

```
DATABASE_URL="file:./dev.db"
```

**Step 4: Run migration**

```bash
npx prisma migrate dev --name init
```

Expected: `prisma/dev.db` created, migration files in `prisma/migrations/`.

**Step 5: Create Prisma client singleton**

Create `lib/db.ts`:
```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: ['error'] })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**Step 6: Commit**

```bash
git add prisma/ lib/db.ts .env
git commit -m "feat: add Prisma schema with Todo and Tag models"
```

---

### Task 3: Server Actions

**Files:**
- Create: `app/actions.ts`
- Create: `app/actions.test.ts`

**Step 1: Write failing tests**

Create `app/actions.test.ts`:
```typescript
// Note: Server Actions can't be unit-tested directly in Jest without mocking prisma.
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
      upsert: jest.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'
import { createTodo, toggleTodo, deleteTodo } from './actions'

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('createTodo', () => {
  it('creates a todo with title and default priority', async () => {
    ;(mockPrisma.todo.create as jest.Mock).mockResolvedValue({
      id: '1', title: 'Buy milk', done: false, priority: 'MEDIUM',
      dueDate: null, createdAt: new Date(), updatedAt: new Date(), tags: [],
    })

    const formData = new FormData()
    formData.set('title', 'Buy milk')

    await createTodo(formData)

    expect(mockPrisma.todo.create).toHaveBeenCalledWith(
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
  it('flips done status', async () => {
    ;(mockPrisma.todo.update as jest.Mock).mockResolvedValue({})
    await toggleTodo('1', false)
    expect(mockPrisma.todo.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: { done: true },
    })
  })
})

describe('deleteTodo', () => {
  it('deletes by id', async () => {
    ;(mockPrisma.todo.delete as jest.Mock).mockResolvedValue({})
    await deleteTodo('1')
    expect(mockPrisma.todo.delete).toHaveBeenCalledWith({ where: { id: '1' } })
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
npx jest app/actions.test.ts
```

Expected: FAIL — "Cannot find module './actions'"

**Step 3: Implement Server Actions**

Create `app/actions.ts`:
```typescript
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
```

**Step 4: Run tests to verify they pass**

```bash
npx jest app/actions.test.ts
```

Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add app/actions.ts app/actions.test.ts
git commit -m "feat: add Server Actions for todo CRUD"
```

---

### Task 4: TodoItem component

**Files:**
- Create: `app/components/TodoItem.tsx`
- Create: `app/components/TodoItem.test.tsx`

**Step 1: Write failing test**

Create `app/components/TodoItem.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
```

**Step 2: Run test to verify it fails**

```bash
npx jest app/components/TodoItem.test.tsx
```

Expected: FAIL — "Cannot find module './TodoItem'"

**Step 3: Implement TodoItem**

Create `app/components/TodoItem.tsx`:
```typescript
'use client'

import { toggleTodo, deleteTodo } from '../actions'

type Priority = 'LOW' | 'MEDIUM' | 'HIGH'

interface Tag {
  id: string
  name: string
  color: string
}

interface Todo {
  id: string
  title: string
  done: boolean
  priority: Priority
  dueDate: Date | null
  createdAt: Date
  updatedAt: Date
  tags: Tag[]
}

interface Props {
  todo: Todo
  onEdit: (todo: Todo) => void
}

const priorityColors: Record<Priority, string> = {
  HIGH: 'bg-red-100 text-red-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  LOW: 'bg-green-100 text-green-700',
}

function isOverdue(dueDate: Date | null): boolean {
  if (!dueDate) return false
  return new Date(dueDate) < new Date()
}

export default function TodoItem({ todo, onEdit }: Props) {
  return (
    <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
      <input
        type="checkbox"
        checked={todo.done}
        onChange={() => toggleTodo(todo.id, todo.done)}
        className="mt-1 h-4 w-4 rounded border-gray-300 cursor-pointer"
      />

      <div className="flex-1 min-w-0">
        <p className={`text-gray-900 ${todo.done ? 'line-through text-gray-400' : ''}`}>
          {todo.title}
        </p>

        <div className="flex flex-wrap gap-2 mt-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${priorityColors[todo.priority]}`}>
            {todo.priority}
          </span>

          {todo.dueDate && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${isOverdue(todo.dueDate) ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
              {new Date(todo.dueDate).toLocaleDateString()}
            </span>
          )}

          {todo.tags.map((tag) => (
            <span
              key={tag.id}
              className="text-xs px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      </div>

      <div className="flex gap-1 shrink-0">
        <button
          onClick={() => onEdit(todo)}
          className="text-gray-400 hover:text-blue-500 p-1 rounded"
          aria-label="Edit"
        >
          ✏️
        </button>
        <button
          onClick={() => deleteTodo(todo.id)}
          className="text-gray-400 hover:text-red-500 p-1 rounded"
          aria-label="Delete"
        >
          🗑️
        </button>
      </div>
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

```bash
npx jest app/components/TodoItem.test.tsx
```

Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add app/components/TodoItem.tsx app/components/TodoItem.test.tsx
git commit -m "feat: add TodoItem component"
```

---

### Task 5: TodoForm component (modal)

**Files:**
- Create: `app/components/TodoForm.tsx`
- Create: `app/components/TodoForm.test.tsx`

**Step 1: Write failing test**

Create `app/components/TodoForm.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TodoForm from './TodoForm'

jest.mock('../actions', () => ({
  createTodo: jest.fn().mockResolvedValue(undefined),
  updateTodo: jest.fn().mockResolvedValue(undefined),
  getTags: jest.fn().mockResolvedValue([]),
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

  it('shows validation error when title is empty', async () => {
    render(<TodoForm onClose={() => {}} />)
    await userEvent.click(screen.getByText('Save'))
    expect(screen.getByText(/title is required/i)).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npx jest app/components/TodoForm.test.tsx
```

Expected: FAIL — "Cannot find module './TodoForm'"

**Step 3: Implement TodoForm**

Create `app/components/TodoForm.tsx`:
```typescript
'use client'

import { useState, useTransition } from 'react'
import { createTodo, updateTodo } from '../actions'
import { Priority } from '@prisma/client'

interface Tag {
  id: string
  name: string
  color: string
}

interface Todo {
  id: string
  title: string
  done: boolean
  priority: Priority
  dueDate: Date | null
  tags: Tag[]
}

interface Props {
  todo?: Todo
  availableTags?: Tag[]
  onClose: () => void
}

export default function TodoForm({ todo, availableTags = [], onClose }: Props) {
  const [title, setTitle] = useState(todo?.title ?? '')
  const [priority, setPriority] = useState<Priority>(todo?.priority ?? 'MEDIUM')
  const [dueDate, setDueDate] = useState(
    todo?.dueDate ? new Date(todo.dueDate).toISOString().slice(0, 10) : ''
  )
  const [selectedTags, setSelectedTags] = useState<string[]>(
    todo?.tags.map((t) => t.name) ?? []
  )
  const [newTag, setNewTag] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function toggleTag(name: string) {
    setSelectedTags((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]
    )
  }

  function addNewTag() {
    const trimmed = newTag.trim()
    if (trimmed && !selectedTags.includes(trimmed)) {
      setSelectedTags((prev) => [...prev, trimmed])
    }
    setNewTag('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    setError('')

    startTransition(async () => {
      if (todo) {
        await updateTodo(todo.id, {
          title: title.trim(),
          priority,
          dueDate: dueDate ? new Date(dueDate) : null,
          tagNames: selectedTags,
        })
      } else {
        const formData = new FormData()
        formData.set('title', title.trim())
        formData.set('priority', priority)
        if (dueDate) formData.set('dueDate', dueDate)
        selectedTags.forEach((tag) => formData.append('tags', tag))
        await createTodo(formData)
      }
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-semibold mb-4">
          {todo ? 'Edit Todo' : 'New Todo'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="What needs to be done?"
            />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
          </div>

          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div>
            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
              Due Date
            </label>
            <input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {availableTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.name)}
                  className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                    selectedTags.includes(tag.name)
                      ? 'text-white border-transparent'
                      : 'text-gray-600 border-gray-300'
                  }`}
                  style={selectedTags.includes(tag.name) ? { backgroundColor: tag.color } : {}}
                >
                  {tag.name}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addNewTag())}
                placeholder="New tag..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={addNewTag}
                className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Add
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

```bash
npx jest app/components/TodoForm.test.tsx
```

Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add app/components/TodoForm.tsx app/components/TodoForm.test.tsx
git commit -m "feat: add TodoForm modal component"
```

---

### Task 6: FilterBar component

**Files:**
- Create: `app/components/FilterBar.tsx`
- Create: `app/components/FilterBar.test.tsx`

**Step 1: Write failing test**

Create `app/components/FilterBar.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FilterBar from './FilterBar'

const tags = [
  { id: '1', name: 'work', color: '#3b82f6' },
  { id: '2', name: 'personal', color: '#10b981' },
]

describe('FilterBar', () => {
  it('renders status filters', () => {
    render(<FilterBar tags={tags} filter={{}} onChange={() => {}} />)
    expect(screen.getByText('All')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
  })

  it('calls onChange when filter changes', async () => {
    const onChange = jest.fn()
    render(<FilterBar tags={tags} filter={{}} onChange={onChange} />)
    await userEvent.click(screen.getByText('Active'))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ done: false }))
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npx jest app/components/FilterBar.test.tsx
```

Expected: FAIL

**Step 3: Implement FilterBar**

Create `app/components/FilterBar.tsx`:
```typescript
'use client'

import { Priority } from '@prisma/client'

interface Tag {
  id: string
  name: string
  color: string
}

export interface Filter {
  done?: boolean
  priority?: Priority
  tagName?: string
}

interface Props {
  tags: Tag[]
  filter: Filter
  onChange: (filter: Filter) => void
}

export default function FilterBar({ tags, filter, onChange }: Props) {
  const statusOptions = [
    { label: 'All', value: undefined },
    { label: 'Active', value: false },
    { label: 'Done', value: true },
  ]

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {statusOptions.map((opt) => (
          <button
            key={opt.label}
            onClick={() => onChange({ ...filter, done: opt.value })}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              filter.done === opt.value
                ? 'bg-white shadow text-gray-900 font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <select
        value={filter.priority ?? ''}
        onChange={(e) =>
          onChange({ ...filter, priority: (e.target.value as Priority) || undefined })
        }
        className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
      >
        <option value="">All priorities</option>
        <option value="HIGH">High</option>
        <option value="MEDIUM">Medium</option>
        <option value="LOW">Low</option>
      </select>

      {tags.length > 0 && (
        <select
          value={filter.tagName ?? ''}
          onChange={(e) =>
            onChange({ ...filter, tagName: e.target.value || undefined })
          }
          className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
        >
          <option value="">All tags</option>
          {tags.map((tag) => (
            <option key={tag.id} value={tag.name}>
              {tag.name}
            </option>
          ))}
        </select>
      )}

      {(filter.done !== undefined || filter.priority || filter.tagName) && (
        <button
          onClick={() => onChange({})}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

```bash
npx jest app/components/FilterBar.test.tsx
```

Expected: PASS (2 tests)

**Step 5: Commit**

```bash
git add app/components/FilterBar.tsx app/components/FilterBar.test.tsx
git commit -m "feat: add FilterBar component"
```

---

### Task 7: Main page — wire everything together

**Files:**
- Modify: `app/page.tsx`
- Create: `app/components/TodoList.tsx`

**Step 1: Create TodoList client component**

Create `app/components/TodoList.tsx`:
```typescript
'use client'

import { useState } from 'react'
import TodoItem from './TodoItem'
import TodoForm from './TodoForm'
import FilterBar, { Filter } from './FilterBar'

interface Tag {
  id: string
  name: string
  color: string
}

interface Todo {
  id: string
  title: string
  done: boolean
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  dueDate: Date | null
  createdAt: Date
  updatedAt: Date
  tags: Tag[]
}

interface Props {
  todos: Todo[]
  tags: Tag[]
}

export default function TodoList({ todos, tags }: Props) {
  const [filter, setFilter] = useState<Filter>({})
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [showForm, setShowForm] = useState(false)

  const filtered = todos.filter((todo) => {
    if (filter.done !== undefined && todo.done !== filter.done) return false
    if (filter.priority && todo.priority !== filter.priority) return false
    if (filter.tagName && !todo.tags.some((t) => t.name === filter.tagName)) return false
    return true
  })

  return (
    <>
      <FilterBar tags={tags} filter={filter} onChange={setFilter} />

      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{filtered.length} task{filtered.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          + Add Todo
        </button>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg">No todos yet</p>
            <p className="text-sm mt-1">Click "Add Todo" to get started</p>
          </div>
        ) : (
          filtered.map((todo) => (
            <TodoItem key={todo.id} todo={todo} onEdit={setEditingTodo} />
          ))
        )}
      </div>

      {(showForm || editingTodo) && (
        <TodoForm
          todo={editingTodo ?? undefined}
          availableTags={tags}
          onClose={() => {
            setShowForm(false)
            setEditingTodo(null)
          }}
        />
      )}
    </>
  )
}
```

**Step 2: Replace app/page.tsx**

```typescript
import { getTodos, getTags } from './actions'
import TodoList from './components/TodoList'

export default async function Home() {
  const [todos, tags] = await Promise.all([getTodos(), getTags()])

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Todos</h1>
          <p className="text-gray-500 mt-1">Stay on top of things</p>
        </header>

        <div className="space-y-4">
          <TodoList todos={todos} tags={tags} />
        </div>
      </div>
    </main>
  )
}
```

**Step 3: Run dev server and manually verify**

```bash
npm run dev
```

Open http://localhost:3000 and verify:
- [ ] Page loads with empty state message
- [ ] "Add Todo" button opens modal
- [ ] Can create a todo with title, priority, due date, tag
- [ ] Todo appears in list with correct badge colors
- [ ] Checkbox toggles done state (strikethrough)
- [ ] Edit button re-opens form with existing values
- [ ] Delete button removes todo
- [ ] Filter buttons work correctly

**Step 4: Commit**

```bash
git add app/page.tsx app/components/TodoList.tsx
git commit -m "feat: wire main page with TodoList, filters, and form"
```

---

### Task 8: Run full test suite

**Step 1: Run all tests**

```bash
npx jest --coverage
```

Expected: All tests pass. Coverage should be > 70% for actions and components.

**Step 2: Fix any failures**

If any test fails, read the error output carefully and fix the root cause.

**Step 3: Final commit**

```bash
git add -A
git commit -m "test: ensure full test suite passes"
```

---

## Verification Checklist

After completing all tasks, verify:

- [ ] `npm run dev` starts without errors
- [ ] `npm run build` succeeds (no TypeScript errors)
- [ ] `npx jest` all tests pass
- [ ] Manually: create / edit / delete a todo
- [ ] Manually: toggle done state
- [ ] Manually: filter by status, priority, tag
- [ ] Manually: due date shown in red when overdue
