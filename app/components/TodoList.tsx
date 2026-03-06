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
        <p className="text-sm text-gray-500">
          {filtered.length} task{filtered.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-emerald-400 text-white text-sm rounded-lg hover:bg-emerald-500"
        >
          + Add Todo
        </button>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg">No todos yet</p>
            <p className="text-sm mt-1">Click &quot;Add Todo&quot; to get started</p>
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
