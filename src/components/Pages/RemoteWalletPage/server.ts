import { BrowserProvider } from 'ethers'
import { Provider, connection } from 'decentraland-connect'
import { AUTH_SERVER_ENDPOINT } from './config'
import { RPCSendableMessage, RemoteWalletRequest, RemoteWalletResponse } from './schemas'

function base64ToBytes(base64: string): Uint8Array {
  const binString = atob(base64)
  return Uint8Array.from(binString, (m, _) => m.charCodeAt(0))
}

export async function sendResponse(requestId: string, responseData: RemoteWalletResponse): Promise<boolean> {
  const response = await fetch(`${AUTH_SERVER_ENDPOINT}${requestId}`, {
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

export async function fetchRequest(requestId: string): Promise<RemoteWalletRequest> {
  const response = await fetch(`${AUTH_SERVER_ENDPOINT}${requestId}/request`)
  if (!response.ok) {
    throw new Error(response.statusText)
  }

  const payload = await response.json()
  if (!RemoteWalletRequest.validate(payload)) {
    console.error(RemoteWalletRequest.validate.errors)
    throw new Error('The request data is invalid')
  }

  return payload
}

async function sendAsync(provider: Provider, request: RPCSendableMessage) {
  return new Promise((resolve, reject) => {
    provider.sendAsync(request, (err, value) => {
      if (err) {
        reject(err)
      } else {
        resolve(value)
      }
    })
  })
}

export async function handleRequest(request: RemoteWalletRequest): Promise<RemoteWalletResponse> {
  const connectionData = await connection.tryPreviousConnection()
  if (connectionData === null) {
    throw new Error('The user is not connected')
  }

  if (request.byAddress !== undefined && request.byAddress !== request.byAddress) {
    throw new Error('The request is not for the current account')
  }

  switch (request.type) {
    case 'send-async': {
      const result = await sendAsync(connectionData.provider, request.body)
      return {
        ok: true,
        response: {
          id: 'send-async',
          result
        }
      }
      break
    }

    case 'sign': {
      const payloadToSignDecoded = base64ToBytes(request.b64Message)
      const provider = new BrowserProvider(connectionData.provider)
      const signer = await provider.getSigner()
      const message = await signer.signMessage(payloadToSignDecoded)
      return {
        ok: true,
        response: {
          id: 'sign',
          signature: message,
          account: connectionData.account || '',
          chainId: connectionData.chainId
        }
      }
    }
  }

  throw new Error('The request type is not supported')
}
