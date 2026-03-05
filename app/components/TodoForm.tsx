'use client'

import { useState, useTransition } from 'react'
import { createTodo, updateTodo } from '../actions'

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
