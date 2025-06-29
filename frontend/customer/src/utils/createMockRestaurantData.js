// createMockRestaurantData.js - Creates mock restaurant data based on provided IDs
import { dummyData } from '../data/dummyData';

/**
 * Creates mock restaurant data to use as a fallback when API fails
 * @param {string} restaurantId - The restaurant ID from URL or QR code
 * @param {string} branchId - The branch ID from URL or QR code
 * @param {string} tableId - The table ID from URL or QR code
 * @returns {Object} Mock restaurant data
 */
const createMockRestaurantData = (restaurantId, branchId, tableId) => {
  // Create deep copies to avoid modifying the original objects
  const restaurant = { ...dummyData.restaurant };
  const branch = { ...dummyData.branch };
  const table = { ...dummyData.table };
  
  // Override IDs with the ones provided
  if (restaurantId) {
    restaurant._id = restaurantId;
    restaurant.id = restaurantId; // For compatibility
  }
  
  if (branchId) {
    branch._id = branchId;
    branch.id = branchId; // For compatibility
    branch.restaurantId = restaurantId || branch.restaurantId;
  }
  
  if (tableId) {
    table._id = tableId;
    table.id = tableId; // For compatibility
    table.restaurantId = restaurantId || table.restaurantId;
    table.branchId = branchId || table.branchId;
  }
  
  return {
    restaurant,
    branch,
    table,
    menuItems: [...dummyData.menuItems], // Use spread to create new array
    categories: [...dummyData.categories] // Use spread to create new array
  };
};

export default createMockRestaurantData;
