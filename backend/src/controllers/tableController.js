// Import the DiningTable model using our registry approach
const DiningTable = require('../models/DiningTables');
const mongoose = require('mongoose');

// Create a new dining table
exports.createTable = async (req, res) => {
    try {
        const { 
            tableId, 
            TableName, 
            capacity, 
            location, 
            shape, 
            size, 
            isVIP, 
            notes 
        } = req.body;
        
        // Check if user context includes required IDs
        if (!req.user || !req.user.restaurantId || !req.user.branchId) {
            console.error('Missing user context or restaurant/branch IDs', { user: req.user });
            return res.status(400).json({ 
                message: 'User authentication error: Missing restaurant or branch ID' 
            });
        }
        
        const restaurantId = req.user.restaurantId;
        const branchId = req.user.branchId;

        // Validate required fields
        if (!TableName || !capacity) {
            return res.status(400).json({ 
                message: 'Table name and capacity are required fields' 
            });
        }

        // Check if table with same ID already exists in this branch (if ID is provided)
        if (tableId) {
            const existingTable = await DiningTable.findOne({ 
                branchId, 
                tableId 
            });

            if (existingTable) {
                return res.status(400).json({ 
                    message: 'A table with this ID already exists in this branch' 
                });
            }
        }

        // Create the table with all provided properties
        const newTable = await DiningTable.create({
            restaurantId,
            branchId,
            tableId, // This will be auto-generated if not provided
            TableName,
            capacity,
            location: location || { 
                x: 0, 
                y: 0, 
                zone: 'Main' 
            },
            shape: shape || 'square',
            size: size || { width: 100, height: 100 },
            isVIP: isVIP || false,
            notes: notes || '',
            isOccupied: false,
            status: 'available',
            currentOrder: null
        });

        console.log('Created new dining table:', newTable);

        res.status(201).json({
            success: true,
            data: newTable
        });
    } catch (error) {
        console.error('Error creating dining table:', error);
        res.status(500).json({
            message: 'Failed to create dining table',
            error: error.message,
            details: error.errors ? Object.keys(error.errors).map(key => ({
                field: key,
                message: error.errors[key].message
            })) : null
        });
    }
};

// Get all dining tables for a branch
exports.getTables = async (req, res) => {
    try {
        // Build a flexible query that works with or without branchId
        const query = {};
        
        // If user has a branchId, use it for filtering
        if (req.user && req.user.branchId) {
            query.branchId = req.user.branchId;
        } else if (req.query.branchId) {
            // If branchId is provided in query params, use that instead
            query.branchId = req.query.branchId;
        }
        
        // If user has restaurantId but no branchId, filter by restaurant
        if (req.user && req.user.restaurantId && !query.branchId) {
            query.restaurantId = req.user.restaurantId;
        } else if (req.query.restaurantId && !query.branchId) {
            // If restaurantId is provided in query params, use that
            query.restaurantId = req.query.restaurantId;
        }
        
        // Add additional filters if provided
        const { zone, status, isVIP, minCapacity, maxCapacity } = req.query;
        
        // Add filters if provided
        if (zone) query['location.zone'] = zone;
        if (status) query.status = status;
        if (isVIP === 'true') query.isVIP = true;
        if (minCapacity) query.capacity = { $gte: parseInt(minCapacity) };
        if (maxCapacity) {
            if (query.capacity) {
                query.capacity.$lte = parseInt(maxCapacity);
            } else {
                query.capacity = { $lte: parseInt(maxCapacity) };
            }
        }
        
        console.log('Fetching tables with query:', JSON.stringify(query));
        
        const tables = await DiningTable.find(query)
            .sort({ tableId: 1 })
            .populate('currentOrder', 'orderNumber status createdAt total');

        res.status(200).json({
            success: true,
            count: tables.length,
            data: tables
        });
    } catch (error) {
        console.error('Error fetching dining tables:', error);
        res.status(500).json({
            message: 'Failed to fetch dining tables',
            error: error.message
        });
    }
};

// Get zones for tables (for filtering)
exports.getTableZones = async (req, res) => {
    try {
        const branchId = req.user.branchId;
        
        const zones = await DiningTable.distinct('location.zone', { branchId });
        
        res.status(200).json({
            success: true,
            data: zones
        });
    } catch (error) {
        console.error('Error fetching table zones:', error);
        res.status(500).json({
            message: 'Failed to fetch table zones',
            error: error.message
        });
    }
};

// Get a single dining table
exports.getTable = async (req, res) => {
    try {
        const tableId = req.params.id;
        const branchId = req.user.branchId;

        const table = await DiningTable.findOne({
            _id: tableId,
            branchId
        });

        if (!table) {
            return res.status(404).json({
                message: 'Dining table not found'
            });
        }

        res.status(200).json({
            success: true,
            data: table
        });
    } catch (error) {
        console.error('Error fetching dining table:', error);
        res.status(500).json({
            message: 'Failed to fetch dining table',
            error: error.message
        });
    }
};

// Update a dining table
exports.updateTable = async (req, res) => {
    try {
        const tableId = req.params.id;
        const branchId = req.user.branchId;
        const {
            TableName, capacity, isOccupied, status,
            location, shape, size, minimumSpend, isVIP, notes
        } = req.body;

        const updateData = {};
        
        // Only update fields that are provided
        if (TableName !== undefined) updateData.TableName = TableName;
        if (capacity !== undefined) updateData.capacity = capacity;
        if (isOccupied !== undefined) updateData.isOccupied = isOccupied;
        if (status !== undefined) updateData.status = status;
        if (location !== undefined) updateData.location = location;
        if (shape !== undefined) updateData.shape = shape;
        if (size !== undefined) updateData.size = size;
        if (minimumSpend !== undefined) updateData.minimumSpend = minimumSpend;
        if (isVIP !== undefined) updateData.isVIP = isVIP;
        if (notes !== undefined) updateData.notes = notes;

        const table = await DiningTable.findOneAndUpdate(
            { _id: tableId, branchId },
            updateData,
            { new: true, runValidators: true }
        );

        if (!table) {
            return res.status(404).json({
                message: 'Dining table not found'
            });
        }

        res.status(200).json({
            success: true,
            data: table
        });
    } catch (error) {
        console.error('Error updating dining table:', error);
        res.status(500).json({
            message: 'Failed to update dining table',
            error: error.message
        });
    }
};

// Delete a dining table
exports.deleteTable = async (req, res) => {
    try {
        const tableId = req.params.id;
        const branchId = req.user.branchId;

        const table = await DiningTable.findOne({
            _id: tableId,
            branchId
        });

        if (!table) {
            return res.status(404).json({
                message: 'Dining table not found'
            });
        }

        // Check if table is currently occupied
        if (table.isOccupied) {
            return res.status(400).json({
                message: 'Cannot delete an occupied table'
            });
        }

        // Use findOneAndDelete instead of the deprecated remove() method
        await DiningTable.findOneAndDelete({ _id: tableId, branchId });

        res.status(200).json({
            success: true,
            message: 'Dining table deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting dining table:', error);
        res.status(500).json({
            message: 'Failed to delete dining table',
            error: error.message
        });
    }
};

// Update table status (occupied/available)
exports.updateTableStatus = async (req, res) => {
    try {
        const { isOccupied, currentOrder, status } = req.body;
        const tableId = req.params.id;
        const branchId = req.user.branchId;

        // Prepare update data
        const updateData = {};
        if (isOccupied !== undefined) {
            updateData.isOccupied = isOccupied;
            updateData.status = isOccupied ? 'occupied' : 'available';
        }
        if (currentOrder !== undefined) updateData.currentOrder = currentOrder;
        if (status !== undefined) updateData.status = status;

        const table = await DiningTable.findOneAndUpdate(
            { _id: tableId, branchId },
            updateData,
            { new: true }
        );

        if (!table) {
            return res.status(404).json({
                message: 'Dining table not found'
            });
        }

        res.status(200).json({
            success: true,
            data: table
        });
    } catch (error) {
        console.error('Error updating table status:', error);
        res.status(500).json({
            message: 'Failed to update table status',
            error: error.message
        });
    }
};

// Create a reservation for a table
exports.createReservation = async (req, res) => {
    try {
        const tableId = req.params.id;
        const branchId = req.user.branchId;
        const {
            customerName, customerPhone, customerEmail, 
            partySize, reservationDate, startTime, endTime, 
            notes, customerId
        } = req.body;

        // Find the table
        const table = await DiningTable.findOne({ _id: tableId, branchId });

        if (!table) {
            return res.status(404).json({
                message: 'Dining table not found'
            });
        }

        // Parse dates
        const reservationStartTime = new Date(startTime);
        const reservationEndTime = new Date(endTime);
        const reservationDateObj = new Date(reservationDate);

        // Check if table is available for this time slot
        if (!table.isAvailableAt(reservationStartTime, reservationEndTime)) {
            return res.status(400).json({
                message: 'Table is not available for the requested time slot'
            });
        }

        // Create the reservation
        const newReservation = {
            customerId,
            customerName,
            customerPhone,
            customerEmail,
            partySize,
            reservationDate: reservationDateObj,
            startTime: reservationStartTime,
            endTime: reservationEndTime,
            notes,
            status: 'confirmed',
            createdAt: new Date()
        };

        // Add reservation to table
        table.reservations.push(newReservation);

        // If the reservation is for the current time, update table status
        const now = new Date();
        if (reservationStartTime <= now && reservationEndTime >= now) {
            table.status = 'reserved';
        }

        await table.save();

        res.status(201).json({
            success: true,
            data: table.reservations[table.reservations.length - 1]
        });
    } catch (error) {
        console.error('Error creating reservation:', error);
        res.status(500).json({
            message: 'Failed to create reservation',
            error: error.message
        });
    }
};

// Get reservations for a table
exports.getTableReservations = async (req, res) => {
    try {
        const tableId = req.params.id;
        const branchId = req.user.branchId;
        const { date, status } = req.query;

        const table = await DiningTable.findOne({ _id: tableId, branchId });

        if (!table) {
            return res.status(404).json({
                message: 'Dining table not found'
            });
        }

        let reservations = table.reservations || [];

        // Filter by date if provided
        if (date) {
            const filterDate = new Date(date);
            const nextDay = new Date(filterDate);
            nextDay.setDate(nextDay.getDate() + 1);
            
            reservations = reservations.filter(reservation => {
                const reservationDate = new Date(reservation.reservationDate);
                return reservationDate >= filterDate && reservationDate < nextDay;
            });
        }

        // Filter by status if provided
        if (status) {
            reservations = reservations.filter(reservation => 
                reservation.status === status
            );
        }

        res.status(200).json({
            success: true,
            count: reservations.length,
            data: reservations
        });
    } catch (error) {
        console.error('Error fetching reservations:', error);
        res.status(500).json({
            message: 'Failed to fetch reservations',
            error: error.message
        });
    }
};

// Update a reservation
exports.updateReservation = async (req, res) => {
    try {
        const tableId = req.params.id;
        const reservationId = req.params.reservationId;
        const branchId = req.user.branchId;
        const {
            customerName, customerPhone, customerEmail,
            partySize, reservationDate, startTime, endTime,
            notes, status
        } = req.body;

        const table = await DiningTable.findOne({ _id: tableId, branchId });

        if (!table) {
            return res.status(404).json({
                message: 'Dining table not found'
            });
        }

        // Find the reservation
        const reservationIndex = table.reservations.findIndex(
            r => r._id.toString() === reservationId
        );

        if (reservationIndex === -1) {
            return res.status(404).json({
                message: 'Reservation not found'
            });
        }

        // Update reservation data
        const reservation = table.reservations[reservationIndex];
        
        if (customerName) reservation.customerName = customerName;
        if (customerPhone) reservation.customerPhone = customerPhone;
        if (customerEmail) reservation.customerEmail = customerEmail;
        if (partySize) reservation.partySize = partySize;
        if (reservationDate) reservation.reservationDate = new Date(reservationDate);
        if (startTime) reservation.startTime = new Date(startTime);
        if (endTime) reservation.endTime = new Date(endTime);
        if (notes) reservation.notes = notes;
        if (status) reservation.status = status;

        // Save the updated table
        await table.save();

        res.status(200).json({
            success: true,
            data: table.reservations[reservationIndex]
        });
    } catch (error) {
        console.error('Error updating reservation:', error);
        res.status(500).json({
            message: 'Failed to update reservation',
            error: error.message
        });
    }
};

// Cancel a reservation
exports.cancelReservation = async (req, res) => {
    try {
        const tableId = req.params.id;
        const reservationId = req.params.reservationId;
        const branchId = req.user.branchId;

        const table = await DiningTable.findOne({ _id: tableId, branchId });

        if (!table) {
            return res.status(404).json({
                message: 'Dining table not found'
            });
        }

        // Find the reservation
        const reservationIndex = table.reservations.findIndex(
            r => r._id.toString() === reservationId
        );

        if (reservationIndex === -1) {
            return res.status(404).json({
                message: 'Reservation not found'
            });
        }

        // Update status to cancelled
        table.reservations[reservationIndex].status = 'cancelled';
        
        // Save the updated table
        await table.save();

        res.status(200).json({
            success: true,
            message: 'Reservation cancelled successfully'
        });
    } catch (error) {
        console.error('Error cancelling reservation:', error);
        res.status(500).json({
            message: 'Failed to cancel reservation',
            error: error.message
        });
    }
};

// Get available tables for a specific time
exports.getAvailableTables = async (req, res) => {
    try {
        const branchId = req.user.branchId;
        const { date, startTime, endTime, partySize } = req.query;
        
        if (!date || !startTime || !endTime) {
            return res.status(400).json({
                message: 'Date, start time and end time are required'
            });
        }
        
        const requestedStart = new Date(`${date}T${startTime}`);
        const requestedEnd = new Date(`${date}T${endTime}`);
        
        // Find all tables for this branch
        const tables = await DiningTable.find({ 
            branchId,
            status: { $ne: 'maintenance' }
        });
        
        // Filter available tables
        const availableTables = tables.filter(table => {
            // Filter by capacity if partySize is provided
            if (partySize && table.capacity < parseInt(partySize)) {
                return false;
            }
            
            return table.isAvailableAt(requestedStart, requestedEnd);
        });
        
        res.status(200).json({
            success: true,
            count: availableTables.length,
            data: availableTables
        });
    } catch (error) {
        console.error('Error finding available tables:', error);
        res.status(500).json({
            message: 'Failed to find available tables',
            error: error.message
        });
    }
};

// Update table positions in floor plan
exports.updateTablePositions = async (req, res) => {
    try {
        const branchId = req.user.branchId;
        const { tables } = req.body;
        
        if (!tables || !Array.isArray(tables)) {
            return res.status(400).json({
                message: 'Tables array is required'
            });
        }
        
        const updates = [];
        
        for (const tableUpdate of tables) {
            const { _id, location } = tableUpdate;
            
            if (!_id || !location) {
                continue;
            }
            
            updates.push({
                updateOne: {
                    filter: { _id, branchId },
                    update: { $set: { location } }
                }
            });
        }
        
        if (updates.length === 0) {
            return res.status(400).json({
                message: 'No valid table updates provided'
            });
        }
        
        const result = await DiningTable.bulkWrite(updates);
        
        res.status(200).json({
            success: true,
            message: `Updated ${result.modifiedCount} table positions`,
            data: result
        });
    } catch (error) {
        console.error('Error updating table positions:', error);
        res.status(500).json({
            message: 'Failed to update table positions',
            error: error.message
        });
    }
};

// Assign table to order
exports.assignTableToOrder = async (req, res) => {
    try {
        const tableId = req.params.id;
        const orderId = req.params.orderId; // Get orderId from URL parameter
        const branchId = req.user.branchId;
        
        // Log the request for debugging
        console.log(`Assigning table ${tableId} to order ${orderId} (Branch: ${branchId})`);
        
        if (!orderId) {
            return res.status(400).json({
                message: 'Order ID is required'
            });
        }
        
        // Find the table
        const table = await DiningTable.findOne({ _id: tableId, branchId });
        
        if (!table) {
            return res.status(404).json({
                message: 'Dining table not found'
            });
        }
        
        // Check if table is available
        if (table.isOccupied) {
            return res.status(400).json({
                message: 'Table is already occupied and cannot be assigned to another order'
            });
        }
        
        // Update table with order
        table.currentOrder = orderId;
        table.isOccupied = true;
        table.status = 'occupied';
        
        await table.save();
        
        res.status(200).json({
            success: true,
            message: `Table ${table.tableId} assigned to order successfully`,
            data: table
        });
    } catch (error) {
        console.error('Error assigning table to order:', error);
        res.status(500).json({
            message: 'Failed to assign table to order',
            error: error.message
        });
    }
};

// Release table from order
exports.releaseTable = async (req, res) => {
    try {
        const tableId = req.params.id;
        const branchId = req.user.branchId;
        
        // Find the table
        const table = await DiningTable.findOne({ _id: tableId, branchId });
        
        if (!table) {
            return res.status(404).json({
                message: 'Dining table not found'
            });
        }
        
        // Store the previous order ID for logging purposes
        const previousOrderId = table.currentOrder;
        
        // Reset table status and related fields
        table.currentOrder = null;
        table.isOccupied = false;
        table.status = 'available';
        
        // Log the table release
        console.log(`Table ${table.tableId} released from order ${previousOrderId}`);
        
        await table.save();
        
        res.status(200).json({
            success: true,
            message: `Table ${table.tableId} released successfully`,
            data: table
        });
    } catch (error) {
        console.error('Error releasing table:', error);
        res.status(500).json({
            message: 'Failed to release table',
            error: error.message
        });
    }
};

// Get all tables with current orders
exports.getTablesWithOrders = async (req, res) => {
    try {
        const branchId = req.user.branchId;
        
        const tables = await DiningTable.find({ 
            branchId,
            currentOrder: { $ne: null }
        }).populate('currentOrder', 'orderNumber status createdAt total');
        
        res.status(200).json({
            success: true,
            count: tables.length,
            data: tables
        });
    } catch (error) {
        console.error('Error fetching tables with orders:', error);
        res.status(500).json({
            message: 'Failed to fetch tables with orders',
            error: error.message
        });
    }
};