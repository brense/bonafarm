import { useParams } from 'react-router-dom'
import { useAppBarContext } from '../App'

export default function Feed() {
  const { feedType } = useParams<{ feedType: string }>()
  useAppBarContext(() => ({ showLogo: false, children: 'Voertype' }), [])

  return <>Voertype...</>
}
