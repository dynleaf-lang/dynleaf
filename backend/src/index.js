const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Setup email configuration based on selected provider
const setupEmailConfig = () => {
  const provider = process.env.EMAIL_PROVIDER?.toLowerCase() || 'business';
  const prefix = provider === 'gmail' ? 'GMAIL_' : 'BUSINESS_';

  // Set the active email configuration based on the selected provider
  process.env.EMAIL_HOST = process.env[`${prefix}EMAIL_HOST`];
  process.env.EMAIL_PORT = process.env[`${prefix}EMAIL_PORT`];
  process.env.EMAIL_SECURE = process.env[`${prefix}EMAIL_SECURE`];
  process.env.EMAIL_USER = process.env[`${prefix}EMAIL_USER`];
  process.env.EMAIL_PASS = process.env[`${prefix}EMAIL_PASS`];
  process.env.EMAIL_FROM = process.env[`${prefix}EMAIL_FROM`];

  console.log(`Email provider set to: ${provider}`);
  console.log(`Using ${process.env.EMAIL_HOST} with user ${process.env.EMAIL_USER}`);
};

// Run the email configuration setup
setupEmailConfig();

const app = express(); 

// First, set up body parsers BEFORE any other middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// JSON parsing error handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('JSON parsing error:', err);
    return res.status(400).json({ message: 'Invalid JSON payload' });
  }
  next();
});

// THEN set up CORS
app.use(cors({
  origin: '*', // Allow all origins (you can specify your frontend URL here)
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Debug-Mode', 'X-Request-ID'],
  exposedHeaders: ['X-Request-Time'],
}));  

// Import the Tax seedDefaultTaxes function for later use
const { seedDefaultTaxes } = require('./models/Tax');

// Connect to MongoDB with updated options
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-menu';
console.log(`[DEBUG] Connecting to MongoDB: ${MONGODB_URI.replace(/:([^:@]{4}).*@/, ':****@')}`);

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // Timeout after 5s
  socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
})
.then(() => {
  console.log('[DEBUG] MongoDB connected successfully');
  
  // Now that the database is connected, seed the tax data
  seedDefaultTaxes().then(() => {
    console.log('Tax seeding process completed');
  }).catch(err => {
    console.error('Error during tax seeding:', err);
  });
})
.catch(err => {
  console.error('[DEBUG] MongoDB connection error:', err);
  console.error('[DEBUG] MongoDB connection error details:', {
    name: err.name,
    code: err.code,
    codeName: err.codeName,
    message: err.message
  });
  process.exit(1);
});

// Configure Mongoose to use global schema registration
mongoose.set('strictQuery', false);

// Import models with correct registration order
// This must be done before importing routes
require('./models');

// Import debug middleware
const debugMiddleware = require('./middleware/debugMiddleware');

// Then apply debug middleware
app.use(debugMiddleware);

// Import routes
const userRoutes = require('./routes/userRoutes');  
const categoryRoutes = require('./routes/categoryRoutes'); 
const menuRoutes = require('./routes/menuRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const restaurantRoutes = require('./routes/restaurantRoutes');
const branchRoutes = require('./routes/branchRoutes');
const tableRoutes = require('./routes/tableRoutes');
const taxRoutes = require('./routes/taxRoutes');
const orderRoutes = require('./routes/orderRoutes');
const customerRoutes = require('./routes/customerRoutes');
const floorRoutes = require('./routes/floorRoutes');

// Import public routes for customer application
const publicTableRoutes = require('./routes/publicTableRoutes');
const publicMenuRoutes = require('./routes/publicMenuRoutes');
const publicBranchRoutes = require('./routes/publicBranchRoutes');
const publicOrderRoutes = require('./routes/publicOrderRoutes');

// Import diagnostic routes
const diagnosticRoutes = require('./routes/diagnosticRoutes');
const schemaInfoRoutes = require('./routes/schemaInfoRoutes');

// Serve static files from the public directory
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Simple route for API health check
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Public API health check
app.get('/api/public/health', (req, res) => {
  console.log('[DEBUG] Public API health check accessed');
  res.json({
    status: 'ok',
    message: 'Public API is running',
    timestamp: new Date().toISOString()
  });
});

// Register API routes
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/menus', menuRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/taxes', taxRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/floors', floorRoutes);

// Debug request logging middleware for public routes
app.use('/api/public', (req, res, next) => {
  console.log(`[DEBUG] Public API Request: ${req.method} ${req.url}`);
  next();
});

// Register public API routes for the customer application
app.use('/api/public/tables', publicTableRoutes);
app.use('/api/public/menus', publicMenuRoutes);
app.use('/api/public/branches', publicBranchRoutes);
app.use('/api/public/orders', publicOrderRoutes);

// Register diagnostic routes (only available in development mode)
if (process.env.NODE_ENV !== 'production') {
    app.use('/api/diagnostics', diagnosticRoutes);
    app.use('/api/schema-info', schemaInfoRoutes);
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));