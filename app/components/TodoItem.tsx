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
