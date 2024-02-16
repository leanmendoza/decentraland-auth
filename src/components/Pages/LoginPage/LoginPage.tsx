// import { isElectron } from '../../../integration/desktop'
import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAfterLoginRedirection } from '../../../hooks/redirection'
import { useAfterLoginRenavigation } from '../../../hooks/renavigation'
import { Connection, ConnectionOptionType } from '../../Connection'
import { ConnectionModal, ConnectionModalState } from '../../ConnectionModal'
import { WalletInformationModal } from '../../WalletInformationModal'
import styles from './LoginPage.module.css'
import { connectToProvider, getSignature } from './utils'

export const LoginPage = () => {
  const [connectionModalState, setConnectionModalState] = useState(ConnectionModalState.CONNECTING_WALLET)
  const [showLearnMore, setShowLearnMore] = useState(false)
  const [showConnectionModal, setShowConnectionModal] = useState(false)
  const redirectTo = useAfterLoginRedirection()
  const navigateTo = useAfterLoginRenavigation()
  const navigate = useNavigate()



  const handleLearnMore = useCallback(() => {
    setShowLearnMore(!showLearnMore)
  }, [setShowLearnMore, showLearnMore])

  const handleOnConnect = useCallback(
    async (connectionType: ConnectionOptionType) => {
      setShowConnectionModal(true)
      setConnectionModalState(ConnectionModalState.CONNECTING_WALLET)
      try {
        const connectionData = await connectToProvider(connectionType)
        setConnectionModalState(ConnectionModalState.WAITING_FOR_SIGNATURE)
        await getSignature(connectionData.account?.toLowerCase() ?? '', connectionData.provider)
        // Do something after logging in
        if (redirectTo) {
          window.location.href = redirectTo
        } else {
          navigate(navigateTo ?? '/user')
        }
        setShowConnectionModal(false)
      } catch (error) {
        setConnectionModalState(ConnectionModalState.ERROR)
      }
    },
    [setConnectionModalState, setShowConnectionModal, redirectTo, navigateTo]
  )

  const handleOnCloseConnectionModal = useCallback(() => {
    setShowConnectionModal(false)
    setConnectionModalState(ConnectionModalState.CONNECTING_WALLET)
  }, [setShowConnectionModal])

  return (
    <main className={styles.main}>
      <WalletInformationModal open={showLearnMore} onClose={handleLearnMore} />
      <ConnectionModal
        open={showConnectionModal}
        state={connectionModalState}
        onClose={handleOnCloseConnectionModal}
        onTryAgain={() => console.log('On try again')}
      />

      <div className={styles.left}>
        <Connection
          className={styles.connection}
          onLearnMore={handleLearnMore}
          onConnect={handleOnConnect}
          socialOptions={{
            primary: ConnectionOptionType.GOOGLE,
            secondary: [ConnectionOptionType.DISCORD, ConnectionOptionType.APPLE, ConnectionOptionType.X, ConnectionOptionType.FACEBOOK]
          }}
          web3Options={{
            primary: ConnectionOptionType.METAMASK,
            extra: ConnectionOptionType.WALLET_CONNECT,
            secondary: [ConnectionOptionType.FORTMATIC, ConnectionOptionType.COINBASE]
          }}
        />
      </div>
    </main>
  )
}
