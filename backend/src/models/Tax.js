const mongoose = require('mongoose');

const taxSchema = new mongoose.Schema({
    country: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    percentage: {
        type: Number,
        required: true,
        min: 0
    },
    isCompound: {
        type: Boolean,
        default: false
    },
    description: {
        type: String,
        trim: true
    },
    active: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Tax = mongoose.model('Tax', taxSchema);

// Default tax entries for common countries
const defaultTaxes = [
    { country: 'US', name: 'Sales Tax', percentage: 7.25, isCompound: false, description: 'Standard US sales tax rate (varies by state)' },
    { country: 'CA', name: 'GST/HST', percentage: 13, isCompound: false, description: 'Canadian Goods and Services Tax / Harmonized Sales Tax' },
    { country: 'UK', name: 'VAT', percentage: 20, isCompound: false, description: 'UK Value Added Tax' },
    { country: 'IN', name: 'GST', percentage: 18, isCompound: false, description: 'Indian Goods and Services Tax' },
    { country: 'AU', name: 'GST', percentage: 10, isCompound: false, description: 'Australian Goods and Services Tax' }
];

// Function to seed default taxes if they don't exist
const seedDefaultTaxes = async () => {
    // Check if the database connection is established
    if (mongoose.connection.readyState !== 1) {
        console.log('Database connection not ready yet, waiting to seed tax data');
        return; // Exit if database is not connected
    }

    try {
        // Check if the collection is empty
        const count = await Tax.countDocuments();
        
        // Only seed if no tax entries exist
        if (count === 0) {
            console.log('No tax entries found, seeding default data...');
            
            const seedPromises = defaultTaxes.map(taxData => 
                Tax.findOneAndUpdate(
                    { country: taxData.country },
                    taxData,
                    { upsert: true, new: true }
                )
            );
            
            await Promise.all(seedPromises);
            console.log('Default tax entries created successfully');
        } else {
            console.log(`Found ${count} existing tax entries, skipping seeding`);
        }
    } catch (error) {
        console.error('Error seeding default tax entries:', error);
    }
};

// Export the seeding function separately rather than calling it immediately
module.exports = {
    Tax,
    seedDefaultTaxes
};