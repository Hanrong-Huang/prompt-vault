import { useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Plus, Pencil, Trash2, Star } from 'lucide-react'
import { useVaultStore } from '../store/useVaultStore.js'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

function CategoryRow({ category, onRename, onDelete, isOver, isActive }) {
  return (
    <div className={`group flex items-center justify-between rounded-md px-2 py-1.5 transition-colors duration-150 w-full ${
      isOver
        ? 'bg-blue-100/50 dark:bg-blue-900/20'
        : isActive
        ? 'bg-gray-500 dark:bg-gray-600'
        : 'hover:bg-gray-500 dark:hover:bg-gray-600'
    }`}
      title="Drop prompts here">
      <NavLink
        to={`/category/${category.id}`}
        className="text-left flex-1 truncate"
        onClick={(e) => isOver && e.preventDefault()}
      >
        {category.name}
      </NavLink>
      <div className={`transition-opacity duration-150 ml-2 flex items-center gap-1 ${
        isOver ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'
      }`}>
        <button 
          aria-label="Rename" 
          onClick={(e) => {
            e.stopPropagation()
            onRename(category)
          }} 
          className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
        >
          <Pencil size={14} className="stroke-current" />
        </button>
        <button 
          aria-label="Delete" 
          onClick={(e) => {
            e.stopPropagation()
            onDelete(category)
          }} 
          className="p-1 rounded hover:bg-red-100 text-red-600 dark:hover:bg-red-900/30"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

function SortableCategory({ id, category, onRename, onDelete }) {
  const location = useLocation()
  const isActive = location.pathname === `/category/${category.id}`

  // Sortable functionality for reordering categories
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    data: { type: 'category', category }
  })

  // Droppable functionality for receiving prompts
  const { isOver: isDropOver, setNodeRef: setDroppableNodeRef } = useDroppable({
    id: `drop-${id}`,
    data: { type: 'category-drop', categoryId: id, category }
  })

  // Combine both refs
  const setRefs = (element) => {
    setNodeRef(element)
    setDroppableNodeRef(element)
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  return (
    <div
      ref={setRefs}
      style={style}
      {...attributes}
      className="flex items-center gap-2 w-full"
    >
      <div
        className="flex-shrink-0 cursor-grab hover:cursor-grabbing touch-none"
        {...listeners}
        style={{ touchAction: 'none' }}
        title="Drag to reorder"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
          <circle cx="3" cy="6" r="1" fill="currentColor" />
          <circle cx="3" cy="10" r="1" fill="currentColor" />
          <circle cx="8" cy="6" r="1" fill="currentColor" />
          <circle cx="8" cy="10" r="1" fill="currentColor" />
          <circle cx="13" cy="6" r="1" fill="currentColor" />
          <circle cx="13" cy="10" r="1" fill="currentColor" />
        </svg>
      </div>
      <div className="flex-1">
        <CategoryRow category={category} onRename={onRename} onDelete={onDelete} isOver={isDropOver} isActive={isActive} />
      </div>
    </div>
  )
}

function UncategorizedDropZone() {
  const { isOver, setNodeRef } = useDroppable({
    id: 'uncategorized',
    data: { type: 'uncategorized' }
  })

  return (
    <div
      ref={setNodeRef}
      className={`mt-2 p-3 rounded-md border-2 border-dashed transition-colors duration-150 ${
        isOver
          ? 'border-gray-400 bg-gray-100 dark:bg-gray-800'
          : 'border-gray-300 dark:border-gray-600'
      }`}
    >
      <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
        Drop here to remove from category
      </div>
    </div>
  )
}

export function Sidebar() {
  const store = useVaultStore()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => {
    if (!store.ready) store.init()
  }, [store.ready])

  const categories = useMemo(() => {
    return [...store.categories].sort((a, b) => a.order - b.order)
  }, [store.categories])

  async function submitCreate(e) {
    e.preventDefault()
    if (!name.trim()) return
    await store.createCategory(name.trim())
    setName('')
    setCreating(false)
  }

  async function handleRename(cat) {
    const next = prompt('Rename category', cat.name)
    if (next && next.trim() && next.trim() !== cat.name) {
      await store.renameCategory(cat.id, next.trim())
    }
  }
  async function handleDelete(cat) {
    if (confirm(`Delete category "${cat.name}"? Prompts will be uncategorized.`)) {
      await store.deleteCategory(cat.id)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-[#464647] bg-white dark:bg-[#252526] p-4 shadow-lg dark:shadow-black/50 transition-colors duration-150">
      <nav className="flex flex-col gap-1 mb-2">
        <NavLink to="/" end className={({ isActive }) => `rounded-md px-2 py-1.5 text-base transition-colors duration-150 ${isActive ? 'bg-gray-500 dark:bg-gray-600 text-white shadow-sm' : 'hover:bg-gray-500 dark:hover:bg-gray-600 text-gray-900 dark:!text-white'}`}>All</NavLink>
        <NavLink to="/favorites" className={({ isActive }) => `rounded-md px-2 py-1.5 text-base flex items-center gap-2 transition-colors duration-150 ${isActive ? 'bg-gray-500 dark:bg-gray-600 text-white shadow-sm' : 'hover:bg-gray-500 dark:hover:bg-gray-600 text-gray-900 dark:!text-white'}`}><Star size={14} className="text-amber-500" /> Favorites</NavLink>
      </nav>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Categories</h2>
        <button onClick={() => setCreating((v) => !v)} className="inline-flex items-center gap-1 text-sm rounded-md border border-zinc-200 dark:border-zinc-800 px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-900"><Plus size={14} /> New</button>
      </div>
      {creating && (
        <form onSubmit={submitCreate} className="mt-2 flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name" className="flex-1 min-w-0 rounded-md border border-zinc-200 dark:border-zinc-800 bg-transparent px-2 py-1 text-sm" />
          <button type="submit" className="rounded-md border border-zinc-200 dark:border-zinc-800 px-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900 whitespace-nowrap">Add</button>
          <button type="button" onClick={() => { setCreating(false); setName(''); }} className="rounded-md border border-zinc-200 dark:border-zinc-800 px-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900 whitespace-nowrap">Cancel</button>
        </form>
      )}

      <div className="mt-3">
        <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {categories.map((cat) => (
            <SortableCategory
              id={cat.id}
              key={cat.id}
              category={cat}
              onRename={handleRename}
              onDelete={handleDelete}
            />
          ))}
        </SortableContext>

        <UncategorizedDropZone />
      </div>
    </div>
  )
}


