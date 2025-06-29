const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Get all collections in the database
router.get('/collections', async (req, res) => {
    try {
        const collections = await mongoose.connection.db.listCollections().toArray();
        const collectionNames = collections.map(col => col.name);
        
        res.json({
            message: 'Database collections',
            collections: collectionNames
        });
    } catch (error) {
        console.error('Error fetching collections:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get schema fields for a model
router.get('/schema/:modelName', async (req, res) => {
    try {
        const { modelName } = req.params;
        
        // Check if model exists
        if (!mongoose.models[modelName]) {
            return res.status(404).json({ 
                message: `Model ${modelName} not found`,
                availableModels: Object.keys(mongoose.models)
            });
        }
        
        const model = mongoose.model(modelName);
        const schemaInfo = {};
        
        // Parse schema fields
        for (const [path, schema] of Object.entries(model.schema.paths)) {
            schemaInfo[path] = {
                type: schema.instance,
                required: !!schema.isRequired,
                default: schema.defaultValue
            };
        }
        
        res.json({
            model: modelName,
            schema: schemaInfo
        });
    } catch (error) {
        console.error(`Error fetching schema for ${req.params.modelName}:`, error);
        res.status(500).json({ message: error.message });
    }
});

// Count documents in a collection
router.get('/count/:modelName', async (req, res) => {
    try {
        const { modelName } = req.params;
        
        // Check if model exists
        if (!mongoose.models[modelName]) {
            return res.status(404).json({ 
                message: `Model ${modelName} not found`,
                availableModels: Object.keys(mongoose.models)
            });
        }
        
        const model = mongoose.model(modelName);
        const count = await model.countDocuments();
        
        res.json({
            model: modelName,
            count
        });
    } catch (error) {
        console.error(`Error counting documents for ${req.params.modelName}:`, error);
        res.status(500).json({ message: error.message });
    }
});

// Sample documents from a collection
router.get('/sample/:modelName', async (req, res) => {
    try {
        const { modelName } = req.params;
        const limit = parseInt(req.query.limit) || 5;
        
        // Check if model exists
        if (!mongoose.models[modelName]) {
            return res.status(404).json({ 
                message: `Model ${modelName} not found`,
                availableModels: Object.keys(mongoose.models)
            });
        }
        
        const model = mongoose.model(modelName);
        const documents = await model.find().limit(limit).lean();
        
        res.json({
            model: modelName,
            count: documents.length,
            documents
        });
    } catch (error) {
        console.error(`Error sampling documents for ${req.params.modelName}:`, error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
