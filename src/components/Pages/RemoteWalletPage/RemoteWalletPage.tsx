import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { connection } from 'decentraland-connect'
import { fetchRequest, handleRequest, sendResponse } from './server'
import styles from './RemoteWalletPage.module.css'
import classNames from 'classnames'


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
      const response = await handleRequest(request)
      await sendResponse(requestId, response)

      setLoading('')
      setFinished(true)
    } catch (error) {
      console.error(error)

      const reason = isErrorWithMessage(error) ? error.message : 'There was an unknown error'
      setDisplayError({ id: 'unknown-error', reason })
      setLoading(`Oh-oh. That's an error`)
      await sendResponse(requestId, { ok: false, reason })
    }
  }

  useEffect(() => {
    init()
  }, [])

  return (
    <div className={classNames(styles.main)}>
      <div className={classNames(styles.container)}>
        {displayError?null:<div className={styles.loader}></div>}
        {loading !== '' && <h2 className={styles.title}>{loading}</h2>}
        {finished && <h1 className={styles.title}>You can return back to the explorer.</h1>}
        <div>{displayError ? <p>Error: {`${displayError.id} Reason: ${displayError.reason}`}</p> : null}</div>
      </div>
    </div>
  )
}
