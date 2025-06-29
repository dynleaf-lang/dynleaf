// Debug utility for restaurant data
console.log('Debug utility loaded');

// Helper to deeply examine an object structure
export const debugObject = (obj, label = 'Object') => {
  console.log(`==== DEBUG ${label} ====`);
  
  if (obj === null || obj === undefined) {
    console.log(`${label} is ${obj}`);
    return;
  }
  
  try {
    // Get object keys
    const keys = Object.keys(obj);
    console.log(`${label} has ${keys.length} keys:`, keys);
    
    // Check if it's an array
    if (Array.isArray(obj)) {
      console.log(`${label} is an array with ${obj.length} items`);
      if (obj.length > 0) {
        console.log(`First item sample:`, obj[0]);
      }
    }
    
    // Print main structure with types
    const structure = {};
    for (const key of keys) {
      const value = obj[key];
      const type = typeof value;
      structure[key] = { 
        type, 
        isNull: value === null,
        isEmpty: type === 'string' ? value === '' : 
                 type === 'object' ? (Array.isArray(value) ? value.length === 0 : Object.keys(value).length === 0) : 
                 false
      };
      
      // For objects, add some more detail
      if (type === 'object' && value !== null) {
        if (Array.isArray(value)) {
          structure[key].arrayLength = value.length;
        } else {
          structure[key].objectKeys = Object.keys(value);
        }
      }
    }
    
    console.log(`${label} structure:`, structure);
    
    // Print full value for debugging
    console.log(`${label} full value:`, obj);
  } catch (error) {
    console.error(`Error examining ${label}:`, error);
  }
  
  console.log(`==== END DEBUG ${label} ====`);
};

// Export a function to specifically debug restaurant data
export const debugRestaurantData = (restaurant, branch) => {
  console.log('======== RESTAURANT DATA DEBUG ========');
  debugObject(restaurant, 'Restaurant');
  debugObject(branch, 'Branch');
  
  if (branch && branch.restaurant) {
    debugObject(branch.restaurant, 'Branch.restaurant');
  }
  console.log('======== END RESTAURANT DATA DEBUG ========');
};
