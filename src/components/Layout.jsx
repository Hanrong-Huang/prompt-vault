import { Sidebar } from './Sidebar.jsx'
import { PromptList } from './PromptList.jsx'

export function Layout() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <aside className="lg:col-span-3">
        <Sidebar />
      </aside>
      <section className="lg:col-span-9">
        <PromptList />
      </section>
    </div>
  )
}


