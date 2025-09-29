import { create } from 'zustand'
import { getState, createCategory, renameCategory, deleteCategory, reorderCategories, createPrompt, updatePrompt, deletePrompt, movePrompt, reorderPrompts } from '../lib/storage.js'

export const useVaultStore = create((set) => ({
  ready: false,
  categories: [],
  prompts: [],
  filter: '',
  selectedCategoryId: '',

  init: async () => {
    const state = await getState()
    set({ ...state, ready: true })
  },

  setFilter: (filter) => set({ filter }),
  selectCategory: (id) => set({ selectedCategoryId: id || '' }),

  createCategory: async (name) => {
    const cat = await createCategory(name)
    const state = await getState()
    set({ ...state })
    return cat
  },
  renameCategory: async (id, name) => {
    await renameCategory(id, name)
    const state = await getState()
    set({ ...state })
  },
  deleteCategory: async (id) => {
    await deleteCategory(id)
    const state = await getState()
    set({ ...state, selectedCategoryId: '' })
  },
  reorderCategories: async (ids) => {
    await reorderCategories(ids)
    const state = await getState()
    set({ ...state })
  },

  createPrompt: async (partial) => {
    const p = await createPrompt(partial)
    const state = await getState()
    set({ ...state })
    return p
  },
  updatePrompt: async (id, updates) => {
    await updatePrompt(id, updates)
    const state = await getState()
    set({ ...state })
  },
  deletePrompt: async (id) => {
    await deletePrompt(id)
    const state = await getState()
    set({ ...state })
  },
  movePrompt: async (promptId, toCategoryId) => {
    await movePrompt(promptId, toCategoryId)
    const state = await getState()
    set({ ...state })
  },
  reorderPrompts: async (categoryId, ids) => {
    await reorderPrompts(categoryId, ids)
    const state = await getState()
    set({ ...state })
  },
}))


