import { JSONSchema, ValidateFunction, generateLazyValidator } from '@dcl/schemas'

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
