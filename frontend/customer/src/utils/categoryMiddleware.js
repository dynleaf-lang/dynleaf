/**
 * Helper functions for category management
 * This module provides functions to ensure we always have proper categories
 */

/**
 * Returns a mapping of category names to image URLs
 */
export const getCategoryImageMap = () => {
  return {
    'all': 'https://cdn-icons-png.flaticon.com/512/6134/6134645.png',
    'starters': 'https://cdn-icons-png.flaticon.com/512/5787/5787212.png',
    'appetizers': 'https://cdn-icons-png.flaticon.com/512/5787/5787212.png',
    'main course': 'https://cdn-icons-png.flaticon.com/512/2515/2515263.png',
    'mains': 'https://cdn-icons-png.flaticon.com/512/2515/2515263.png',
    'desserts': 'https://cdn-icons-png.flaticon.com/512/3081/3081967.png',
    'drinks': 'https://cdn-icons-png.flaticon.com/512/2405/2405469.png',
    'beverages': 'https://cdn-icons-png.flaticon.com/512/2405/2405469.png',
    'sides': 'https://cdn-icons-png.flaticon.com/512/4479/4479598.png',
    'burgers': 'https://cdn-icons-png.flaticon.com/512/3075/3075977.png',
    'pizza': 'https://cdn-icons-png.flaticon.com/512/3132/3132693.png',
    'pasta': 'https://cdn-icons-png.flaticon.com/512/2276/2276589.png',
    'salads': 'https://cdn-icons-png.flaticon.com/512/2515/2515183.png',
    'soups': 'https://cdn-icons-png.flaticon.com/512/2276/2276931.png',
    'sandwiches': 'https://cdn-icons-png.flaticon.com/512/1046/1046857.png',
    'breakfast': 'https://cdn-icons-png.flaticon.com/512/1147/1147933.png',
    'lunch': 'https://cdn-icons-png.flaticon.com/512/1147/1147801.png',
    'dinner': 'https://cdn-icons-png.flaticon.com/512/1147/1147949.png',
    'snacks': 'https://cdn-icons-png.flaticon.com/512/3081/3081913.png',
    'vegan': 'https://cdn-icons-png.flaticon.com/512/2515/2515183.png',
    'vegetarian': 'https://cdn-icons-png.flaticon.com/512/2515/2515183.png',
    'non-vegetarian': 'https://cdn-icons-png.flaticon.com/512/2515/2515263.png',
    'specials': 'https://cdn-icons-png.flaticon.com/512/1806/1806494.png'
  };
};

/**
 * Get an appropriate image URL for a category name
 */
export const getCategoryImage = (categoryName) => {
  if (!categoryName) return 'https://cdn-icons-png.flaticon.com/512/6134/6134645.png';
  
  const categories = getCategoryImageMap();
  const nameLower = categoryName.toLowerCase();
  
  // Try direct match
  if (categories[nameLower]) {
    return categories[nameLower];
  }
  
  // Try partial match
  for (const [key, url] of Object.entries(categories)) {
    if (nameLower.includes(key) || key.includes(nameLower)) {
      return url;
    }
  }
  
  // Default category image
  return 'https://cdn-icons-png.flaticon.com/512/6134/6134645.png';
};

/**
 * Ensures that a minimum set of categories is available
 * If no categories are provided, it generates default ones
 * 
 * @param {Array} existingCategories - The categories returned from the API or current state
 * @returns {Array} - A complete list of categories
 */
export const ensureCategories = (existingCategories = []) => {
  // Ensuring categories

  // If we already have categories beyond just "All", use them
  if (existingCategories && Array.isArray(existingCategories) && existingCategories.length > 1) {
    // If these are already objects with id/name, return as is
    if (typeof existingCategories[0] === 'object') {
      // Ensure "All" is the first category
      const hasAll = existingCategories.some(cat => 
        (cat.name === 'All' || cat.name === 'all') || 
        (cat.id === 'all' || cat.id === 'All')
      );
      
      if (!hasAll) {
        // Add "All" category if missing
        const allCategory = {
          id: 'all',
          name: 'All',
          image: 'https://cdn-icons-png.flaticon.com/512/6134/6134645.png'
        };
        return [allCategory, ...existingCategories];
      }
      
      // Using existing category objects
      return existingCategories;
    }
    
    // If these are just strings, convert to objects
    if (typeof existingCategories[0] === 'string') {
      // Converting category strings to objects
      // Ensure "All" is included
      const categories = [...existingCategories];
      if (!categories.includes('All') && !categories.includes('all')) {
        categories.unshift('All');
      }
      
      return categories.map(name => ({
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name: name,
        image: getCategoryImage(name)
      }));
    }
  }
  // Helper function to get category image
  const categoryImages = getCategoryImageMap();
  
  // Default categories to use if none are provided
  const defaultCategories = [
    { 
      id: 'all', 
      name: 'All',
      image: 'https://cdn-icons-png.flaticon.com/512/6134/6134645.png'
    },
    {
      id: 'starters',
      name: 'Starters',
      image: 'https://cdn-icons-png.flaticon.com/512/5787/5787212.png'
    },
    {
      id: 'main-course',
      name: 'Main Course',
      image: 'https://cdn-icons-png.flaticon.com/512/2515/2515263.png'
    },
    {
      id: 'desserts',
      name: 'Desserts',
      image: 'https://cdn-icons-png.flaticon.com/512/3081/3081967.png'
    },
    {
      id: 'beverages',
      name: 'Beverages',
      image: 'https://cdn-icons-png.flaticon.com/512/2405/2405469.png'
    }
  ];

  // No categories found, using defaults
  return defaultCategories;
};

/**
 * Maps a menu item to its appropriate category 
 * 
 * @param {Object} menuItem - The menu item to categorize
 * @returns {String} - The category name
 */
export const categorizeMenuItem = (menuItem) => {
  if (!menuItem) return 'Uncategorized';
  
  // Try to get category from the menu item itself
  if (menuItem.categoryId && menuItem.categoryId.name) {
    return menuItem.categoryId.name;
  }
  
  // Try to infer from name or description
  const nameLower = menuItem.name ? menuItem.name.toLowerCase() : '';
  const descLower = menuItem.description ? menuItem.description.toLowerCase() : '';
  
  // Try to find matching category based on keywords
  if (nameLower.includes('starter') || nameLower.includes('appetizer') || 
      descLower.includes('starter') || descLower.includes('appetizer')) {
    return 'Starters';
  }
  
  if (nameLower.includes('dessert') || nameLower.includes('cake') || nameLower.includes('ice cream') || 
      descLower.includes('dessert') || descLower.includes('sweet')) {
    return 'Desserts';
  }
  
  if (nameLower.includes('drink') || nameLower.includes('beverage') || nameLower.includes('coffee') || 
      nameLower.includes('tea') || nameLower.includes('juice') ||
      descLower.includes('drink') || descLower.includes('beverage')) {
    return 'Beverages';
  }
  
  // Default to "Main Course" for most items
  return 'Main Course';
};
