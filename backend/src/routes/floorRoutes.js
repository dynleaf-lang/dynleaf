const express = require('express');
const router = express.Router();
const { 
    getFloors, 
    getFloorById, 
    createFloor, 
    updateFloor, 
    deleteFloor,
    getFloorsByRestaurant
} = require('../controllers/floorController');
const { authenticateJWT, authorize } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateJWT);

// Routes for /api/floors
router
    .route('/')
    .get(authorize('Super_Admin', 'Branch_Manager', 'admin'), getFloors)
    .post(authorize('Super_Admin', 'Branch_Manager', 'admin'), createFloor);

// Route to get floors by restaurant ID
router
    .route('/restaurant/:id')
    .get(authorize('Super_Admin', 'Branch_Manager', 'admin'), getFloorsByRestaurant);

// Routes for /api/floors/:id
router
    .route('/:id')
    .get(authorize('Super_Admin', 'Branch_Manager', 'admin'), getFloorById)
    .put(authorize('Super_Admin', 'Branch_Manager', 'admin'), updateFloor)
    .delete(authorize('Super_Admin', 'Branch_Manager', 'admin'), deleteFloor);

module.exports = router;