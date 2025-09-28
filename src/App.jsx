import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppShell } from './components/AppShell.jsx'
import IndexRoute from './routes/index.jsx'
import FavoritesRoute from './routes/favorites.jsx'
import CategoryRoute from './routes/category.jsx'

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <IndexRoute /> },
      { path: 'favorites', element: <FavoritesRoute /> },
      { path: 'category/:id', element: <CategoryRoute /> },
    ],
  },
], {
  basename: '/prompt-vault'
})

export default function App() {
  return <RouterProvider router={router} />
}
