import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Plus, Pencil, Trash2, Star, Share2 } from 'lucide-react'
import { useVaultStore } from '../store/useVaultStore.js'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function CategoryRow({ category, onRename, onDelete, onDropPrompt }) {
  const [isDragOver, setIsDragOver] = useState(false)

  return (
    <div className={`group flex items-center justify-between rounded-md px-2 py-1.5 transition-colors ${
      isDragOver
        ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-300 dark:border-blue-600'
        : 'hover:bg-zinc-100/70 dark:hover:bg-zinc-900/60'
    }`}
      onDragOver={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragOver(true)
      }}
      onDragLeave={(e) => {
        e.preventDefault()
        setIsDragOver(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragOver(false)
        const id = e.dataTransfer.getData('text/prompt-id')
        console.log('Dropping prompt:', id, 'into category:', category.id)
        if (id) {
          onDropPrompt(id, category.id)
        }
      }}
      title="Drop prompts here">
      <NavLink 
        to={`/category/${category.id}`} 
        className={({ isActive }) => `text-left flex-1 truncate ${isActive ? 'font-medium text-blue-600 dark:text-blue-400' : ''}`}
      >
        {category.name}
      </NavLink>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex items-center gap-1">
        <button aria-label="Share" onClick={() => navigator.clipboard?.writeText(`${location.origin}/category/${category.id}`)} className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"><Share2 size={14} /></button>
        <button aria-label="Rename" onClick={() => onRename(category)} className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"><Pencil size={14} /></button>
        <button aria-label="Delete" onClick={() => onDelete(category)} className="p-1 rounded hover:bg-red-100 text-red-600 dark:hover:bg-red-900/30"><Trash2 size={14} /></button>
      </div>
    </div>
  )
}

function SortableCategory({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id,
    data: { type: 'category' }
  })
  const style = { transform: CSS.Transform.toString(transform), transition }
  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="flex items-center gap-2">
        <div className="cursor-grab hover:cursor-grabbing" {...listeners}>
          <svg width="12" height="12" viewBox="0 0 16 16" className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
            <circle cx="3" cy="6" r="1" fill="currentColor" />
            <circle cx="3" cy="10" r="1" fill="currentColor" />
            <circle cx="8" cy="6" r="1" fill="currentColor" />
            <circle cx="8" cy="10" r="1" fill="currentColor" />
            <circle cx="13" cy="6" r="1" fill="currentColor" />
            <circle cx="13" cy="10" r="1" fill="currentColor" />
          </svg>
        </div>
        <div className="flex-1" style={{ pointerEvents: 'auto' }}>{children}</div>
      </div>
    </div>
  )
}

export function Sidebar() {
  const store = useVaultStore()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [isUncategorizedDragOver, setIsUncategorizedDragOver] = useState(false)

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

  const sensors = useSensors(useSensor(PointerSensor))

  async function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const ids = categories.map((c) => c.id)
    const fromIndex = ids.indexOf(active.id)
    const toIndex = ids.indexOf(over.id)
    const reordered = arrayMove(ids, fromIndex, toIndex)
    await store.reorderCategories(reordered)
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-[#464647] bg-white dark:bg-[#252526] p-4 shadow-lg dark:shadow-black/50 transition-all duration-300">
      <nav className="flex flex-col gap-1 text-sm mb-2">
        <NavLink to="/" end className={({ isActive }) => `rounded-md px-2 py-1.5 transition-all duration-200 ${isActive ? 'bg-[#007acc] text-white shadow-sm' : 'hover:bg-[#2a2d2e] text-white'}`}>All</NavLink>
        <NavLink to="/favorites" className={({ isActive }) => `rounded-md px-2 py-1.5 flex items-center gap-2 transition-all duration-200 ${isActive ? 'bg-[#007acc] text-white shadow-sm' : 'hover:bg-[#2a2d2e] text-white'}`}><Star size={14} className="text-amber-500" /> Favorites</NavLink>
      </nav>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Categories</h2>
        <button onClick={() => setCreating((v) => !v)} className="inline-flex items-center gap-1 text-sm rounded-md border border-zinc-200 dark:border-zinc-800 px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-900"><Plus size={14} /> New</button>
      </div>
      {creating && (
        <form onSubmit={submitCreate} className="mt-2 flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name" className="flex-1 rounded-md border border-zinc-200 dark:border-zinc-800 bg-transparent px-2 py-1 text-sm" />
          <button className="rounded-md bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 px-2 text-sm">Add</button>
        </form>
      )}

      <div className={`mt-3 transition-colors ${
        isUncategorizedDragOver
          ? 'bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-md p-2'
          : ''
      }`}
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setIsUncategorizedDragOver(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          setIsUncategorizedDragOver(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setIsUncategorizedDragOver(false)
          const id = e.dataTransfer.getData('text/prompt-id')
          console.log('Uncategorizing prompt:', id)
          if (id) store.movePrompt(id, '')
        }}
        title="Drop here to unassign category">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            {categories.map((cat) => (
              <SortableCategory id={cat.id} key={cat.id}>
                <CategoryRow category={cat} onRename={handleRename} onDelete={handleDelete} onDropPrompt={store.movePrompt} />
              </SortableCategory>
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  )
}


