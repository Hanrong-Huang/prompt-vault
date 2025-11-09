import { useEffect, useMemo, useState } from 'react'
import { Copy, Pencil, Trash2, Star, StarOff, Plus } from 'lucide-react'
import { useVaultStore } from '../store/useVaultStore.js'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function copyToClipboard(text, onSuccess) {
  navigator.clipboard?.writeText(text).then(() => {
    onSuccess?.()
  }).catch(() => {})
}

function SortablePrompt({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    data: { type: 'prompt' }
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 'auto'
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div className="flex items-start gap-2 cursor-grab hover:cursor-grabbing touch-none" style={{ touchAction: 'none' }}>
        <div className="p-2 -ml-2 -mt-1 flex items-center">
          <svg width="16" height="16" viewBox="0 0 16 16" className="text-[#858585] hover:text-white transition-colors">
            <circle cx="3" cy="6" r="1" fill="currentColor" />
            <circle cx="3" cy="10" r="1" fill="currentColor" />
            <circle cx="8" cy="6" r="1" fill="currentColor" />
            <circle cx="8" cy="10" r="1" fill="currentColor" />
            <circle cx="13" cy="6" r="1" fill="currentColor" />
            <circle cx="13" cy="10" r="1" fill="currentColor" />
          </svg>
        </div>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  )
}

function PromptCard({ prompt, onEdit, onDelete, onToggleFav }) {
  const [copyStatus, setCopyStatus] = useState('')

  const handleCopy = () => {
    copyToClipboard(prompt.text, () => {
      setCopyStatus('Copied!')
      setTimeout(() => setCopyStatus(''), 2000)
    })
  }

  return (
    <div id={`prompt-${prompt.id}`} className="rounded-lg border border-gray-200 dark:border-[#464647] bg-white dark:bg-[#252526] p-4 shadow-lg dark:shadow-black/50 transition-all duration-300 hover:shadow-xl dark:hover:shadow-black/70">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium truncate">{prompt.title}</h3>
            {prompt.favorite && <Star size={14} className="text-amber-500" />}
          </div>
          <p className="mt-1 text-sm text-gray-600 dark:text-[#e0e0e0] whitespace-pre-wrap break-words">{prompt.text}</p>
        </div>
        <div className="flex flex-col gap-1">
          <div className="relative">
            <button className="p-1 rounded hover:bg-gray-200 dark:hover:bg-[#2a2d2e] text-gray-700 dark:text-white transition-all duration-200 hover:scale-110" title="Copy" onClick={handleCopy}><Copy size={16} /></button>
            {copyStatus && <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-500 text-white text-xs px-2 py-1 rounded shadow-lg">{copyStatus}</div>}
          </div>
          <button className="p-1 rounded hover:bg-gray-200 dark:hover:bg-[#2a2d2e] text-[#007acc] transition-all duration-200 hover:scale-110" title="Edit" onClick={() => onEdit(prompt)}><Pencil size={16} /></button>
          <button className="p-1 rounded hover:bg-gray-200 dark:hover:bg-[#2a2d2e] text-[#f48771] transition-all duration-200 hover:scale-110" title="Delete" onClick={() => onDelete(prompt)}><Trash2 size={16} /></button>
          <button className="p-1 rounded hover:bg-gray-200 dark:hover:bg-[#2a2d2e] text-orange-500 transition-all duration-200 hover:scale-110" title="Favorite" onClick={() => onToggleFav(prompt)}>{prompt.favorite ? <StarOff size={16} /> : <Star size={16} />}</button>
        </div>
      </div>
    </div>
  )
}

function PromptEditor({ initial, onSave, onCancel }) {
  const [title, setTitle] = useState(initial?.title || '')
  const [text, setText] = useState(initial?.text || '')
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave({ title, text }) }} className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
      <div className="flex gap-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="flex-1 min-w-0 rounded-md border border-zinc-200 dark:border-zinc-800 bg-transparent px-2 py-1 text-sm" />
        <div className="flex gap-2 shrink-0">
          <button className="rounded-md border border-zinc-900 dark:border-white bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 px-3 py-1 text-sm whitespace-nowrap">Save</button>
          <button type="button" className="rounded-md border border-zinc-200 dark:border-zinc-800 px-3 py-1 text-sm whitespace-nowrap" onClick={onCancel}>Cancel</button>
        </div>
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Prompt text" rows={6} className="mt-2 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-transparent px-2 py-1 text-sm"></textarea>
    </form>
  )
}

export function PromptList({ categoryId, showFavorites }) {
  const store = useVaultStore()
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => { if (!store.ready) store.init() }, [store.ready])

  const prompts = useMemo(() => {
    let list = store.prompts
    if (categoryId) list = list.filter((p) => p.categoryId === categoryId)
    if (showFavorites) list = list.filter((p) => p.favorite)
    if (store.filter) {
      const q = store.filter.toLowerCase()
      list = list.filter((p) => p.title.toLowerCase().includes(q) || p.text.toLowerCase().includes(q))
    }
    return [...list].sort((a, b) => (a.order || 0) - (b.order || 0))
  }, [store.prompts, store.filter, categoryId, showFavorites])


  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Prompts</h2>
        {!creating && <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1 text-sm rounded-md border border-zinc-200 dark:border-zinc-800 px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-900"><Plus size={14} /> New</button>}
      </div>
      {creating && (
        <PromptEditor onSave={async (values) => { await store.createPrompt({ ...values, categoryId: categoryId || '' }); setCreating(false) }} onCancel={() => setCreating(false)} />
      )}
      {editing && (
        <PromptEditor initial={editing} onSave={async (values) => { await store.updatePrompt(editing.id, values); setEditing(null) }} onCancel={() => setEditing(null)} />
      )}
      <SortableContext items={prompts.map((p) => p.id)} strategy={verticalListSortingStrategy}>
        {prompts.map((p) => (
          <SortablePrompt id={p.id} key={p.id}>
            <PromptCard prompt={p} onEdit={setEditing} onDelete={(p) => store.deletePrompt(p.id)} onToggleFav={(p) => store.updatePrompt(p.id, { favorite: !p.favorite })} />
          </SortablePrompt>
        ))}
      </SortableContext>
    </div>
  )
}


