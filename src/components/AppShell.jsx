import { Link, NavLink, Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar.jsx'
import { Moon, Sun, Search, Upload, Download } from 'lucide-react'
import Papa from 'papaparse'
import { useEffect, useRef, useState } from 'react'
import { useVaultStore } from '../store/useVaultStore.js'
import { getState, saveState } from '../lib/storage.js'
import { DndContext, closestCenter, pointerWithin, rectIntersection, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'

function useTheme() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved || 'dark'
  })

  useEffect(() => {
    localStorage.setItem('theme', theme)
    const root = document.documentElement
    const body = document.body
    if (theme === 'dark') {
      root.classList.add('dark')
      body.classList.add('dark')
    } else {
      root.classList.remove('dark')
      body.classList.remove('dark')
    }
  }, [theme])

  // Apply theme immediately on mount
  useEffect(() => {
    const root = document.documentElement
    const body = document.body
    if (theme === 'dark') {
      root.classList.add('dark')
      body.classList.add('dark')
    } else {
      root.classList.remove('dark')
      body.classList.remove('dark')
    }
  }, [])

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  return { theme, toggle }
}

export function AppShell() {
  const { theme, toggle } = useTheme()
  const store = useVaultStore()
  const fileRef = useRef(null)
  const lastOver = useRef(null)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 1, // Reduced to 1px to make dragging more responsive
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragStart(event) {
    if (event.active.data?.current?.type === 'prompt') {
      lastOver.current = null
    }
  }

  function handleDragOver(event) {
    if (event.active.data?.current?.type === 'prompt' && event.over) {
      lastOver.current = event.over
    }
  }

  async function handleDragEnd(event) {
    const { active } = event
    const over = event.over ?? lastOver.current
    lastOver.current = null

    console.log('Drag end - active:', active.id, active.data?.current?.type)
    console.log('Drag end - over:', over?.id, over?.data?.current?.type)

    if (!over) {
      console.log('No drop target found')
      return
    }

    if (active.id === over.id) {
      console.log('Dropped on self')
      return
    }

    // Check if dropping a prompt on a category drop zone (sidebar)
    if (active.data?.current?.type === 'prompt') {
      if (over.data?.current?.type === 'category-drop') {
        console.log('Moving prompt to category via data:', active.id, over.data.current.categoryId)
        await store.movePrompt(active.id, over.data.current.categoryId)
        return
      }

      // Also check by ID pattern in case data isn't set correctly
      if (typeof over.id === 'string' && over.id.startsWith('drop-')) {
        const categoryId = over.id.replace('drop-', '')
        console.log('Moving prompt to category via ID pattern:', active.id, categoryId)
        await store.movePrompt(active.id, categoryId)
        return
      }

      // Check if dropping on uncategorized area
      if (over.id === 'uncategorized') {
        console.log('Moving prompt to uncategorized:', active.id)
        await store.movePrompt(active.id, '')
        return
      }

      console.log('No valid drop target found for prompt')
    }

    // Handle category reordering
    if (active.data?.current?.type === 'category' && over.data?.current?.type === 'category') {
      const categories = store.categories.sort((a, b) => a.order - b.order)
      const ids = categories.map(c => c.id)
      const fromIndex = ids.indexOf(active.id)
      const toIndex = ids.indexOf(over.id)
      if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
        const reordered = arrayMove(ids, fromIndex, toIndex)
        console.log('Reordering categories:', { fromIndex, toIndex, reordered })
        await store.reorderCategories(reordered)
      }
      return
    }

    // Handle prompt reordering (both should be prompts)
    if (active.data?.current?.type === 'prompt' && over.data?.current?.type === 'prompt') {
      // Get current prompts in the visible list
      const activePrompt = store.prompts.find(p => p.id === active.id)
      const overPrompt = store.prompts.find(p => p.id === over.id)

      if (activePrompt && overPrompt) {
        // Check what view we're currently in to determine reordering scope
        const currentPath = window.location.pathname
        
        if (currentPath === '/prompt-vault' || currentPath === '/prompt-vault/') {
          // Global view - reorder all prompts globally
          const allPrompts = store.prompts.sort((a, b) => (a.order || 0) - (b.order || 0))
          const ids = allPrompts.map(p => p.id)
          const fromIndex = ids.indexOf(active.id)
          const toIndex = ids.indexOf(over.id)
          const reordered = arrayMove(ids, fromIndex, toIndex)
          await store.reorderPrompts('', reordered)
        } else if (currentPath === '/prompt-vault/favorites') {
          // Favorites view - reorder within favorites
          const favoritePrompts = store.prompts.filter(p => p.favorite).sort((a, b) => (a.order || 0) - (b.order || 0))
          const ids = favoritePrompts.map(p => p.id)
          const fromIndex = ids.indexOf(active.id)
          const toIndex = ids.indexOf(over.id)
          const reordered = arrayMove(ids, fromIndex, toIndex)
          await store.reorderPrompts('', reordered)
        } else if (activePrompt.categoryId === overPrompt.categoryId) {
          // Same category - reorder within that category
          const currentPrompts = store.prompts.filter(p => p.categoryId === activePrompt.categoryId)
          const ids = currentPrompts.sort((a, b) => (a.order || 0) - (b.order || 0)).map(p => p.id)
          const fromIndex = ids.indexOf(active.id)
          const toIndex = ids.indexOf(over.id)
          const reordered = arrayMove(ids, fromIndex, toIndex)
          await store.reorderPrompts(activePrompt.categoryId || '', reordered)
        } else {
          // Different categories - move the active prompt to the over prompt's category and position
          // First move the prompt to the target category
          await store.movePrompt(active.id, overPrompt.categoryId)
          
          // Then reorder within the new category
          const targetCategoryPrompts = store.prompts.filter(p => p.categoryId === overPrompt.categoryId)
          const ids = targetCategoryPrompts.sort((a, b) => (a.order || 0) - (b.order || 0)).map(p => p.id)
          
          // Remove the active prompt if it's already in the list (after move)
          const activeIndex = ids.indexOf(active.id)
          if (activeIndex !== -1) {
            ids.splice(activeIndex, 1)
          }
          
          // Insert it at the target position
          const targetIndex = ids.indexOf(over.id)
          ids.splice(targetIndex + 1, 0, active.id)
          
          await store.reorderPrompts(overPrompt.categoryId || '', ids)
        }
      }
      return
    }
  }

  async function handleExportJSON() {
    const data = await getState()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'prompt-vault.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleExportCSV() {
    const data = await getState()
    const rows = data.prompts.map((p) => {
      const category = data.categories.find((c) => c.id === p.categoryId)
      return {
        title: p.title,
        text: p.text,
        category: category?.name || '',
        favorite: p.favorite ? '1' : '0',
      }
    })
    const csv = Papa.unparse(rows)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'prompt-vault.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.name.toLowerCase().endsWith('.json')) {
      const text = await file.text()
      try {
        const json = JSON.parse(text)
        await saveState(json)
        await store.init()
      } catch {
        alert('Invalid JSON file')
      } finally {
        e.target.value = ''
      }
      return
    }
    if (file.name.toLowerCase().endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (result) => {
          try {
            // Expect columns: title, text, category (optional), favorite (0/1)
            const rows = result.data
            for (const row of rows) {
              const title = (row.title || row.Title || '').toString().trim()
              const text = (row.text || row.Prompt || row.Text || '').toString().trim()
              if (!title && !text) continue
              let categoryName = (row.category || row.Category || '').toString().trim()
              let categoryId = ''
              if (categoryName) {
                const current = await getState()
                const found = current.categories.find((c) => c.name.toLowerCase() === categoryName.toLowerCase())
                if (found) categoryId = found.id
                else {
                  const created = await store.createCategory(categoryName)
                  categoryId = created.id
                }
              }
              const favorite = ['1', 'true', 'yes', 'y'].includes(String(row.favorite || row.Favorite || '').toLowerCase())
              await store.createPrompt({ title, text, categoryId, favorite })
            }
            alert('CSV imported successfully')
          } catch {
            alert('Failed to import CSV')
          } finally {
            e.target.value = ''
          }
        },
        error: () => {
          alert('Invalid CSV file')
          e.target.value = ''
        },
      })
      return
    }
    alert('Unsupported file type. Please import JSON or CSV.')
    e.target.value = ''
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-[#1e1e1e] dark:text-white transition-colors duration-150">
      <header className="sticky top-0 z-10 border-b border-gray-200 dark:border-[#464647] bg-white dark:bg-[#2d2d30] shadow-lg dark:shadow-black/50 transition-all duration-150">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
          <Link to="/" className="font-semibold tracking-tight">Prompt Vault</Link>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative hidden sm:block">
              <Search size={16} className="absolute left-2.5 top-2.5 text-zinc-500" />
              <input placeholder="Search…" value={store.filter} onChange={(e) => store.setFilter(e.target.value)} className="w-64 rounded-md border border-zinc-200 dark:border-zinc-800 bg-transparent pl-8 pr-3 py-1.5 text-sm outline-none focus:ring-2 ring-zinc-300 dark:ring-zinc-700" />
            </div>
            <button aria-label="Toggle theme" className="inline-flex items-center gap-2 rounded-md border border-zinc-200 dark:border-zinc-800 px-2.5 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900" onClick={toggle}>
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              <span className="hidden sm:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
            <div className="relative group">
              <button className="inline-flex items-center gap-2 rounded-md border border-zinc-200 dark:border-zinc-800 px-2.5 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900" title="Export">
                <Download size={16} />
                <span className="hidden sm:inline">Export</span>
              </button>
              <div className="absolute right-0 top-full mt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-200 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-lg z-10">
                <button onClick={handleExportJSON} className="block w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 whitespace-nowrap rounded-t-md">Export JSON</button>
                <button onClick={handleExportCSV} className="block w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 whitespace-nowrap rounded-b-md">Export CSV</button>
              </div>
            </div>
            <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-md border border-zinc-200 dark:border-zinc-800 px-2.5 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900" title="Import JSON or CSV">
              <Upload size={16} />
              <span className="hidden sm:inline">Import</span>
            </button>
            <input ref={fileRef} type="file" accept="application/json,text/csv,.csv" onChange={handleImport} className="hidden" />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          collisionDetection={pointerWithin}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <aside className="lg:col-span-3">
              <Sidebar />
            </aside>
            <section className="lg:col-span-9 min-h-[50vh]">
              <Outlet />
            </section>
          </div>
        </DndContext>
      </main>
    </div>
  )
}


