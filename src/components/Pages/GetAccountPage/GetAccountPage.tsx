import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { connection } from 'decentraland-connect'

export function isErrorWithMessage(error: unknown): error is Error {
  return error !== undefined && error !== null && typeof error === 'object' && 'message' in error
}

async function isConnected() {
  const connectionData = await connection.tryPreviousConnection()
  return connectionData !== undefined
}

export const GetAccountPage = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const [loading, setLoading] = useState<boolean>(true)
  const [sendToServerError, setSendToServerError] = useState<string>()

  useEffect(() => {
    if (!loading) return

    const search = new URLSearchParams(location.search)
    const requestId = decodeURI(search.get('id') || '')
    const serverEndpoint = decodeURI(search.get('server-endpoint') || '') // TODO: make this part of build or static config

    if (requestId.length === 0) {
      navigate('/login?error=wrong-request-id')
      return
    }

    if (serverEndpoint.length === 0) {
      navigate('/login?error=wrong-server-endpoint')
      return
    }

    const to = encodeURI(`/get-account?id=${requestId}&server-endpoint=${serverEndpoint}`)
    const needLoginNavigation = `/login?navigateTo=${to}`

    isConnected()
      .then(async isConnected => {
        if (!isConnected) {
          navigate(needLoginNavigation)
        } else {
          setLoading(false)
          const connectionData = await connection.tryPreviousConnection()
          fetch(serverEndpoint, {
            method: 'POST',
            headers: {
              // eslint-disable-next-line @typescript-eslint/naming-convention
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              id: requestId,
              data: {
                address: connectionData.account || '',
                chainId: connectionData.chainId || 0
              }
            })
          })
            .then(response => {
              if (response.status >= 200 && response.status < 300) {
                navigate('/ok')
              } else {
                setSendToServerError('Unknown error')
              }
            })
            .catch(error => {
              setSendToServerError(isErrorWithMessage(error) ? error.message : 'Unknown error')
            })
        }
      })
      .catch(_error => {
        navigate(needLoginNavigation)
      })
  })

  return (
    <div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <h1>Fetched account</h1>
          <div>{sendToServerError ? <p>Server Error: {sendToServerError}</p> : null}</div>
        </>
      )}
    </div>
  )
}
