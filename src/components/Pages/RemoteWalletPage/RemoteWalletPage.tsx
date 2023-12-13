import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { connection } from 'decentraland-connect'
import { fetchRequest, handleRequest } from './server'

export function isErrorWithMessage(error: unknown): error is Error {
  return error !== undefined && error !== null && typeof error === 'object' && 'message' in error
}

type RemoteWalletPageError = {
  id: 'wrong-parameter' | 'unknown-error' | 'server-error'
  reason: string
}

export const RemoteWalletPage = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const [loading, setLoading] = useState<string>('')
  const [displayError, setDisplayError] = useState<RemoteWalletPageError | undefined>(undefined)

  async function init() {
    const search = new URLSearchParams(location.search)
    const requestId = decodeURI(search.get('requestId') || '')
    // TODO: this server endpoint should be provided here, not in the query string
    const serverEndpoint = decodeURI(search.get('serverEndpoint') || '')

    if (requestId.length === 0) {
      setDisplayError({ id: 'wrong-parameter', reason: 'The request id is empty' })
      return
    }

    if (serverEndpoint.length === 0) {
      setDisplayError({ id: 'wrong-parameter', reason: 'The server endpoint is empty' })
      return
    }

    const to = encodeURIComponent(`/remote-wallet?&requestId=${requestId}&serverEndpoint=${serverEndpoint}`)
    const needLoginNavigation = `/login?navigateTo=${to}`

    setLoading('Recovering account')

    try {
      const connectionData = await connection.tryPreviousConnection()
      if (connectionData === null) {
        navigate(needLoginNavigation)
        return
      }
    } catch (error) {
      console.error(error)
      navigate(needLoginNavigation)
    }

    try {
      setLoading('Recovering requester')
      const request = await fetchRequest(requestId, serverEndpoint)

      setLoading('Resolving request')
      await handleRequest(request, requestId, serverEndpoint)

      // TODO: maybe a feedback before closing?
      // a deeplink could be open to focus the explorer client (if it applies)
      window.close()
    } catch (error) {
      console.error(error)
      setDisplayError({ id: 'unknown-error', reason: isErrorWithMessage(error) ? error.message : 'There was an unknown error' })
    }
  }

  useEffect(() => {
    init()
  }, [])

  return (
    <div>
      {loading !== '' && <p>{loading} Please wait...</p>}
      <div>{displayError ? <p>Error: {`${displayError.id} Reason: ${displayError.reason}`}</p> : null}</div>
    </div>
  )
}
