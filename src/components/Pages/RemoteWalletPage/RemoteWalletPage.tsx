import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
  const { requestId } = useParams()
  const navigate = useNavigate()

  const [finished, setFinished] = useState<boolean>(false)
  const [loading, setLoading] = useState<string>('')
  const [displayError, setDisplayError] = useState<RemoteWalletPageError | undefined>(undefined)

  async function init() {
    if (requestId === undefined || requestId.length === 0) {
      setDisplayError({ id: 'wrong-parameter', reason: 'The request id is empty' })
      return
    }

    const to = encodeURIComponent(`/remote-wallet/${requestId}`)
    const needLoginNavigation = `/login?navigateTo=${to}`

    setLoading(
      "We are recovering your previous connection. If you don't have a previous connection, you will be redirected to the login page."
    )

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
      setLoading('Fetching the request to sign.')
      const request = await fetchRequest(requestId)

      setLoading('Resolving request, follow the instructions on your wallet.')
      await handleRequest(request, requestId)

      setLoading('')
      setFinished(true)
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
      {finished && <p>You can return back to the explorer.</p>}
      {loading !== '' && <p>{loading} Please wait...</p>}
      <div>{displayError ? <p>Error: {`${displayError.id} Reason: ${displayError.reason}`}</p> : null}</div>
    </div>
  )
}
