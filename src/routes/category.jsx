import { useParams } from 'react-router-dom'
import { PromptList } from '../components/PromptList.jsx'

export default function CategoryRoute() {
  const { id } = useParams()
  return <PromptList categoryId={id} />
}


