import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './i18n'
import App from './App.tsx'
import { setSitekitLocaleResolver } from './sitekit-sdk/client'
import { currentLang } from './services/api'
import { seedBootData } from './lib/boot'

setSitekitLocaleResolver(currentLang)
seedBootData()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
