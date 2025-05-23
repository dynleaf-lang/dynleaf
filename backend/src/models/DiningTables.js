/**
 * Dining Table Model
 * Simplified implementation to avoid schema registration issues
 */
const mongoose = require('mongoose');

// Clear any existing model to prevent conflicts
delete mongoose.models.DiningTable;

// Define the schema
const diningTableSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true,
  },
  tableId: {
    type: String,
    trim: true,
  }, 
  TableName: {
    type: String,
    required: true,
    trim: true,
  },
  capacity: {
    type: Number,
    required: true,
  },
  isOccupied: {
    type: Boolean,
    default: false,
  },
  currentOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null,
  },
  location: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    zone: { type: String, default: 'Main' },
  },
  shape: {
    type: String,
    enum: ['round', 'square', 'rectangle'],
    default: 'square'
  },
  size: {
    width: { type: Number, default: 100 },
    height: { type: Number, default: 100 },
  },
  status: {
    type: String,
    enum: ['available', 'occupied', 'reserved', 'maintenance'],
    default: 'available',
  },
  reservations: [{
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
    },
    customerName: String,
    customerPhone: String,
    customerEmail: String,
    partySize: Number,
    reservationDate: Date,
    startTime: Date,
    endTime: Date,
    notes: String,
    status: {
      type: String,
      enum: ['confirmed', 'pending', 'cancelled', 'completed'],
      default: 'confirmed',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }],
  minimumSpend: {
    type: Number,
    default: 0,
  },
  isVIP: {
    type: Boolean,
    default: false,
  },
  notes: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
});

// Add compound index to ensure tableId is unique per branch
diningTableSchema.index({ branchId: 1, tableId: 1 }, { unique: true, sparse: true });

// Simple pre-save hook to generate tableId
diningTableSchema.pre('save', function(next) {
  if (!this.tableId) {
    const timestamp = new Date().getTime().toString().slice(-4);
    this.tableId = `T${timestamp}`;
  }
  next();
});

// Virtual for current reservation
diningTableSchema.virtual('currentReservation').get(function() {
  const now = new Date();
  if (!this.reservations || this.reservations.length === 0) return null;
  
  return this.reservations.find(reservation => 
    reservation.status === 'confirmed' && 
    reservation.startTime <= now && 
    reservation.endTime >= now
  ) || null;
});

// Method to check if table is available at a specific time
diningTableSchema.methods.isAvailableAt = function(startTime, endTime) {
  if (this.status === 'maintenance') return false;
  if (!this.reservations || this.reservations.length === 0) return true;
  
  const hasOverlap = this.reservations.some(reservation => {
    if (reservation.status !== 'confirmed' && reservation.status !== 'pending') return false;
    
    return (
      (startTime >= reservation.startTime && startTime < reservation.endTime) ||
      (endTime > reservation.startTime && endTime <= reservation.endTime) ||
      (startTime <= reservation.startTime && endTime >= reservation.endTime)
    );
  });
  
  return !hasOverlap;
};

// Create a direct model instance for consistency across imports
const DiningTable = mongoose.model('DiningTable', diningTableSchema);

module.exports = DiningTable;