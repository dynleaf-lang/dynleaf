/**
 * Centralized Model Registry
 * 
 * This file ensures that Mongoose models are registered only once across the application
 * to prevent the "MissingSchemaError: Schema hasn't been registered for model" error.
 */

const mongoose = require('mongoose');

// Collection of model definitions to ensure consistent registration
const modelDefinitions = {};

/**
 * Register a model schema once and return the model
 * @param {string} modelName - The name of the model (e.g., 'DiningTable')
 * @param {mongoose.Schema} schema - The mongoose schema
 * @returns {mongoose.Model} - The mongoose model
 */
const registerModel = (modelName, schema) => {
  // If we already registered this model, return it
  if (modelDefinitions[modelName]) {
    return modelDefinitions[modelName];
  }

  // If mongoose already has this model registered, return it
  if (mongoose.models[modelName]) {
    return mongoose.models[modelName];
  }

  // Otherwise, register the model and store it in our registry
  const model = mongoose.model(modelName, schema);
  modelDefinitions[modelName] = model;
  return model;
};

module.exports = {
  registerModel
};