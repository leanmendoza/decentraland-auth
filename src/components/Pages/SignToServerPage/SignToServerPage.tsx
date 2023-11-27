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

function base64ToBytes(base64: string): Uint8Array {
  const binString = atob(base64)
  return Uint8Array.from(binString, (m, _) => m.charCodeAt(0))
}

export const SignToServerPage = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const [loading, setLoading] = useState<boolean>(true)
  const [signatureError, setSignatureError] = useState<string>()
  const [responseToServer, setResponseToServer] = useState<{ signature: string; account: string } | undefined>()
  const [sendToServerError, setSendToServerError] = useState<string>()

  useEffect(() => {
    if (!loading) return

    const search = new URLSearchParams(location.search)
    const payloadToSign = decodeURI(search.get('payload') || '')
    const requestId = decodeURI(search.get('id') || '')
    const serverEndpoint = decodeURI(search.get('server-endpoint') || '') // TODO: make this part of build or static config

    if (payloadToSign.length === 0) {
      navigate('/login?error=wrong-payload')
      return
    }

    if (requestId.length === 0) {
      navigate('/login?error=wrong-request-id')
      return
    }

    if (serverEndpoint.length === 0) {
      navigate('/login?error=wrong-server-endpoint')
      return
    }

    const to = encodeURI(`/sign-to-server?payload=${payloadToSign}&id=${requestId}&server-endpoint=${serverEndpoint}`)
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
    setResponseToServer(undefined)
    try {
      const search = new URLSearchParams(location.search)
      const account = decodeURI(search.get('account') || '')
      const payloadToSign = decodeURI(search.get('payload') || '')
      const payloadToSignDecoded = base64ToBytes(payloadToSign)

      const connectionData = await connection.tryPreviousConnection()
      if (account.length > 0 && connectionData.account?.toLowerCase() !== account.toLowerCase()) {
        throw new Error(`The account doesn't match ${account} !== ${connectionData.account} `)
      }

      const provider = new BrowserProvider(connectionData.provider)
      const signer = await provider.getSigner()
      const message = await signer.signMessage(payloadToSignDecoded)
      setResponseToServer({ signature: message, account: connectionData.account || '' })
    } catch (error) {
      setSignatureError(isErrorWithMessage(error) ? error.message : 'Unknown error')
    }
  }, [])

  useEffect(() => {
    if (responseToServer?.signature.length) {
      const search = new URLSearchParams(location.search)
      const requestId = decodeURI(search.get('id') || '')
      const serverEndpoint = decodeURI(search.get('server-endpoint') || '')

      fetch(serverEndpoint, {
        method: 'POST',
        headers: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: requestId,
          data: responseToServer
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
  }, [responseToServer])

  return (
    <div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <h1>Signing the requested message</h1>
          <div>
            {responseToServer?.signature ? <p>Signed message: {responseToServer.signature}</p> : null}
            {signatureError ? <p>Error: {signatureError}</p> : null}
            {sendToServerError ? <p>Server Error: {sendToServerError}</p> : null}
          </div>
        </>
      )}
    </div>
  )
}
