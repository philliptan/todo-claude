# Todo Webapp — Design Document

Date: 2026-03-03

## Overview

Personal single-user todo webapp built with Next.js fullstack (App Router), Prisma ORM, and SQLite.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| ORM | Prisma |
| Database | SQLite (`prisma/dev.db`) |
| Styling | Tailwind CSS |

---

## Database Schema

```prisma
model Todo {
  id        String    @id @default(cuid())
  title     String
  done      Boolean   @default(false)
  priority  Priority  @default(MEDIUM)
  dueDate   DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  tags      Tag[]
}

model Tag {
  id    String @id @default(cuid())
  name  String @unique
  color String @default("#6b7280")
  todos Todo[]
}

enum Priority {
  LOW
  MEDIUM
  HIGH
}
```

---

## Project Structure

```
app/
  page.tsx              — Main page (todo list)
  actions.ts            — Server Actions (create, update, delete, toggle)
  components/
    TodoList.tsx         — Todo list container
    TodoItem.tsx         — Single todo item
    TodoForm.tsx         — Add/edit form (modal)
    TagBadge.tsx         — Tag chip component
    FilterBar.tsx        — Filter by status/tag/priority
prisma/
  schema.prisma
  dev.db
```

---

## UI

### Layout

Single-column responsive layout:

1. **Header** — app title + "Add Todo" button
2. **FilterBar** — filter by: `All / Active / Done` | tags | priority
3. **TodoList** — list sorted by `createdAt DESC` by default
4. **TodoForm** — modal used for both create and edit

### TodoItem

- Checkbox (toggle done/undone)
- Title (strikethrough when done)
- Priority badge (red=HIGH, yellow=MEDIUM, green=LOW)
- Due date (red text if overdue)
- Tag chips
- Edit / Delete buttons

### TodoForm Fields

- Title (required)
- Priority (select: LOW / MEDIUM / HIGH)
- Due date (date picker, optional)
- Tags (multi-select, can create new tag inline)

---

## Server Actions

| Action | Description |
|--------|-------------|
| `createTodo(formData)` | Create new todo |
| `updateTodo(id, data)` | Edit existing todo |
| `deleteTodo(id)` | Delete todo |
| `toggleTodo(id)` | Toggle done/undone |

---

## Out of Scope (v1)

- Authentication / multi-user
- Dark mode
- Drag-and-drop reordering
- Subtasks / nesting
- Notifications / reminders
