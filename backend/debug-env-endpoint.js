// Add this to your publicPaymentRoutes.js temporarily for debugging

router.get('/debug/env', (req, res) => {
  res.json({
    CASHFREE_ENV: process.env.CASHFREE_ENV,
    CASHFREE_WEBHOOK_URL: process.env.CASHFREE_WEBHOOK_URL,
    CASHFREE_APP_ID: process.env.CASHFREE_APP_ID ? 'Set' : 'Missing',
    CASHFREE_SECRET_KEY: process.env.CASHFREE_SECRET_KEY ? 'Set' : 'Missing',
    NODE_ENV: process.env.NODE_ENV,
    allEnvKeys: Object.keys(process.env).filter(k => k.startsWith('CASHFREE'))
  });
});