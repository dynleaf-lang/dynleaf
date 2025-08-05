const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Get all staff for a specific branch (Branch Manager only)
const getStaffByBranch = async (req, res) => {
    try {
        const { branchId } = req.params;
        const { staffType } = req.query; // 'employee', 'waiter', 'chef', or 'all'
        
        // Verify user is Branch Manager and has access to this branch
        if (req.user.role !== 'Branch_Manager' || req.user.branchId.toString() !== branchId) {
            return res.status(403).json({ 
                message: 'Access denied. Only branch managers can view staff for their branch.' 
            });
        }

        let roleFilter = {};
        
        // Filter by staff type
        if (staffType && staffType !== 'all') {
            switch (staffType) {
                case 'employee':
                    roleFilter.role = { $in: ['POS_Operator', 'Staff'] };
                    break;
                case 'waiter':
                    roleFilter.role = 'Waiter';
                    break;
                case 'chef':
                    roleFilter.role = 'Chef';
                    break;
                default:
                    roleFilter.role = { $in: ['POS_Operator', 'Staff', 'Waiter', 'Chef'] };
            }
        } else {
            roleFilter.role = { $in: ['POS_Operator', 'Staff', 'Waiter', 'Chef'] };
        }

        const staff = await User.find({
            branchId: branchId,
            isDeleted: false,
            ...roleFilter
        })
        .select('-password -emailVerificationOTP -resetPasswordOTP')
        .populate('restaurantId', 'name')
        .populate('branchId', 'name')
        .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: staff,
            count: staff.length
        });

    } catch (error) {
        console.error('Error fetching staff:', error);
        res.status(500).json({ 
            message: 'Error fetching staff', 
            error: error.message 
        });
    }
};

// Create new staff member (Branch Manager only)
const createStaff = async (req, res) => {
    try {
        const { branchId } = req.params;
        const { name, email, phoneNumber, password, role, status = 'active' } = req.body;
        
        // Verify user is Branch Manager and has access to this branch
        if (req.user.role !== 'Branch_Manager' || req.user.branchId.toString() !== branchId) {
            return res.status(403).json({ 
                message: 'Access denied. Only branch managers can create staff for their branch.' 
            });
        }

        // Validate required fields
        if (!name || !email || !phoneNumber || !password || !role) {
            return res.status(400).json({ 
                message: 'All fields are required: name, email, phoneNumber, password, role' 
            });
        }

        // Validate role
        const allowedRoles = ['POS_Operator', 'Staff', 'Waiter', 'Chef'];
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({ 
                message: 'Invalid role. Allowed roles: ' + allowedRoles.join(', ') 
            });
        }

        // Check if email already exists
        const existingUser = await User.findOne({ 
            email: email.toLowerCase(),
            isDeleted: false 
        });
        
        if (existingUser) {
            return res.status(400).json({ 
                message: 'Email already exists' 
            });
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create new staff member
        const newStaff = new User({
            name,
            email: email.toLowerCase(),
            phoneNumber,
            password: hashedPassword,
            role,
            status,
            restaurantId: req.user.restaurantId,
            branchId: branchId,
            isEmailVerified: false // Staff will need to verify their email
        });

        await newStaff.save();

        // Return staff data without password
        const staffData = await User.findById(newStaff._id)
            .select('-password -emailVerificationOTP -resetPasswordOTP')
            .populate('restaurantId', 'name')
            .populate('branchId', 'name');

        res.status(201).json({
            success: true,
            message: 'Staff member created successfully',
            data: staffData
        });

    } catch (error) {
        console.error('Error creating staff:', error);
        res.status(500).json({ 
            message: 'Error creating staff member', 
            error: error.message 
        });
    }
};

// Update staff member (Branch Manager only)
const updateStaff = async (req, res) => {
    try {
        const { branchId, staffId } = req.params;
        const { name, email, phoneNumber, role, status } = req.body;
        
        // Verify user is Branch Manager and has access to this branch
        if (req.user.role !== 'Branch_Manager' || req.user.branchId.toString() !== branchId) {
            return res.status(403).json({ 
                message: 'Access denied. Only branch managers can update staff for their branch.' 
            });
        }

        // Find staff member
        const staff = await User.findOne({
            _id: staffId,
            branchId: branchId,
            isDeleted: false
        });

        if (!staff) {
            return res.status(404).json({ 
                message: 'Staff member not found' 
            });
        }

        // Validate role if provided
        if (role) {
            const allowedRoles = ['POS_Operator', 'Staff', 'Waiter', 'Chef'];
            if (!allowedRoles.includes(role)) {
                return res.status(400).json({ 
                    message: 'Invalid role. Allowed roles: ' + allowedRoles.join(', ') 
                });
            }
        }

        // Check if email is being changed and if it already exists
        if (email && email.toLowerCase() !== staff.email) {
            const existingUser = await User.findOne({ 
                email: email.toLowerCase(),
                _id: { $ne: staffId },
                isDeleted: false 
            });
            
            if (existingUser) {
                return res.status(400).json({ 
                    message: 'Email already exists' 
                });
            }
        }

        // Update staff member
        const updateData = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email.toLowerCase();
        if (phoneNumber) updateData.phoneNumber = phoneNumber;
        if (role) updateData.role = role;
        if (status) updateData.status = status;

        const updatedStaff = await User.findByIdAndUpdate(
            staffId,
            updateData,
            { new: true, runValidators: true }
        )
        .select('-password -emailVerificationOTP -resetPasswordOTP')
        .populate('restaurantId', 'name')
        .populate('branchId', 'name');

        res.json({
            success: true,
            message: 'Staff member updated successfully',
            data: updatedStaff
        });

    } catch (error) {
        console.error('Error updating staff:', error);
        res.status(500).json({ 
            message: 'Error updating staff member', 
            error: error.message 
        });
    }
};

// Delete staff member (soft delete - Branch Manager only)
const deleteStaff = async (req, res) => {
    try {
        const { branchId, staffId } = req.params;
        
        // Verify user is Branch Manager and has access to this branch
        if (req.user.role !== 'Branch_Manager' || req.user.branchId.toString() !== branchId) {
            return res.status(403).json({ 
                message: 'Access denied. Only branch managers can delete staff for their branch.' 
            });
        }

        // Find and soft delete staff member
        const staff = await User.findOneAndUpdate(
            {
                _id: staffId,
                branchId: branchId,
                isDeleted: false
            },
            { 
                isDeleted: true,
                status: 'inactive'
            },
            { new: true }
        );

        if (!staff) {
            return res.status(404).json({ 
                message: 'Staff member not found' 
            });
        }

        res.json({
            success: true,
            message: 'Staff member deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting staff:', error);
        res.status(500).json({ 
            message: 'Error deleting staff member', 
            error: error.message 
        });
    }
};

// Update staff status (Branch Manager only)
const updateStaffStatus = async (req, res) => {
    try {
        const { branchId, staffId } = req.params;
        const { status } = req.body;
        
        // Verify user is Branch Manager and has access to this branch
        if (req.user.role !== 'Branch_Manager' || req.user.branchId.toString() !== branchId) {
            return res.status(403).json({ 
                message: 'Access denied. Only branch managers can update staff status for their branch.' 
            });
        }

        // Validate status
        const allowedStatuses = ['active', 'inactive', 'suspended'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ 
                message: 'Invalid status. Allowed statuses: ' + allowedStatuses.join(', ') 
            });
        }

        // Find and update staff status
        const staff = await User.findOneAndUpdate(
            {
                _id: staffId,
                branchId: branchId,
                isDeleted: false
            },
            { status },
            { new: true }
        )
        .select('-password -emailVerificationOTP -resetPasswordOTP')
        .populate('restaurantId', 'name')
        .populate('branchId', 'name');

        if (!staff) {
            return res.status(404).json({ 
                message: 'Staff member not found' 
            });
        }

        res.json({
            success: true,
            message: 'Staff status updated successfully',
            data: staff
        });

    } catch (error) {
        console.error('Error updating staff status:', error);
        res.status(500).json({ 
            message: 'Error updating staff status', 
            error: error.message 
        });
    }
};

// Get staff statistics for branch (Branch Manager only)
const getStaffStats = async (req, res) => {
    try {
        const { branchId } = req.params;
        
        // Verify user is Branch Manager and has access to this branch
        if (req.user.role !== 'Branch_Manager' || req.user.branchId.toString() !== branchId) {
            return res.status(403).json({ 
                message: 'Access denied. Only branch managers can view staff statistics for their branch.' 
            });
        }

        // Get staff statistics
        const stats = await User.aggregate([
            {
                $match: {
                    branchId: req.user.branchId,
                    isDeleted: false,
                    role: { $in: ['POS_Operator', 'Staff', 'Waiter', 'Chef'] }
                }
            },
            {
                $group: {
                    _id: null,
                    totalStaff: { $sum: 1 },
                    activeStaff: {
                        $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                    },
                    inactiveStaff: {
                        $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] }
                    },
                    suspendedStaff: {
                        $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] }
                    },
                    employees: {
                        $sum: { $cond: [{ $in: ['$role', ['POS_Operator', 'Staff']] }, 1, 0] }
                    },
                    waiters: {
                        $sum: { $cond: [{ $eq: ['$role', 'Waiter'] }, 1, 0] }
                    },
                    chefs: {
                        $sum: { $cond: [{ $eq: ['$role', 'Chef'] }, 1, 0] }
                    }
                }
            }
        ]);

        const result = stats[0] || {
            totalStaff: 0,
            activeStaff: 0,
            inactiveStaff: 0,
            suspendedStaff: 0,
            employees: 0,
            waiters: 0,
            chefs: 0
        };

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('Error fetching staff statistics:', error);
        res.status(500).json({ 
            message: 'Error fetching staff statistics', 
            error: error.message 
        });
    }
};

module.exports = {
    getStaffByBranch,
    createStaff,
    updateStaff,
    deleteStaff,
    updateStaffStatus,
    getStaffStats
};
