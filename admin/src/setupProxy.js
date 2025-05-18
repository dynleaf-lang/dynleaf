const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // API requests proxy
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:5001', // Updated to port 5000 which is standard for your backend
      ws: true, 
      changeOrigin: true,
      logLevel: 'debug',
      onError: (err, req, res) => {
        console.error('Proxy Error:', err);
        res.status(500).json({
          message: 'Error connecting to the API server. Make sure the backend is running.',
          error: err.message
        });
      }
    })
  );
};