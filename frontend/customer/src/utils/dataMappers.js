// Data mapping utility functions to transform API data for frontend components
// This ensures backward compatibility with the existing frontend components

/**
 * Maps a menu item from API format to the format expected by the frontend
 * @param {Object} menuItem - The menu item from the API
 * @returns {Object} - The menu item in frontend format
 */
export const mapMenuItemToFrontend = (menuItem) => {
  if (!menuItem) return null;
    // Check for image in different possible field names
  const imageUrl = menuItem.image || menuItem.imageUrl || null;
  
  // If an image URL is found, make sure it has the correct URL format
  let finalImageUrl = imageUrl;
  
  if (finalImageUrl) { 
    
    // If the URL is relative, make it absolute by adding API base URL
    if (finalImageUrl.startsWith('/uploads/')) {
      // API URL is likely defined elsewhere, so construct it properly
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
      finalImageUrl = `${apiBaseUrl}${finalImageUrl}`; 
    }
  } else {
    // If no image URL is found, use a placeholder based on the item name
    finalImageUrl = getPlaceholderImage(menuItem.name); 
  }
    // Extract category information
  // First, try to get information from categoryId (could be object or just ID)
  let categoryName = 'Uncategorized';
  let categoryId = null;
  
  // Handle both object and string ID formats for categoryId
  if (menuItem.categoryId) {
    if (typeof menuItem.categoryId === 'object') {
      // If categoryId is an object with name property
      categoryName = menuItem.categoryId.name || 'Uncategorized';
      categoryId = menuItem.categoryId._id || null;
    } else {
      // If categoryId is just an ID string
      categoryId = menuItem.categoryId;
      // The category name will be updated elsewhere if available
    }
  }
// No console.log here; removed debug logging
  return {
    id: menuItem._id,
    title: menuItem.name,
    subtitle: menuItem.description?.substring(0, 60) || '',
    price: menuItem.price,
    image: finalImageUrl,
    category: categoryName,
    categoryId: categoryId,
    description: menuItem.description,
    isVegetarian: menuItem.isVegetarian || false,
    isVegan: menuItem.isVegan || false,    isGlutenFree: menuItem.isGlutenFree || false,
    calories: menuItem.calories,
    preparationTime: menuItem.preparationTime,
    options: menuItem.options || [],
    // Add size variants and other variant-related fields
  variantGroups: menuItem.variantGroups || [],
    sizeVariants: menuItem.sizeVariants || [],
    variants: menuItem.variants || [],
    sizes: menuItem.sizes || [],
    // Add any additional fields needed by the frontend
  };
};

/**
 * Maps a category from API format to the format expected by the frontend
 * @param {Object} category - The category from the API
 * @returns {Object} - The category in frontend format
 */
export const mapCategoryToFrontend = (category) => {
  if (!category) return null;
  
  // Debug logging to understand what's coming from the backend
// console.log('Raw category data:', category);
  
  // Handle different status field scenarios
  let statusField = 'active';
  if (category.status) {
    statusField = category.status;
  }
  
  // Handle isActive field with the right default value
  // In the admin panel, we would see this as active=true or active=false
  let isActiveField;
  if (category.isActive !== undefined) {
    isActiveField = category.isActive;
  } else if (category.active !== undefined) {
    // Some APIs might use 'active' instead of 'isActive'
    isActiveField = category.active;
  } else {
    // Default to true if not specified
    isActiveField = statusField !== 'inactive';
  }
   
  return {
    id: category._id || category.id,
    name: category.name,
    image: category.imageUrl || category.image || getCategoryDefaultImage(category.name),
    description: category.description,
    status: statusField,
    isActive: isActiveField,
    parentCategory: category.parentCategory || null
  };
};

/**
 * Maps a restaurant from API format to the format expected by the frontend
 * @param {Object} restaurant - The restaurant from the API
 * @returns {Object} - The restaurant in frontend format
 */
export const mapRestaurantToFrontend = (restaurant) => {
  // If restaurant is null or undefined, return null
  if (!restaurant) {
    console.warn('Null or undefined restaurant data passed to mapRestaurantToFrontend');
    return null;
  }
  
  // Log the restaurant data for debugging 
  
  // Create a basic fallback restaurant if data is missing critical fields
  if (!restaurant._id || !restaurant.name) {
    console.warn('Restaurant data is missing critical fields (_id or name):', restaurant);
    // If we have an ID but not a name, create a minimum object
    if (restaurant._id) {
      return {
        _id: restaurant._id,
        id: restaurant._id,
        name: 'Unknown Restaurant',
        coverImageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4',
        defaultTaxRate: 0.1,
      };
    }
    return null;
  }
  
  // Normal mapping with fallbacks for optional fields
  return {
    _id: restaurant._id,
    id: restaurant._id, // Adding id for compatibility
    name: restaurant.name || 'Unknown Restaurant',
    description: restaurant.description || '',
    address: restaurant.address || '',
    phone: restaurant.phone || '',
    email: restaurant.email || '',
    website: restaurant.website || '',
    country: restaurant.country || 'Unknown',
    coverImageUrl: restaurant.logo || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4',
    defaultTaxRate: restaurant.defaultTaxRate || 0.1,
    // Add any additional fields needed by the frontend
  };
};

/**
 * Maps a branch from API format to the format expected by the frontend
 * @param {Object} branch - The branch from the API
 * @returns {Object} - The branch in frontend format
 */
export const mapBranchToFrontend = (branch) => {
  if (!branch) return null;
  
  return {
    _id: branch._id,
    id: branch._id, // Adding id for compatibility
    name: branch.name,
    address: branch.address,
    phone: branch.phone,
    email: branch.email,
    country: branch.country || 'Unknown',
    restaurantId: branch.restaurantId,
    // Add any additional fields needed by the frontend
  };
};

/**
 * Maps a table from API format to the format expected by the frontend
 * @param {Object} table - The table from the API
 * @returns {Object} - The table in frontend format
 */
export const mapTableToFrontend = (table) => {
  if (!table) return null;
  
  return {
    _id: table._id,
    id: table.tableId, // Adding id for compatibility
    name: table.TableName,
    tableNumber: table.tableNumber,
    capacity: table.capacity,
    isOccupied: table.status === 'occupied',
    branchId: table.branchId,
    restaurantId: table.restaurantId,
    floorId: table.floorId,
    status: table.status,
    // Add any additional fields needed by the frontend
  };
};

/**
 * Get a placeholder image for a menu item based on its name
 * @param {string} name - The name of the menu item
 * @returns {string} - URL for a placeholder image
 */
const getPlaceholderImage = (name = '') => {
  const nameLower = name.toLowerCase();
  
//   if (nameLower.includes('burger')) {
//     return 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8YnVyZ2VyfGVufDB8fDB8fA%3D%3D&auto=format&fit=crop&w=500&q=60';
//   } else if (nameLower.includes('pizza')) {
//     return 'https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8cGl6emF8ZW58MHx8MHx8&auto=format&fit=crop&w=500&q=60';
//   } else if (nameLower.includes('salad')) {
//     return 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8c2FsYWR8ZW58MHx8MHx8&auto=format&fit=crop&w=500&q=60';
//   } else if (nameLower.includes('chicken')) {
//     return 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8NXx8Y2hpY2tlbiUyMGZvb2R8ZW58MHx8MHx8&auto=format&fit=crop&w=500&q=60';
//   } else if (nameLower.includes('coffee') || nameLower.includes('latte')) {
//     return 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8Y29mZmVlfGVufDB8fDB8fA%3D%3D&auto=format&fit=crop&w=500&q=60';
//   } else if (nameLower.includes('dessert') || nameLower.includes('cake')) {
//     return 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8Nnx8ZGVzc2VydHxlbnwwfHwwfHw%3D&auto=format&fit=crop&w=500&q=60';
//   } else if (nameLower.includes('pasta') || nameLower.includes('noodle')) {
//     return 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8cGFzdGF8ZW58MHx8MHx8&auto=format&fit=crop&w=500&q=60';
//   } else if (nameLower.includes('sandwich')) {
//     return 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8c2FuZHdpY2h8ZW58MHx8MHx8&auto=format&fit=crop&w=500&q=60';
//   } else if (nameLower.includes('soup')) {
//     return 'https://images.unsplash.com/photo-1547592180-85f173990554?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8c291cHxlbnwwfHwwfHw%3D&auto=format&fit=crop&w=500&q=60';
//   }
  
  // Default food image for anything else
  return 'https://png.pngtree.com/png-clipart/20231003/original/pngtree-tasty-burger-png-ai-generative-png-image_13245897.png';
};

/**
 * Get a default image for a category based on its name
 * @param {string} categoryName - The name of the category
 * @returns {string} - URL for a default category image
 */
const getCategoryDefaultImage = (categoryName = '') => {
  const categoryIcons = {
    'All': 'https://cdn-icons-png.flaticon.com/512/6134/6134645.png',
    'Appetizers': 'https://cdn-icons-png.flaticon.com/512/5787/5787212.png',
    'Starters': 'https://cdn-icons-png.flaticon.com/512/5787/5787212.png',
    'Main Course': 'https://cdn-icons-png.flaticon.com/512/2515/2515263.png',
    'Mains': 'https://cdn-icons-png.flaticon.com/512/2515/2515263.png',
    'Desserts': 'https://cdn-icons-png.flaticon.com/512/3081/3081967.png',
    'Drinks': 'https://cdn-icons-png.flaticon.com/512/2405/2405469.png',
    'Beverages': 'https://cdn-icons-png.flaticon.com/512/2405/2405469.png',
    'Soups': 'https://cdn-icons-png.flaticon.com/512/2276/2276931.png',
    'Salads': 'https://cdn-icons-png.flaticon.com/512/2515/2515183.png',
    'Burgers': 'https://cdn-icons-png.flaticon.com/512/3075/3075977.png',
    'Pizza': 'https://cdn-icons-png.flaticon.com/512/3132/3132693.png',
    'Pasta': 'https://cdn-icons-png.flaticon.com/512/2276/2276589.png',
    'Seafood': 'https://cdn-icons-png.flaticon.com/512/3082/3082040.png',
    'Breakfast': 'https://cdn-icons-png.flaticon.com/512/1147/1147805.png',
    'Lunch': 'https://cdn-icons-png.flaticon.com/512/1147/1147940.png',
    'Dinner': 'https://cdn-icons-png.flaticon.com/512/1147/1147801.png',
    'Snacks': 'https://cdn-icons-png.flaticon.com/512/2515/2515325.png',
    'Sides': 'https://cdn-icons-png.flaticon.com/512/2515/2515183.png',
    'Uncategorized': 'https://cdn-icons-png.flaticon.com/512/1827/1827319.png',
  };
  
  return categoryIcons[categoryName] || 'https://cdn-icons-png.flaticon.com/512/1147/1147801.png';
};

export default {
  mapMenuItemToFrontend,
  mapCategoryToFrontend,
  mapRestaurantToFrontend,
  mapBranchToFrontend,
  mapTableToFrontend
};
