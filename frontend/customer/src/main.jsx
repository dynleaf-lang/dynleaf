import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import router from './router'
import { injectGlobalStyles } from './data/globalStyles'
import { setupGlobalErrorHandlers } from './utils/errorLogger'

// Inject global styles for animations and other global styling
injectGlobalStyles();

// Set up global error handlers to catch and log all errors/warnings
setupGlobalErrorHandlers();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
