const Floor = require('../models/Floor');
const mongoose = require('mongoose');
const DiningTable = require('../models/DiningTables'); // Using the correct model name

/**
 * Get all floors for a branch
 * @route GET /api/floors
 * @access Private - Branch Manager, Admin, Super Admin
 */
const getFloors = async (req, res) => {
    try {
        let query = {};

        // Filter by branch if provided
        if (req.query.branchId) {
            query.branchId = req.query.branchId;
        } 
        // If not explicitly requested for all floors and user is not Super_Admin, restrict to user's branch
        else if (req.user.role !== 'Super_Admin') {
            if (!req.user.branchId) {
                return res.status(400).json({
                    success: false,
                    message: 'Branch ID is required. User is not associated with any branch.',
                });
            }
            query.branchId = req.user.branchId;
        }

        // Filter by restaurant if provided
        if (req.query.restaurantId) {
            query.restaurantId = req.query.restaurantId;
        }
        // If not explicitly requested for all floors and user is not Super_Admin, restrict to user's restaurant
        else if (req.user.role !== 'Super_Admin') {
            if (!req.user.restaurantId) {
                return res.status(400).json({
                    success: false,
                    message: 'Restaurant ID is required. User is not associated with any restaurant.',
                });
            }
            query.restaurantId = req.user.restaurantId;
        }

        // Filter by active status if provided
        if (req.query.isActive !== undefined) {
            query.isActive = req.query.isActive === 'true';
        }

        // Get floors with sorting by level
        const floors = await Floor.find(query).sort({ level: 1 });

        return res.status(200).json({
            success: true,
            count: floors.length,
            data: floors,
        });
    } catch (error) {
        console.error('Error getting floors:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
};

/**
 * Get a single floor by ID
 * @route GET /api/floors/:id
 * @access Private - Branch Manager, Admin, Super Admin
 */
const getFloorById = async (req, res) => {
    try {
        const floor = await Floor.findById(req.params.id);

        if (!floor) {
            return res.status(404).json({
                success: false,
                message: 'Floor not found',
            });
        }

        // Check if user has permission to view this floor
        if (req.user.role !== 'Super_Admin' && 
            floor.branchId.toString() !== req.user.branchId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to view this floor',
            });
        }

        return res.status(200).json({
            success: true,
            data: floor,
        });
    } catch (error) {
        console.error('Error getting floor:', error);
        
        // Handle invalid ID format
        if (error instanceof mongoose.Error.CastError) {
            return res.status(400).json({
                success: false,
                message: 'Invalid floor ID',
            });
        }
        
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
};

/**
 * Get floors by restaurant ID
 * @route GET /api/floors/restaurant/:id
 * @access Private - Branch Manager, Admin, Super Admin
 */
const getFloorsByRestaurant = async (req, res) => {
    try {
        const restaurantId = req.params.id;
        
        if (!restaurantId) {
            return res.status(400).json({
                success: false,
                message: 'Restaurant ID is required'
            });
        }
        
        // Check if user has permission to view floors for this restaurant
        if (req.user.role !== 'Super_Admin' && 
            req.user.restaurantId.toString() !== restaurantId) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to view floors for this restaurant'
            });
        }
        
        // Build query - get floors for this restaurant
        const query = { restaurantId };
        
        // Filter by branch if user is not Super_Admin and has a branch assigned
        if (req.user.role !== 'Super_Admin' && req.user.branchId) {
            query.branchId = req.user.branchId;
        }
        
        // Filter by active status if provided
        if (req.query.isActive !== undefined) {
            query.isActive = req.query.isActive === 'true';
        }
        
        // Get floors with sorting by level
        const floors = await Floor.find(query).sort({ level: 1 });
        
        return res.status(200).json(floors);
    } catch (error) {
        console.error('Error getting floors by restaurant:', error);
        
        // Handle invalid ID format
        if (error instanceof mongoose.Error.CastError) {
            return res.status(400).json({
                success: false,
                message: 'Invalid restaurant ID format'
            });
        }
        
        return res.status(500).json({
            success: false,
            message: 'Server error when retrieving floors',
            error: error.message
        });
    }
};

/**
 * Create a new floor
 * @route POST /api/floors
 * @access Private - Branch Manager, Admin, Super Admin
 */
const createFloor = async (req, res) => {
    try {
        // Validate required fields
        const { name, level } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Floor name is required',
            });
        }

        // Set up the floor data
        let floorData = {
            ...req.body,
            level: level || 0,
        };

        // For non Super Admin users, use their assigned branch and restaurant
        if (req.user.role !== 'Super_Admin') {
            if (!req.user.branchId || !req.user.restaurantId) {
                return res.status(400).json({
                    success: false,
                    message: 'User must be associated with a branch and restaurant',
                });
            }
            floorData.branchId = req.user.branchId;
            floorData.restaurantId = req.user.restaurantId;
        } else {
            // For Super Admin, ensure branch and restaurant IDs are provided
            if (!floorData.branchId || !floorData.restaurantId) {
                return res.status(400).json({
                    success: false,
                    message: 'Branch and restaurant IDs are required',
                });
            }
        }

        // Check if floor with same level already exists at this branch
        const existingFloor = await Floor.findOne({
            branchId: floorData.branchId,
            level: floorData.level,
        });

        if (existingFloor) {
            return res.status(400).json({
                success: false,
                message: `A floor with level ${floorData.level} already exists at this branch`,
            });
        }

        // Create the floor
        const floor = await Floor.create(floorData);

        return res.status(201).json({
            success: true,
            data: floor,
        });
    } catch (error) {
        console.error('Error creating floor:', error);
        
        // Handle duplicate key error
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'A floor with the same level already exists at this branch',
            });
        }
        
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
};

/**
 * Update a floor
 * @route PUT /api/floors/:id
 * @access Private - Branch Manager, Admin, Super Admin
 */
const updateFloor = async (req, res) => {
    try {
        let floor = await Floor.findById(req.params.id);
        
        if (!floor) {
            return res.status(404).json({
                success: false,
                message: 'Floor not found',
            });
        }

        // Check if user has permission to update this floor
        if (req.user.role !== 'Super_Admin' && 
            floor.branchId.toString() !== req.user.branchId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to update this floor',
            });
        }

        // If level is being changed, check if it would conflict
        if (req.body.level !== undefined && req.body.level !== floor.level) {
            const existingFloor = await Floor.findOne({
                branchId: floor.branchId,
                level: req.body.level,
                _id: { $ne: floor._id },  // Exclude current floor
            });

            if (existingFloor) {
                return res.status(400).json({
                    success: false,
                    message: `A floor with level ${req.body.level} already exists at this branch`,
                });
            }
        }

        // Update the floor
        floor = await Floor.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });

        return res.status(200).json({
            success: true,
            data: floor,
        });
    } catch (error) {
        console.error('Error updating floor:', error);
        
        // Handle invalid ID format
        if (error instanceof mongoose.Error.CastError) {
            return res.status(400).json({
                success: false,
                message: 'Invalid floor ID',
            });
        }
        
        // Handle duplicate key error
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'A floor with the same level already exists at this branch',
            });
        }
        
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
};

/**
 * Delete a floor
 * @route DELETE /api/floors/:id
 * @access Private - Branch Manager, Admin, Super Admin
 */
const deleteFloor = async (req, res) => {
    try {
        const floor = await Floor.findById(req.params.id);
        
        if (!floor) {
            return res.status(404).json({
                success: false,
                message: 'Floor not found',
            });
        }

        // Check if user has permission to delete this floor
        if (req.user.role !== 'Super_Admin' && 
            floor.branchId.toString() !== req.user.branchId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to delete this floor',
            });
        }

        // Check if there are tables on this floor
        const tablesOnFloor = await DiningTable.countDocuments({
            'location.floor': floor._id
        });

        if (tablesOnFloor > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete this floor as it has ${tablesOnFloor} tables assigned to it. Please reassign or delete these tables first.`
            });
        }

        await floor.deleteOne();

        return res.status(200).json({
            success: true,
            message: 'Floor deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting floor:', error);
        
        // Handle invalid ID format
        if (error instanceof mongoose.Error.CastError) {
            return res.status(400).json({
                success: false,
                message: 'Invalid floor ID',
            });
        }
        
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
};

module.exports = {
    getFloors,
    getFloorById,
    createFloor,
    updateFloor,
    deleteFloor,
    getFloorsByRestaurant
};