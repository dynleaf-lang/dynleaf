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

// Connect to MongoDB with updated options
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => {
  console.error('MongoDB connection error:', err);
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

// Serve static files from the public directory
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Simple route for API health check
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Register API routes
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/menus', menuRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/tables', tableRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));