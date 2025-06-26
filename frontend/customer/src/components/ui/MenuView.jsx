import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRestaurant } from '../../context/RestaurantContext';
import ProductGrid from './ProductGrid';
import CategoryFilter from './CategoryFilter';
import SearchBar from './SearchBar';
import CartButton from './CartButton';
import EnhancedCart from './EnhancedCart';
import { theme } from '../../data/theme';

const MenuView = () => {
  const { restaurant, branch, table, menuItems, categories, loading, error } = useRestaurant();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Memoized handler for category selection to avoid recreating function on each render
  const handleCategorySelect = useCallback((categoryId) => {
    setSelectedCategory(categoryId);
  }, []);
  
  // Filter menu items based on category and search query
  const filteredItems = menuItems
    .filter(item => {
      // If 'all' category is selected, show all items
      if (selectedCategory === 'all') return true;
      
      // Otherwise, filter by category
      return item.categoryId === selectedCategory;
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
      <div style={{
        backgroundColor: theme.colors.card,
        padding: '20px',
        marginBottom: '16px',
        position: 'relative',
        backgroundImage: restaurant?.coverImageUrl ? `url(${restaurant.coverImageUrl})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: restaurant?.coverImageUrl ? 'white' : theme.colors.text.primary
      }}>
        {restaurant?.coverImageUrl && (
          <div style={{
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
              Table: {table.name}
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
      <div style={{ padding: '0 16px 16px 16px' }}>
        <SearchBar 
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search menu..."
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
      <div style={{ padding: '0 16px' }}>
        {filteredItems.length > 0 ? (
          <ProductGrid products={filteredItems} />
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