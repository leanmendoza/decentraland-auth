/* eslint-disable import/order */
/* eslint-disable @typescript-eslint/naming-convention */
import 'semantic-ui-css/semantic.min.css'
import React from 'react'
import ReactDOM from 'react-dom'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { DefaultPage } from './components/Pages/DefaultPage'
import { CallbackPage } from './components/Pages/CallbackPage'
import { LoginPage } from './components/Pages/LoginPage'
import { RemoteWalletPage } from './components/Pages/RemoteWalletPage'
import 'decentraland-ui/dist/themes/alternative/dark-theme.css'
import './index.css'

const basename = /^decentraland.(zone|org|today)$/.test(window.location.host) ? '/auth' : '/'

ReactDOM.render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/callback" element={<CallbackPage />} />
        <Route path="/remote-wallet/:requestId" element={<RemoteWalletPage />} />
        <Route path="*" element={<DefaultPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
  document.getElementById('root')
)
