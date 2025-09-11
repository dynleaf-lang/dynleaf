const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/whatsappController');

// Webhook endpoint for Meta verification and messages
router.get('/webhook', ctrl.webhook);
router.post('/webhook', ctrl.webhook);

// Short-link redirect: /r/:code -> long customer portal URL
router.get('/r/:code', ctrl.redirectShortLink);

// Utility to generate magic link (admin/internal/testing)
router.post('/generate-magic', ctrl.generateMagicLink);

// Quick health check for tunnel/route verification
router.get('/ping', (req, res) => {
	res.json({ ok: true, path: '/api/integrations/whatsapp/ping', time: new Date().toISOString() });
});

// Debug: inspect configured WA number details (token + permissions)
router.get('/inspect', ctrl.inspectNumber);

// Debug: test send to a provided number (?to=E164)
router.post('/test-send', ctrl.testSend);

module.exports = router;
