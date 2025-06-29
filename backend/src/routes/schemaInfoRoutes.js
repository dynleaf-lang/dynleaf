const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Get model names and schema information for debugging
router.get('/schema-info', async (req, res) => {
    try {
        // Get all model names
        const modelNames = mongoose.modelNames();
        
        // Build schema info for each model
        const schemaInfo = {};
        for (const modelName of modelNames) {
            const model = mongoose.model(modelName);
            const schema = model.schema;
            
            // Get path names and types
            const paths = {};
            Object.keys(schema.paths).forEach(path => {
                const schemaType = schema.paths[path];
                paths[path] = {
                    type: schemaType.instance,
                    required: !!schemaType.isRequired,
                };
            });
            
            schemaInfo[modelName] = {
                paths,
                collection: model.collection.name
            };
        }
        
        // Return the schema info
        res.json({
            modelNames,
            schemaInfo
        });
    } catch (error) {
        console.error('Error fetching schema info:', error);
        res.status(500).json({ message: error.message });
    }
});

// Sample data from each collection
router.get('/sample-data', async (req, res) => {
    try {
        const modelNames = mongoose.modelNames();
        const sampleData = {};
        
        for (const modelName of modelNames) {
            const model = mongoose.model(modelName);
            try {
                // Get a single document from each collection
                const sample = await model.findOne().lean();
                sampleData[modelName] = sample;
            } catch (error) {
                console.error(`Error sampling ${modelName}:`, error);
                sampleData[modelName] = { error: error.message };
            }
        }
        
        res.json(sampleData);
    } catch (error) {
        console.error('Error fetching sample data:', error);
        res.status(500).json({ message: error.message });
    }
});

// Return details for a specific model
router.get('/model/:modelName', async (req, res) => {
    try {
        const { modelName } = req.params;
        
        // Check if model exists
        if (!mongoose.models[modelName]) {
            return res.status(404).json({
                message: `Model ${modelName} not found`,
                availableModels: mongoose.modelNames()
            });
        }
        
        const model = mongoose.model(modelName);
        
        // Get sample documents
        const documents = await model.find().limit(5).lean();
        const count = await model.countDocuments();
        
        // Get schema info
        const schema = model.schema;
        const paths = {};
        Object.keys(schema.paths).forEach(path => {
            const schemaType = schema.paths[path];
            paths[path] = {
                type: schemaType.instance,
                required: !!schemaType.isRequired,
            };
        });
        
        res.json({
            modelName,
            collection: model.collection.name,
            count,
            schema: paths,
            sampleDocuments: documents
        });
    } catch (error) {
        console.error(`Error fetching model details:`, error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
