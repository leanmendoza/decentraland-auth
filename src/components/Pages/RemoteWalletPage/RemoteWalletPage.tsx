import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BrowserProvider } from 'ethers'
import { JSONSchema, ValidateFunction, generateLazyValidator } from '@dcl/schemas'
import { connection } from 'decentraland-connect'

export function isErrorWithMessage(error: unknown): error is Error {
  return error !== undefined && error !== null && typeof error === 'object' && 'message' in error
}

function base64ToBytes(base64: string): Uint8Array {
  const binString = atob(base64)
  return Uint8Array.from(binString, (m, _) => m.charCodeAt(0))
}

type RemoteWalletPageError = {
  id: 'wrong-parameter' | 'unknown-error' | 'server-error'
  reason: string
}

export type RPCSendableMessage = {
  jsonrpc: '2.0'
  id: number
  method: string
  params: unknown[]
}

export type RemoteWalletRequest =
  | {
      type: 'send-async'
      body: RPCSendableMessage
      byAddress?: string
    }
  | {
      type: 'sign'
      byAddress?: string
      b64Message: string
    }

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace RemoteWalletRequest {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const schema: JSONSchema<any> = {
    type: 'object',
    oneOf: [
      {
        type: 'object',
        properties: {
          type: { const: 'send-async' },
          byAddress: { type: 'string' },
          body: {
            type: 'object',
            properties: {
              jsonrpc: { const: '2.0' },
              id: { type: 'number' },
              method: { type: 'string' },
              params: { type: 'array' }
            },
            required: ['jsonrpc', 'id', 'method', 'params']
          }
        },
        required: ['type', 'body']
      },
      {
        type: 'object',
        properties: {
          type: { const: 'sign' },
          byAddress: { type: 'string' },
          b64Message: { type: 'string' }
        },
        required: ['type', 'b64Message']
      }
    ]
  }

  export const validate: ValidateFunction<RemoteWalletRequest> = generateLazyValidator(schema)
}

async function fetchRequest(requestId: string, serverEndpoint: string): Promise<RemoteWalletRequest> {
  const response = await fetch(`${serverEndpoint}${requestId}/request`)
  const payload = await response.json()

  if (!RemoteWalletRequest.validate(payload)) {
    console.error(RemoteWalletRequest.validate.errors)
    throw new Error('The request data is invalid')
  }

  return payload
}

async function handleRequest(request: RemoteWalletRequest, requestId: string, serverEndpoint: string) {
  const connectionData = await connection.tryPreviousConnection()
  if (connectionData === null) {
    throw new Error('The user is not connected')
  }

  switch (request.type) {
    case 'send-async': {
      // if (request.byAddress !== undefined && request.byAddress !== account) {
      //   throw new Error('The request is not for the current account')
      // }
      throw new Error('Not implemented')
      break
    }

    case 'sign': {
      const payloadToSignDecoded = base64ToBytes(request.b64Message)
      const provider = new BrowserProvider(connectionData.provider)
      const signer = await provider.getSigner()
      const message = await signer.signMessage(payloadToSignDecoded)
      await sendResponse(requestId, serverEndpoint, {
        signature: message,
        account: connectionData.account || '',
        chainId: connectionData.chainId
      })
      break
    }
  }
}

async function sendResponse(requestId: string, serverEndpoint: string, responseData: unknown): Promise<boolean> {
  const response = await fetch(`${serverEndpoint}${requestId}`, {
    method: 'PUT',
    headers: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: requestId,
      response: responseData
    })
  })

  if (!response.ok) {
    throw new Error(response.statusText)
  }

  return true
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

    const to = encodeURI(`/remote-wallet?&requestId=${requestId}`)
    const needLoginNavigation = `/login?navigateTo=${to}`

    setLoading('Recovering account')

    try {
      const connectionData = await connection.tryPreviousConnection()
      if (connectionData === null) {
        navigate(needLoginNavigation)
        return
      }

      setLoading('Recovering requester')
      const request = await fetchRequest(requestId, serverEndpoint)

      setLoading('Resolving request')
      await handleRequest(request, requestId, serverEndpoint)

      setLoading('')
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
