// Debug utility for restaurant data 

// Helper to deeply examine an object structure
export const debugObject = (obj, label = 'Object') => {
 
  if (obj === null || obj === undefined) {
   
    return;
  }
  
  try {
    // Get object keys
    const keys = Object.keys(obj); 
   
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
     
     
  } catch (error) {
    console.error(`Error examining ${label}:`, error);
  }
   
};

// Export a function to specifically debug restaurant data
export const debugRestaurantData = (restaurant, branch) => {
  
  debugObject(restaurant, 'Restaurant');
  debugObject(branch, 'Branch');
  
  if (branch && branch.restaurant) {
    debugObject(branch.restaurant, 'Branch.restaurant');
  }
  
};
