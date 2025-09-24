import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Add this configuration to handle JSX in .js files
      include: '**/*.{jsx,js,ts,tsx}',
    })
  ],
  resolve: {
    extensions: ['.js', '.jsx', '.json']
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  },
  server: {
    host: '0.0.0.0',   // Listen on all network interfaces
    port: 5175,        // Use an alternative Vite port to avoid conflicts
    strictPort: true,   // Always use port 5175, fail if in use
    proxy: {
      // Proxy API requests to the backend server on port 5001
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
