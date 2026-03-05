'use client'

type Priority = 'LOW' | 'MEDIUM' | 'HIGH'

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
    { label: 'All', value: undefined as boolean | undefined },
    { label: 'Active', value: false as boolean | undefined },
    { label: 'Done', value: true as boolean | undefined },
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
