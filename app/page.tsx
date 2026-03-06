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
