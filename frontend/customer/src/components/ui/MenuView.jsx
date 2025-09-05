import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRestaurant } from '../../context/RestaurantContext';
import { useResponsive } from '../../context/ResponsiveContext';
import ProductGrid from './ProductGrid';
import CategoryFilter from './CategoryFilter';
import SearchBar from './SearchBar';
import CartButton from './CartButton';
import EnhancedCart from './EnhancedCart';
import { theme } from '../../data/theme';

// Helper function to get proper table display name
const getTableDisplayName = (table) => {
  // If table.name exists but contains "Table undefined", extract a better identifier
  if (table.name === "Table undefined") {
    // Try to get a better identifier
    if (table.number) return `Table ${table.number}`;
    if (table.id) return `Table ${table.id}`;
    return "Table";
  }
  
  // If table.name exists and is not "Table undefined", use it
  if (table.name && table.name !== "undefined") return table.name;
  
  // If table.name doesn't exist or is "undefined", try other properties
  if (table.number) return `Table ${table.number}`;
  if (table.id) return `Table ${table.id}`;
  
  // Fallback
  return "Table";
};

const MenuView = () => {
  const { restaurant, branch, table, menuItems, categories, loading, error } = useRestaurant();
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
    
  // Memoized handler for category selection to avoid recreating function on each render
  const handleCategorySelect = useCallback((categoryId) => {
    setSelectedCategory(categoryId);
  }, []);

  // Handler for search input change
  const handleSearchChange = useCallback((e) => {
    setSearchQuery(e.target.value);
  }, []);

  // Handler for clearing search
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);
    // Filter menu items based on category and search query
  const filteredItems = menuItems
    .filter(item => {
 

      // If 'all' category is selected, show all items
      if (selectedCategory === 'all') return true;
      
      // Get item's category ID
      const itemCategoryId = item.categoryId || (item.category && (item.category._id || item.category));
      
      // Find the current selected category object
      const selectedCategoryObj = categories.find(cat => {
        const catId = cat.id || cat._id;
        return catId === selectedCategory;
      });
      
      if (!selectedCategoryObj) return false;
        // Case 1: Direct match with selected category
      if (itemCategoryId === selectedCategory) return true;
      
      // Case 2: Item belongs to a subcategory of the selected category
      const isSubcategoryOfSelected = categories.some(cat => {
        // Check if this is a subcategory of our selected category
        if (!cat.parentCategory) return false;
        
        // Check if it's active - only consider categories active if:
        // 1. isActive is explicitly true, OR
        // 2. isActive is undefined AND status is not 'inactive'
        let isActive = false;
        if (cat.isActive === true) {
          isActive = true;
        } else if (cat.isActive === undefined && cat.status !== 'inactive') {
          isActive = true;
        }
        
        console.log(`MenuView - Checking subcategory "${cat.name}" for item filtering: isActive=${isActive}, status=${cat.status}, isActiveField=${cat.isActive === undefined ? 'undefined' : cat.isActive}`);
        
        // Skip inactive categories
        if (!isActive) return false;
        
        const parentId = typeof cat.parentCategory === 'object' 
          ? cat.parentCategory._id 
          : cat.parentCategory;
          
        const catId = cat.id || cat._id;
        
        return parentId === selectedCategory && catId === itemCategoryId;
      });
      
      return isSubcategoryOfSelected;
    })
    .filter(item => {
      // If there's a search query, filter by title or description
      if (!searchQuery) return true;
      
      const query = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(query) || 
        item.description.toLowerCase().includes(query)
      );
    });

  // Handle error state
  if (error) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        maxWidth: '500px',
        margin: '40px auto',
        backgroundColor: theme.colors.card,
        borderRadius: theme.borderRadius.lg,
        boxShadow: theme.shadows.md
      }}>
        <h2 style={{
          color: theme.colors.text.primary,
          marginBottom: '16px'
        }}>
          Error Loading Menu
        </h2>
        <p style={{
          color: theme.colors.text.secondary,
          marginBottom: '24px'
        }}>
          {error}
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            backgroundColor: theme.colors.primary,
            color: 'white',
            border: 'none',
            borderRadius: theme.borderRadius.md,
            padding: '12px 24px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  // Handle loading state
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '20px'
      }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            repeat: Infinity,
            duration: 1,
            ease: 'linear'
          }}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: '3px solid rgba(0, 0, 0, 0.1)',
            borderTopColor: theme.colors.primary,
            marginBottom: '16px'
          }}
        />
        <p style={{
          fontSize: '18px',
          fontWeight: 'bold',
          color: theme.colors.text.primary
        }}>
          Loading Menu...
        </p>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '80px' }}>
      {/* Restaurant and Branch Information */}
      <div className='' style={{
        backgroundColor: theme.colors.card,
        padding: '20px',
        marginBottom: '16px',
        position: 'relative',
        backgroundImage: restaurant?.coverImageUrl ? `url(${restaurant.coverImageUrl})` : 'none',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        color: restaurant?.coverImageUrl ? 'white' : theme.colors.text.primary
      }}>
        {restaurant?.coverImageUrl && (
          <div className='row' style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            zIndex: 1
          }} />
        )}
        
        <div style={{ position: 'relative', zIndex: 2 }}>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: 'bold', 
            margin: '0 0 4px 0' 
          }}>
            {restaurant?.name || 'Restaurant'}
          </h1>
          
          <p style={{ 
            fontSize: '16px', 
            margin: '0 0 8px 0',
            opacity: 0.9
          }}>
            {branch?.name || 'Branch'}
          </p>
          
          {table && (
            <div style={{
              display: 'inline-block',
              backgroundColor: theme.colors.primary,
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: 'bold',
              marginBottom: '8px'
            }}>
              {getTableDisplayName(table)}
            </div>
          )}
          
          {restaurant?.description && (
            <p style={{ 
              fontSize: '14px', 
              margin: '8px 0 0 0',
              opacity: 0.8,
              maxWidth: '600px' 
            }}>
              {restaurant.description}
            </p>
          )}
        </div>
      </div>
      
      {/* Search Bar */}
      <div style={{ padding: '0px 0px 10px' }}>
        <SearchBar 
          value={searchQuery}
          onChange={handleSearchChange}
          onClear={searchQuery ? handleClearSearch : undefined}
          isTablet={isTablet}
          isDesktop={isDesktop}
          placeholder="Search our delicious menu..."
          showFilters={false}
        />
      </div>
      
      {/* Category Filter - Pass the id for filtering instead of name */}
      <div style={{ marginBottom: '20px' }}>
        <CategoryFilter
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={handleCategorySelect}
        />
      </div>
      
      {/* Menu Items Grid */}
      <div style={{ padding: '0 0px' }}>
        {filteredItems.length > 0 ? (
          <ProductGrid 
            products={filteredItems} 
            selectedCategoryName={(() => {
              if (selectedCategory === 'all') return 'All';
              const found = categories.find(cat => (cat.id || cat._id) === selectedCategory);
              return found?.name || 'Other Items';
            })()} 
          />
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            backgroundColor: theme.colors.background,
            borderRadius: theme.borderRadius.lg,
            margin: '20px 0'
          }}>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: 'bold',
              color: theme.colors.text.primary,
              marginBottom: '8px'
            }}>
              No items found
            </h3>
            <p style={{
              color: theme.colors.text.secondary,
              fontSize: '14px'
            }}>
              Try changing your search or selecting a different category
            </p>
          </div>
        )}
      </div>
      
      {/* Cart Button */}
      <CartButton onClick={() => setIsCartOpen(true)} />
      
      {/* Cart Modal */}
      <EnhancedCart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
};

export default MenuView;