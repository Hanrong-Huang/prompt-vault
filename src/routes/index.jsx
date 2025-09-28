import { PromptList } from '../components/PromptList.jsx'
import { useEffect } from 'react'
import { useVaultStore } from '../store/useVaultStore.js'

export default function IndexRoute() {
  const store = useVaultStore()
  useEffect(() => { if (!store.ready) store.init() }, [store.ready])
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const id = params.get('prompt')
    if (!id) return
    const el = document.getElementById(`prompt-${id}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('ring-2', 'ring-amber-500')
      setTimeout(() => el.classList.remove('ring-2', 'ring-amber-500'), 2000)
    }
  }, [store.prompts])
  return <PromptList />
}


