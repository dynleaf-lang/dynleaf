const router = require('express').Router();
const { protect } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/posSessionController');

router.get('/current', protect, ctrl.getCurrent);
router.get('/last-closed', protect, ctrl.getLastClosed);
router.post('/resolve-occupancy', protect, ctrl.resolveOccupancy);
router.post('/open', protect, ctrl.open);
router.post('/:id/close', protect, ctrl.close);

module.exports = router;
