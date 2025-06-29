const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});

// Import models
require('../models');
const MenuItem = mongoose.model('MenuItem');
const Category = mongoose.model('Category');
const Branch = mongoose.model('Branch');
const Restaurant = mongoose.model('Restaurant');
const DiningTable = mongoose.model('DiningTable');

/**
 * Seed sample restaurant data
 */
const seedRestaurant = async () => {
    try {
        // Check if restaurant already exists
        const existingRestaurant = await Restaurant.findOne();
        
        if (existingRestaurant) {
            console.log('Restaurant already exists:', existingRestaurant.name);
            return existingRestaurant;
        }
        
        // Create a new restaurant
        const restaurant = new Restaurant({
            name: 'Sample Restaurant',
            logo: '/uploads/sample-logo.png',
            description: 'A sample restaurant for testing',
            address: '123 Test Street, Sample City',
            contactNumber: '+1234567890',
            email: 'info@samplerestaurant.com',
            website: 'https://samplerestaurant.com',
            openingHours: {
                monday: { open: true, openTime: '08:00', closeTime: '22:00' },
                tuesday: { open: true, openTime: '08:00', closeTime: '22:00' },
                wednesday: { open: true, openTime: '08:00', closeTime: '22:00' },
                thursday: { open: true, openTime: '08:00', closeTime: '22:00' },
                friday: { open: true, openTime: '08:00', closeTime: '23:00' },
                saturday: { open: true, openTime: '09:00', closeTime: '23:00' },
                sunday: { open: true, openTime: '09:00', closeTime: '22:00' }
            },
            currency: 'USD',
            isActive: true,
            isDeleted: false
        });
        
        await restaurant.save();
        console.log('Restaurant created:', restaurant.name);
        return restaurant;
    } catch (error) {
        console.error('Error seeding restaurant:', error);
        throw error;
    }
};

/**
 * Seed sample branch data
 */
const seedBranch = async (restaurantId) => {
    try {
        // Check if branch already exists
        const existingBranch = await Branch.findOne({ restaurantId });
        
        if (existingBranch) {
            console.log('Branch already exists:', existingBranch.name);
            return existingBranch;
        }
        
        // Create a new branch
        const branch = new Branch({
            name: 'Main Branch',
            restaurantId,
            address: '123 Main Street, Downtown',
            location: {
                type: 'Point',
                coordinates: [-73.9857, 40.7484]
            },
            contactNumber: '+1234567890',
            email: 'main@samplerestaurant.com',
            openingHours: {
                monday: { open: true, openTime: '08:00', closeTime: '22:00' },
                tuesday: { open: true, openTime: '08:00', closeTime: '22:00' },
                wednesday: { open: true, openTime: '08:00', closeTime: '22:00' },
                thursday: { open: true, openTime: '08:00', closeTime: '22:00' },
                friday: { open: true, openTime: '08:00', closeTime: '23:00' },
                saturday: { open: true, openTime: '09:00', closeTime: '23:00' },
                sunday: { open: true, openTime: '09:00', closeTime: '22:00' }
            },
            manager: 'John Doe',
            isActive: true,
            isDeleted: false
        });
        
        await branch.save();
        console.log('Branch created:', branch.name);
        return branch;
    } catch (error) {
        console.error('Error seeding branch:', error);
        throw error;
    }
};

/**
 * Seed sample categories
 */
const seedCategories = async () => {
    try {
        // Check if categories already exist
        const existingCategories = await Category.find();
        
        if (existingCategories.length > 0) {
            console.log('Categories already exist:', existingCategories.length);
            return existingCategories;
        }
        
        // Create categories
        const categories = [
            {
                name: 'Appetizers',
                description: 'Start your meal with something tasty',
                displayOrder: 1,
                isActive: true,
                isDeleted: false
            },
            {
                name: 'Main Course',
                description: 'Delicious main dishes',
                displayOrder: 2,
                isActive: true,
                isDeleted: false
            },
            {
                name: 'Desserts',
                description: 'Sweet treats to finish your meal',
                displayOrder: 3,
                isActive: true,
                isDeleted: false
            },
            {
                name: 'Beverages',
                description: 'Refreshing drinks',
                displayOrder: 4,
                isActive: true,
                isDeleted: false
            }
        ];
        
        const result = await Category.insertMany(categories);
        console.log('Categories created:', result.length);
        return result;
    } catch (error) {
        console.error('Error seeding categories:', error);
        throw error;
    }
};

/**
 * Seed sample menu items
 */
const seedMenuItems = async (branchId, categories) => {
    try {
        // Check if menu items already exist
        const existingMenuItems = await MenuItem.find({ branchId });
        
        if (existingMenuItems.length > 0) {
            console.log('Menu items already exist:', existingMenuItems.length);
            return existingMenuItems;
        }
        
        // Create menu items
        const menuItems = [
            {
                name: 'Cheese Sticks',
                description: 'Crispy cheese sticks served with marinara sauce',
                price: 7.99,
                categoryId: categories.find(c => c.name === 'Appetizers')._id,
                branchId,
                displayOrder: 1,
                ingredients: ['Cheese', 'Breadcrumbs', 'Herbs'],
                isActive: true,
                isDeleted: false
            },
            {
                name: 'Chicken Wings',
                description: 'Spicy chicken wings with blue cheese dip',
                price: 9.99,
                categoryId: categories.find(c => c.name === 'Appetizers')._id,
                branchId,
                displayOrder: 2,
                ingredients: ['Chicken', 'Hot Sauce', 'Butter'],
                isActive: true,
                isDeleted: false
            },
            {
                name: 'Grilled Salmon',
                description: 'Fresh salmon fillet with lemon butter sauce',
                price: 18.99,
                categoryId: categories.find(c => c.name === 'Main Course')._id,
                branchId,
                displayOrder: 1,
                ingredients: ['Salmon', 'Butter', 'Lemon', 'Herbs'],
                isActive: true,
                isDeleted: false
            },
            {
                name: 'Beef Burger',
                description: 'Juicy beef burger with cheese and fries',
                price: 14.99,
                categoryId: categories.find(c => c.name === 'Main Course')._id,
                branchId,
                displayOrder: 2,
                ingredients: ['Beef', 'Cheese', 'Lettuce', 'Tomato', 'Bun'],
                isActive: true,
                isDeleted: false
            },
            {
                name: 'Chocolate Cake',
                description: 'Rich chocolate cake with vanilla ice cream',
                price: 6.99,
                categoryId: categories.find(c => c.name === 'Desserts')._id,
                branchId,
                displayOrder: 1,
                ingredients: ['Chocolate', 'Flour', 'Sugar', 'Eggs'],
                isActive: true,
                isDeleted: false
            },
            {
                name: 'Soft Drinks',
                description: 'Cola, lemon-lime, or orange soda',
                price: 2.99,
                categoryId: categories.find(c => c.name === 'Beverages')._id,
                branchId,
                displayOrder: 1,
                ingredients: ['Carbonated Water', 'Sweetener', 'Natural Flavors'],
                isActive: true,
                isDeleted: false
            }
        ];
        
        const result = await MenuItem.insertMany(menuItems);
        console.log('Menu items created:', result.length);
        return result;
    } catch (error) {
        console.error('Error seeding menu items:', error);
        throw error;
    }
};

/**
 * Seed sample tables
 */
const seedTables = async (branchId) => {
    try {
        // Check if tables already exist
        const existingTables = await DiningTable.find({ branchId });
        
        if (existingTables.length > 0) {
            console.log('Tables already exist:', existingTables.length);
            return existingTables;
        }
        
        // Create tables
        const tables = [];
        for (let i = 1; i <= 10; i++) {
            tables.push({
                tableNumber: i,
                capacity: i % 3 === 0 ? 6 : 4, // Some tables seat 4, others seat 6
                branchId,
                isVIP: i === 10, // Make table 10 a VIP table
                status: 'available',
                zone: i <= 5 ? 'Indoor' : 'Outdoor',
                isActive: true,
                isDeleted: false
            });
        }
        
        const result = await DiningTable.insertMany(tables);
        console.log('Tables created:', result.length);
        return result;
    } catch (error) {
        console.error('Error seeding tables:', error);
        throw error;
    }
};

/**
 * Main seeding function
 */
const seedData = async () => {
    try {
        console.log('Starting data seeding...');
        
        // Create restaurant
        const restaurant = await seedRestaurant();
        
        // Create branch
        const branch = await seedBranch(restaurant._id);
        
        // Create categories
        const categories = await seedCategories();
        
        // Create menu items
        await seedMenuItems(branch._id, categories);
        
        // Create tables
        await seedTables(branch._id);
        
        console.log('Data seeding completed successfully!');
        console.log('Restaurant ID:', restaurant._id);
        console.log('Branch ID:', branch._id);
        
        // Exit process
        process.exit(0);
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
};

// Run the seeding function
seedData();
