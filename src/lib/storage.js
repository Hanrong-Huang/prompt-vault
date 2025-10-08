import { createClient } from '@supabase/supabase-js'
import { set as idbSet, get as idbGet } from 'idb-keyval'

const STORAGE_KEY = 'prompt-vault-v2'
const DELETED_CATEGORIES_KEY = 'prompt-vault-deleted-categories'

function generateId(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
}

function now() {
  return Date.now()
}

async function getDeletedCategories() {
  const data = (await idbGet(DELETED_CATEGORIES_KEY)) || JSON.parse(localStorage.getItem(DELETED_CATEGORIES_KEY) || '[]')
  return data
}

async function saveDeletedCategories(deletedCategories) {
  localStorage.setItem(DELETED_CATEGORIES_KEY, JSON.stringify(deletedCategories))
  await idbSet(DELETED_CATEGORIES_KEY, deletedCategories)
}

function getSupabase() {
  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null
  return createClient(url, anonKey)
}

const SEED_CATEGORIES = [
  { name: 'Asking', prompts: [
    { title: 'Clarify Requirements', text: 'Please clarify the specific requirements and constraints for this task. What are the expected inputs, outputs, and edge cases I should consider?' },
    { title: 'Ask for Examples', text: 'Can you provide 2-3 concrete examples of what you\'re looking for? This will help me understand the pattern and deliver exactly what you need.' },
    { title: 'Scope Confirmation', text: 'Before I proceed, let me confirm the scope: [summarize understanding]. Is this correct, or should I adjust my approach?' }
  ]},
  { name: 'Planning', prompts: [
    { title: 'Break Down Task', text: 'Break this down into smaller, manageable steps with clear priorities. What should be tackled first and what can wait?' },
    { title: 'Architecture Planning', text: 'Help me design a clean, scalable architecture for this feature. What are the key components and how should they interact?' },
    { title: 'Risk Assessment', text: 'What potential issues or blockers should I be aware of with this approach? How can we mitigate these risks early?' }
  ]},
  { name: 'Coding', prompts: [
    { title: 'Clean Code Request', text: 'Write clear, simple code that focuses on the core functionality. Avoid over-engineering and keep it maintainable. Remove any unused functions.' },
    { title: 'Minimal Conditionals', text: 'Implement this with minimal use of elif/else statements. Use early returns and guard clauses instead of nested conditionals where possible.' },
    { title: 'Single Responsibility', text: 'Create focused functions that do one thing well. Each function should have a clear, single purpose and be easy to test.' }
  ]},
  { name: 'Debugging', prompts: [
    { title: 'Systematic Debug', text: 'Help me debug this step by step: 1) Identify the expected vs actual behavior, 2) Isolate the problem area, 3) Check common causes.' },
    { title: 'Error Analysis', text: 'Analyze this error message and suggest the most likely causes and solutions, starting with the simplest fixes first.' },
    { title: 'Reproduction Steps', text: 'Provide minimal steps to reliably reproduce this issue, including the exact environment and input conditions.' }
  ]},
  { name: 'Reviewing', prompts: [
    { title: 'Code Review', text: 'Review this code for: 1) Logic correctness, 2) Performance issues, 3) Security concerns, 4) Maintainability improvements.' },
    { title: 'Best Practices Check', text: 'Does this code follow best practices? Check for proper error handling, naming conventions, and adherence to SOLID principles.' },
    { title: 'Test Coverage', text: 'What test cases should I write for this code? Include happy path, edge cases, and error conditions.' }
  ]},
  { name: 'Refactoring', prompts: [
    { title: 'Simplify Code', text: 'Help me refactor this code to be simpler and more readable while maintaining the same functionality. Remove any unnecessary complexity.' },
    { title: 'Extract Functions', text: 'Identify opportunities to extract reusable functions from this code. Focus on reducing duplication and improving modularity.' },
    { title: 'Improve Performance', text: 'Suggest performance improvements for this code. Focus on algorithmic efficiency and removing bottlenecks.' }
  ]},
  { name: 'Docs/Comments', prompts: [
    { title: 'Function Documentation', text: 'Write clear, concise documentation for this function including purpose, parameters, return value, and usage examples.' },
    { title: 'README Section', text: 'Create a clear README section explaining how to set up, use, and contribute to this project. Include examples and common issues.' },
    { title: 'Inline Comments', text: 'Add helpful inline comments explaining the "why" behind complex logic, not just the "what". Focus on business logic and non-obvious decisions.' }
  ]},
  { name: 'Testing', prompts: [
    { title: 'Unit Tests', text: 'List minimal unit tests for [module]: happy path, edge cases, and failure modes.' },
    { title: 'Integration Flow', text: 'Outline an integration test for [feature]: setup, steps, expected outputs, and teardown.' },
    { title: 'Boundary Checks', text: 'Enumerate boundary inputs for [function] and the expected handling for each.' }
  ]},
  { name: 'Performance', prompts: [
    { title: 'Measure First', text: 'Suggest a lightweight measurement plan for [code]: metrics, tools, and success thresholds.' },
    { title: 'Hotspots', text: 'Identify likely hotspots and cheaper algorithmic alternatives before micro-optimizations.' },
    { title: 'Data Size Sensitivity', text: 'Assess how performance scales with input size and propose guardrails.' }
  ]},
  { name: 'Prompting', prompts: [
    { title: 'Task Framing', text: 'Rewrite [task] with clear objective, constraints, and acceptance criteria. Ask 2 clarifying questions.' },
    { title: 'Few-shot Examples', text: 'Create 2–3 examples showing ideal outputs for [task], plus one counterexample.' },
    { title: 'Self-Check Step', text: 'Add a final checklist to verify constraints, correctness, and tone before answering.' }
  ]}
]

async function mergeSeedCategories(state) {
  const deletedCategories = await getDeletedCategories()
  const deletedNamesLower = new Set(deletedCategories.map((c) => c.toLowerCase()))
  const namesLower = new Set(state.categories.map((c) => c.name.toLowerCase()))
  let changed = false
  let maxOrder = state.categories.reduce((m, c) => Math.max(m, c.order || 0), 0)
  const toAdd = []
  for (const seedCat of SEED_CATEGORIES) {
    // Only add seed categories that don't exist AND haven't been deleted
    if (!namesLower.has(seedCat.name.toLowerCase()) && !deletedNamesLower.has(seedCat.name.toLowerCase())) {
      changed = true
      maxOrder += 1
      toAdd.push({ id: generateId('cat'), name: seedCat.name, createdAt: now(), updatedAt: now(), order: maxOrder })
    }
  }
  if (!changed) return state
  return { ...state, categories: [...state.categories, ...toAdd] }
}

async function readLocal() {
  const data = (await idbGet(STORAGE_KEY)) || JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
  if (data) return await mergeSeedCategories(data)
  
  const nowTs = now()
  const seedCats = SEED_CATEGORIES.map((cat, i) => ({ 
    id: `cat_seed_${i+1}`, 
    name: cat.name, 
    createdAt: nowTs, 
    updatedAt: nowTs, 
    order: i + 1 
  }))
  
  const seedPrompts = []
  let promptOrder = 1
  for (const cat of SEED_CATEGORIES) {
    const categoryId = `cat_seed_${SEED_CATEGORIES.indexOf(cat) + 1}`
    for (const prompt of cat.prompts) {
      seedPrompts.push({
        id: generateId('p'),
        title: prompt.title,
        text: prompt.text,
        categoryId,
        favorite: false,
        order: promptOrder++,
        createdAt: nowTs,
        updatedAt: nowTs
      })
    }
  }
  
  const initial = { categories: seedCats, prompts: seedPrompts }
  await writeLocal(initial)
  return initial
}

async function writeLocal(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  await idbSet(STORAGE_KEY, data)
}

export async function getState() {
  const supabase = getSupabase()
  if (!supabase) return readLocal()
  const { data, error } = await supabase.from('prompt_vault').select('data').single()
  if (error && error.code !== 'PGRST116') return readLocal()
  if (!data || !data.data) return readLocal()
  return await mergeSeedCategories(data.data)
}

export async function saveState(state) {
  const supabase = getSupabase()
  await writeLocal(state)
  if (!supabase) return
  const { error } = await supabase.from('prompt_vault').upsert({ id: 1, data: state })
  if (error) console.warn('Supabase save failed, using local only', error)
}

export async function createCategory(name) {
  const state = await getState()
  const category = { id: generateId('cat'), name, createdAt: now(), updatedAt: now(), order: (state.categories.at(-1)?.order || 0) + 1 }
  const next = { ...state, categories: [...state.categories, category] }
  await saveState(next)
  return category
}

export async function renameCategory(id, name) {
  const state = await getState()
  const categories = state.categories.map((c) => (c.id === id ? { ...c, name, updatedAt: now() } : c))
  const next = { ...state, categories }
  await saveState(next)
}

export async function deleteCategory(id) {
  const state = await getState()
  const categoryToDelete = state.categories.find(c => c.id === id)
  
  // Track deleted seed categories to prevent them from being re-added
  if (categoryToDelete) {
    const isSeedCategory = SEED_CATEGORIES.some(seedCat => 
      seedCat.name.toLowerCase() === categoryToDelete.name.toLowerCase()
    )
    
    if (isSeedCategory) {
      const deletedCategories = await getDeletedCategories()
      if (!deletedCategories.includes(categoryToDelete.name)) {
        await saveDeletedCategories([...deletedCategories, categoryToDelete.name])
      }
    }
  }
  
  const categories = state.categories.filter((c) => c.id !== id)
  const prompts = state.prompts.map((p) => (p.categoryId === id ? { ...p, categoryId: '' } : p))
  const next = { ...state, categories, prompts }
  await saveState(next)
}

export async function reorderCategories(idsInOrder) {
  const state = await getState()
  const orderMap = new Map(idsInOrder.map((id, i) => [id, i + 1]))
  const categories = state.categories.map((c) => ({ ...c, order: orderMap.get(c.id) || c.order }))
  const next = { ...state, categories }
  await saveState(next)
}

export async function createPrompt(partial) {
  const state = await getState()
  const siblingOrders = state.prompts.filter((p) => p.categoryId === (partial.categoryId || '')).map((p) => p.order || 0)
  const nextOrder = (siblingOrders.length ? Math.max(...siblingOrders) : 0) + 1
  const prompt = { id: generateId('p'), favorite: false, order: nextOrder, createdAt: now(), updatedAt: now(), ...partial }
  const next = { ...state, prompts: [prompt, ...state.prompts] }
  await saveState(next)
  return prompt
}

export async function updatePrompt(id, updates) {
  const state = await getState()
  const prompts = state.prompts.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: now() } : p))
  const next = { ...state, prompts }
  await saveState(next)
}

export async function deletePrompt(id) {
  const state = await getState()
  const prompts = state.prompts.filter((p) => p.id !== id)
  const next = { ...state, prompts }
  await saveState(next)
}

export async function movePrompt(promptId, toCategoryId) {
  return updatePrompt(promptId, { categoryId: toCategoryId })
}

export async function reorderPrompts(categoryId, idsInOrder) {
  const state = await getState()
  const orderMap = new Map(idsInOrder.map((id, i) => [id, i + 1]))
  
  if (categoryId === '') {
    // For global reordering (like favorites), update all prompts
    const prompts = state.prompts.map((p) => ({ ...p, order: orderMap.get(p.id) || p.order }))
    const next = { ...state, prompts }
    await saveState(next)
  } else {
    // For category-specific reordering, only update prompts in that category
    const prompts = state.prompts.map((p) => p.categoryId === categoryId ? { ...p, order: orderMap.get(p.id) || p.order } : p)
    const next = { ...state, prompts }
    await saveState(next)
  }
}

export async function restoreDeletedCategory(categoryName) {
  const deletedCategories = await getDeletedCategories()
  const updatedDeleted = deletedCategories.filter(name => name !== categoryName)
  await saveDeletedCategories(updatedDeleted)
}


