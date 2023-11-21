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
  const search = new URLSearchParams(location.search)

  const [loading, setLoading] = useState<boolean>(true)
  const [sendToServerError, setSendToServerError] = useState<string>()

  const requestId = decodeURI(search.get('id') || '')

  useEffect(() => {
    if (!loading) return

    console.log('first useEffect')

    if (requestId.length === 0) {
      navigate('/login?error=wrong-request-id')
      return
    }

    const to = encodeURI(`/get-account?id=${requestId}`)
    const needLoginNavigation = `/login?navigateTo=${to}`

    isConnected()
      .then(async isConnected => {
        if (!isConnected) {
          navigate(needLoginNavigation)
        } else {
          setLoading(false)
          const connectionData = await connection.tryPreviousConnection()
          fetch('http://localhost:3000/task', {
            method: 'POST',
            headers: {
              // eslint-disable-next-line @typescript-eslint/naming-convention
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              id: requestId,
              data: {
                address: connectionData.account || ''
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
