const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/authMiddleware');
const tableController = require('../controllers/tableController');

// Middleware to check if user is admin or branch manager
const authorizeAdminOrBranchManager = (req, res, next) => {
    if (req.user.role !== 'admin' && req.user.role !== 'Super_Admin' && req.user.role !== 'Branch_Manager') {
        return res.status(403).json({ message: 'Access denied. Required role: admin, Super_Admin, or branch_manager' });
    }
    next();
};

// All routes require authentication
router.use(authenticateJWT);

// All routes require admin or branch manager role
router.use(authorizeAdminOrBranchManager);

// Basic CRUD routes
router.route('/')
    .post(tableController.createTable)
    .get(tableController.getTables);

router.route('/zones')
    .get(tableController.getTableZones);

router.route('/available')
    .get(tableController.getAvailableTables);

router.route('/with-orders')
    .get(tableController.getTablesWithOrders);

router.route('/positions')
    .put(tableController.updateTablePositions);

// Single table routes
router.route('/:id')
    .get(tableController.getTable)
    .put(tableController.updateTable)
    .delete(tableController.deleteTable);

router.route('/:id/status')
    .put(tableController.updateTableStatus);

// Reservation routes
router.route('/:id/reservations')
    .post(tableController.createReservation)
    .get(tableController.getTableReservations);

router.route('/:id/reservations/:reservationId')
    .put(tableController.updateReservation);

router.route('/:id/reservations/:reservationId/cancel')
    .put(tableController.cancelReservation);

// Order assignment routes
router.route('/:id/assign-order')
    .put(tableController.assignTableToOrder);

router.route('/:id/release')
    .put(tableController.releaseTable);

module.exports = router;