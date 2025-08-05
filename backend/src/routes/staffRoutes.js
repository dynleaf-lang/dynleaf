const express = require('express');
const router = express.Router();
const {
    getStaffByBranch,
    createStaff,
    updateStaff,
    deleteStaff,
    updateStaffStatus,
    getStaffStats
} = require('../controllers/staffController');
const { authenticateJWT } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authenticateJWT);

// Staff management routes (Branch Manager only)
// GET /api/staff/branch/:branchId - Get all staff for a branch
router.get('/branch/:branchId', getStaffByBranch);

// GET /api/staff/branch/:branchId/stats - Get staff statistics for a branch
router.get('/branch/:branchId/stats', getStaffStats);

// POST /api/staff/branch/:branchId - Create new staff member
router.post('/branch/:branchId', createStaff);

// PUT /api/staff/branch/:branchId/:staffId - Update staff member
router.put('/branch/:branchId/:staffId', updateStaff);

// PATCH /api/staff/branch/:branchId/:staffId/status - Update staff status
router.patch('/branch/:branchId/:staffId/status', updateStaffStatus);

// DELETE /api/staff/branch/:branchId/:staffId - Delete staff member
router.delete('/branch/:branchId/:staffId', deleteStaff);

module.exports = router;
