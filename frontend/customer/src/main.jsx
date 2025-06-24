import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { injectGlobalStyles } from './data/globalStyles'

// Inject global styles for animations and other global styling
injectGlobalStyles();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
