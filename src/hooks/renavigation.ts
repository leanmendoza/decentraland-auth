import { useLocation } from 'react-router-dom'

export const useAfterLoginRenavigation = () => {
  const location = useLocation()
  const search = new URLSearchParams(location.search)
  const navigateToSearchParam = search.get('navigateTo')
  if (navigateToSearchParam === null) return undefined
  return navigateToSearchParam
}
