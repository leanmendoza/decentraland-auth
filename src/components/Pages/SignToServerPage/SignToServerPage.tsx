import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BrowserProvider } from 'ethers'
import { connection } from 'decentraland-connect'

export function isErrorWithMessage(error: unknown): error is Error {
  return error !== undefined && error !== null && typeof error === 'object' && 'message' in error
}

async function isConnected() {
  const connectionData = await connection.tryPreviousConnection()
  return connectionData !== undefined
}

export const SignToServerPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const search = new URLSearchParams(location.search)

  const [loading, setLoading] = useState<boolean>(true)
  const [signatureError, setSignatureError] = useState<string>()
  const [signedMessage, setSignedMessage] = useState<string>()
  const [sendToServerError, setSendToServerError] = useState<string>()

  const payloadToSign = decodeURI(search.get('payload') || '')
  const requestId = decodeURI(search.get('id') || '')

  useEffect(() => {
    if (!loading) return

    console.log('first useEffect')

    if (payloadToSign.length === 0) {
      navigate('/login?error=wrong-payload')
      return
    }

    if (requestId.length === 0) {
      navigate('/login?error=wrong-request-id')
      return
    }

    const to = encodeURI(`/sign-to-server?payload=${payloadToSign}&id=${requestId}`)
    const needLoginNavigation = `/login?navigateTo=${to}`

    isConnected()
      .then(isConnected => {
        if (!isConnected) {
          navigate(needLoginNavigation)
        } else {
          setLoading(false)
          handleSign()
        }
      })
      .catch(_error => {
        navigate(needLoginNavigation)
      })
  })

  const handleSign = useCallback(async () => {
    setSignatureError(undefined)
    setSignedMessage(undefined)
    try {
      const connectionData = await connection.tryPreviousConnection()
      const provider = new BrowserProvider(connectionData.provider)
      const signer = await provider.getSigner()
      const message = await signer.signMessage(payloadToSign)
      setSignedMessage(message)
    } catch (error) {
      setSignatureError(isErrorWithMessage(error) ? error.message : 'Unknown error')
    }
  }, [])

  useEffect(() => {
    if (signedMessage?.length) {
      fetch('http://localhost:3000/task', {
        method: 'POST',
        headers: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: requestId,
          data: {
            signature: signedMessage
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
  }, [signedMessage])

  return (
    <div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <h1>Signing the requested message</h1>
          <div>
            {signedMessage ? <p>Signed message: {signedMessage}</p> : null}
            {signatureError ? <p>Error: {signatureError}</p> : null}
            {sendToServerError ? <p>Server Error: {sendToServerError}</p> : null}
          </div>
        </>
      )}
    </div>
  )
}
