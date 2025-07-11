import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRestaurant } from '../../context/RestaurantContext';
import { useCart } from '../../context/CartContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useResponsive } from '../../context/ResponsiveContext';
import SearchBar from './SearchBar';
import { theme } from '../../data/theme';

const SearchView = () => {
  const { menuItems, categories, loading, error } = useRestaurant();
  const { addItem } = useCart();
  const { currencySymbol, formatCurrency } = useCurrency();
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchHistory, setSearchHistory] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [addingItems, setAddingItems] = useState(new Set());
  const [searchStartTime, setSearchStartTime] = useState(null);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [priceFilter, setPriceFilter] = useState('all');
  const [dietaryFilters, setDietaryFilters] = useState([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Price filter options
  const priceRanges = useMemo(() => [
    { id: 'all', label: 'All Prices', min: 0, max: Infinity },
    { id: 'budget', label: `Under ${currencySymbol}10`, min: 0, max: 10 },
    { id: 'moderate', label: `${currencySymbol}10 - ${currencySymbol}20`, min: 10, max: 20 },
    { id: 'premium', label: `${currencySymbol}20+`, min: 20, max: Infinity }
  ], [currencySymbol]);

  // Dietary filter options
  const dietaryOptions = [
    { id: 'vegetarian', label: '🌱 Vegetarian', field: 'isVegetarian' },
    { id: 'vegan', label: '🌿 Vegan', field: 'isVegan' },
    { id: 'glutenFree', label: '🌾 Gluten Free', field: 'isGlutenFree' },
    { id: 'spicy', label: '🌶️ Spicy', field: 'isSpicy' }
  ];

  // Load search history from localStorage on component mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('searchHistory');
      if (savedHistory) {
        setSearchHistory(JSON.parse(savedHistory));
      }
    } catch (error) {
      console.error('Error loading search history:', error);
    }
  }, []);

  // Save search history to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  }, [searchHistory]);

  // Helper function to highlight search matches
  const highlightMatch = useCallback((text, query) => {
    if (!query || !text) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} style={{
          backgroundColor: `${theme.colors.primary}20`,
          color: theme.colors.primary,
          padding: "0 2px",
          borderRadius: "2px",
          fontWeight: theme.typography.fontWeights.semibold
        }}>
          {part}
        </mark>
      ) : part
    );
  }, [theme]);

  // Popular search terms based on real menu data
  const popularSearches = useMemo(() => {
    if (!menuItems || menuItems.length === 0) {
      return ['Pizza', 'Burger', 'Pasta', 'Salad', 'Chicken', 'Dessert', 'Coffee', 'Sandwich'];
    }

    const searchTerms = new Set();
    
    // Extract popular terms from menu items
    menuItems.forEach(item => {
      // Add item titles (split by common separators)
      const titleWords = item.title.split(/[\s\-&,]+/).filter(word => word.length > 2);
      titleWords.forEach(word => searchTerms.add(word.trim()));
      
      // Add category names
      if (item.category?.name) {
        searchTerms.add(item.category.name);
      }
      
      // Add cuisine types
      if (item.cuisine) {
        searchTerms.add(item.cuisine);
      }
      
      // Add common ingredients if available
      if (item.ingredients) {
        item.ingredients.forEach(ingredient => {
          if (ingredient.length > 2) {
            searchTerms.add(ingredient);
          }
        });
      }
      
      // Add common tags if available
      if (item.tags) {
        item.tags.forEach(tag => {
          if (tag.length > 2) {
            searchTerms.add(tag);
          }
        });
      }
    });

    // Convert to array and sort by relevance (frequency of appearance)
    const termFrequency = {};
    Array.from(searchTerms).forEach(term => {
      const count = menuItems.filter(item => 
        item.title.toLowerCase().includes(term.toLowerCase()) ||
        item.description?.toLowerCase().includes(term.toLowerCase()) ||
        item.category?.name?.toLowerCase().includes(term.toLowerCase()) ||
        item.cuisine?.toLowerCase().includes(term.toLowerCase())
      ).length;
      termFrequency[term] = count;
    });

    // Sort by frequency and take top 8
    return Array.from(searchTerms)
      .sort((a, b) => termFrequency[b] - termFrequency[a])
      .slice(0, 8);
  }, [menuItems]);

  // Get search suggestions based on menu items
  const searchSuggestions = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];
    
    const query = searchQuery.toLowerCase();
    const suggestions = new Set();
    
    menuItems.forEach(item => {
      // Add title matches
      if (item.title.toLowerCase().includes(query)) {
        suggestions.add(item.title);
      }
      
      // Add description word matches
      const descWords = item.description.toLowerCase().split(' ');
      descWords.forEach(word => {
        if (word.includes(query) && word.length > 2) {
          suggestions.add(word);
        }
      });
      
      // Add ingredient matches if available
      if (item.ingredients) {
        item.ingredients.forEach(ingredient => {
          if (ingredient.toLowerCase().includes(query)) {
            suggestions.add(ingredient);
          }
        });
      }
    });
    
    return Array.from(suggestions).slice(0, 5);
  }, [searchQuery, menuItems]);

  // Filter menu items based on search query and category
  const filteredResults = useMemo(() => {
    if (!searchQuery) return [];
    
    const query = searchQuery.toLowerCase();
    let results = menuItems.filter(item => {
      // Search in title
      const titleMatch = item.title.toLowerCase().includes(query);
      
      // Search in description
      const descriptionMatch = item.description.toLowerCase().includes(query);
      
      // Search in category name
      const categoryMatch = item.category?.name?.toLowerCase().includes(query);
      
      // Search in ingredients if available
      const ingredientsMatch = item.ingredients?.some(ingredient => 
        ingredient.toLowerCase().includes(query)
      );
      
      // Search in tags if available
      const tagsMatch = item.tags?.some(tag => 
        tag.toLowerCase().includes(query)
      );
      
      // Search in cuisine type if available
      const cuisineMatch = item.cuisine?.toLowerCase().includes(query);
      
      return titleMatch || descriptionMatch || categoryMatch || ingredientsMatch || tagsMatch || cuisineMatch;
    });

    // Filter by category if not 'all'
    if (selectedCategory !== 'all') {
      results = results.filter(item => {
        const itemCategoryId = item.categoryId || (item.category && (item.category._id || item.category));
        return itemCategoryId === selectedCategory;
      });
    }

    // Filter by price range
    if (priceFilter !== 'all') {
      const priceRange = priceRanges.find(range => range.id === priceFilter);
      if (priceRange) {
        results = results.filter(item => {
          const price = item.price || 0;
          return price >= priceRange.min && price <= priceRange.max;
        });
      }
    }

    // Filter by dietary preferences
    if (dietaryFilters.length > 0) {
      results = results.filter(item => {
        return dietaryFilters.every(filterId => {
          const dietary = dietaryOptions.find(opt => opt.id === filterId);
          return dietary ? item[dietary.field] : true;
        });
      });
    }

    // Sort results by relevance (title matches first, then description, etc.)
    results.sort((a, b) => {
      const aTitle = a.title.toLowerCase();
      const bTitle = b.title.toLowerCase();
      const aDesc = a.description.toLowerCase();
      const bDesc = b.description.toLowerCase();
      
      // Exact title matches first
      if (aTitle === query && bTitle !== query) return -1;
      if (bTitle === query && aTitle !== query) return 1;
      
      // Title starts with query
      if (aTitle.startsWith(query) && !bTitle.startsWith(query)) return -1;
      if (bTitle.startsWith(query) && !aTitle.startsWith(query)) return 1;
      
      // Title contains query
      if (aTitle.includes(query) && !bTitle.includes(query)) return -1;
      if (bTitle.includes(query) && !aTitle.includes(query)) return 1;
      
      // Description matches
      if (aDesc.includes(query) && !bDesc.includes(query)) return -1;
      if (bDesc.includes(query) && !aDesc.includes(query)) return 1;
      
      return 0;
    });
    
    return results;
  }, [searchQuery, selectedCategory, priceFilter, dietaryFilters, menuItems, priceRanges, dietaryOptions]);

  // Handle search loading state separately
  useEffect(() => {
    if (searchQuery) {
      setIsSearching(true);
      const timer = setTimeout(() => setIsSearching(false), 300);
      return () => clearTimeout(timer);
    } else {
      setIsSearching(false);
    }
  }, [searchQuery, selectedCategory, priceFilter, dietaryFilters]);

  // Handle search input change
  const handleSearchChange = useCallback((e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowSuggestions(value.length > 0);
    setSelectedSuggestionIndex(-1);
    setSearchStartTime(performance.now());
  }, []);

  // Handle search submission
  const handleSearchSubmit = useCallback((query = searchQuery) => {
    if (!query.trim()) return;
    
    setShowSuggestions(false);
    
    // Add to search history (avoid duplicates)
    setSearchHistory(prev => {
      const newHistory = [query, ...prev.filter(item => item !== query)].slice(0, 5);
      return newHistory;
    });
  }, [searchQuery]);

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    handleSearchSubmit(suggestion);
  }, [handleSearchSubmit]);

  // Handle keyboard navigation in search
  const handleSearchKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      if (selectedSuggestionIndex >= 0 && searchSuggestions[selectedSuggestionIndex]) {
        handleSuggestionClick(searchSuggestions[selectedSuggestionIndex]);
      } else {
        handleSearchSubmit();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => 
        prev < searchSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => prev > -1 ? prev - 1 : -1);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  }, [selectedSuggestionIndex, searchSuggestions, handleSearchSubmit, handleSuggestionClick]);

  // Handle filter button click
  const handleFilterClick = useCallback(() => {
    setShowAdvancedFilters(prev => !prev);
  }, []);

  // Check if there are active filters
  const hasActiveFilters = useMemo(() => {
    return priceFilter !== 'all' || dietaryFilters.length > 0 || selectedCategory !== 'all';
  }, [priceFilter, dietaryFilters, selectedCategory]);

  // Handle adding item to cart
  const handleAddToCart = useCallback((item, event) => {
    event?.preventDefault();
    event?.stopPropagation();
    
    const itemId = item.id || item._id;
    setAddingItems(prev => new Set(prev).add(itemId));
    
    // Get button position for animation
    const buttonRect = event?.target?.getBoundingClientRect();
    const sourcePosition = buttonRect ? {
      x: buttonRect.left + buttonRect.width / 2,
      y: buttonRect.top + buttonRect.height / 2
    } : null;
    
    try {
      addItem(item, 1, [], sourcePosition);
      
      // Show success feedback
      setTimeout(() => {
        setAddingItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
      }, 1000);
    } catch (error) {
      console.error('Error adding item to cart:', error);
      setAddingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  }, [addItem]);

  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setShowSuggestions(false);
    setPriceFilter('all');
    setDietaryFilters([]);
    setSelectedCategory('all');
  }, []);

  // Get similar items for "no results" suggestions
  const getSimilarItems = useCallback((query) => {
    if (!query) return [];
    
    const words = query.toLowerCase().split(' ');
    const similarItems = menuItems.filter(item => {
      return words.some(word => 
        item.title.toLowerCase().includes(word) ||
        item.description.toLowerCase().includes(word) ||
        item.category?.name?.toLowerCase().includes(word)
      );
    }).slice(0, 3);
    
    return similarItems;
  }, [menuItems]);

  // Get category display name
  const getCategoryName = (categoryId) => {
    if (categoryId === 'all') return 'All Categories';
    const category = categories.find(cat => (cat.id || cat._id) === categoryId);
    return category?.name || 'Unknown Category';
  };

  return (
    <div style={{ 
      padding: theme.spacing.md,
      minHeight: "calc(100vh - 200px)",
      backgroundColor: theme.colors.background
    }}>
      {/* Search Header */}
      <div style={{
        marginBottom: theme.spacing.lg,
        textAlign: "center"
      }}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <span className="material-icons" style={{ 
            fontSize: "48px", 
            color: theme.colors.primary,
            marginBottom: theme.spacing.md,
            display: "block"
          }}>
            search
          </span>
          <h1 style={{
            fontSize: theme.typography.sizes["2xl"],
            fontWeight: theme.typography.fontWeights.bold,
            marginBottom: theme.spacing.sm,
            color: theme.colors.text.primary
          }}>
            Find Your Favorite Dishes
          </h1>
          <p style={{
            fontSize: theme.typography.sizes.md,
            color: theme.colors.text.secondary,
            marginBottom: theme.spacing.lg
          }}>
            Search through our delicious menu
          </p>
        </motion.div>
      </div>

      {/* Search Input using SearchBar Component */}
      <div style={{
        maxWidth: "800px",
        margin: "0 auto",
        marginBottom: theme.spacing.lg
      }}>
        <SearchBar
          value={searchQuery}
          onChange={handleSearchChange}
          onKeyDown={handleSearchKeyDown}
          onClear={handleClearSearch}
          onFilterClick={handleFilterClick}
          isTablet={isTablet}
          isDesktop={isDesktop}
          placeholder="Search menu items, ingredients, or categories..."
          showSuggestions={showSuggestions}
          suggestions={searchSuggestions}
          onSuggestionClick={handleSuggestionClick}
          selectedSuggestionIndex={selectedSuggestionIndex}
          showFilters={true}
          hasActiveFilters={hasActiveFilters}
        />
      </div>

      {/* Advanced Filters - Toggle based on filter button */}
      <AnimatePresence>
        {(searchQuery || showAdvancedFilters) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              marginBottom: theme.spacing.lg,
              padding: theme.spacing.md,
              backgroundColor: "#fff",
              borderRadius: theme.borderRadius.lg,
              boxShadow: theme.shadows.sm,
              maxWidth: "800px",
              margin: "0 auto",
              marginBottom: theme.spacing.lg,
              overflow: "hidden"
            }}
          >
            <h4 style={{
              fontSize: theme.typography.sizes.sm,
              fontWeight: theme.typography.fontWeights.semibold,
              marginBottom: theme.spacing.md,
              color: theme.colors.text.primary,
              display: "flex",
              alignItems: "center",
              gap: theme.spacing.sm
            }}>
              <span className="material-icons" style={{ fontSize: "18px" }}>
                tune
              </span>
              Filters
              {hasActiveFilters && (
                <span style={{
                  fontSize: theme.typography.sizes.xs,
                  backgroundColor: theme.colors.primary,
                  color: "#fff",
                  padding: "2px 6px",
                  borderRadius: theme.borderRadius.sm,
                  fontWeight: theme.typography.fontWeights.medium
                }}>
                  {[
                    selectedCategory !== 'all' ? 1 : 0,
                    priceFilter !== 'all' ? 1 : 0,
                    dietaryFilters.length
                  ].reduce((a, b) => a + b, 0)} active
                </span>
              )}
            </h4>
            
            {/* Category Filter */}
            <div style={{ marginBottom: theme.spacing.md }}>
              <label style={{
                fontSize: theme.typography.sizes.xs,
                color: theme.colors.text.secondary,
                marginBottom: theme.spacing.xs,
                display: "block"
              }}>
                Category
              </label>
              <div style={{
                display: "flex",
                gap: theme.spacing.xs,
                flexWrap: "wrap"
              }}>
                <button
                  onClick={() => setSelectedCategory('all')}
                  style={{
                    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                    borderRadius: theme.borderRadius.md,
                    border: "none",
                    backgroundColor: selectedCategory === 'all' ? theme.colors.primary : theme.colors.background,
                    color: selectedCategory === 'all' ? "#fff" : theme.colors.text.primary,
                    fontSize: theme.typography.sizes.xs,
                    fontWeight: theme.typography.fontWeights.medium,
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                >
                  All Categories
                </button>
                {categories.slice(0, 6).map(category => {
                  const categoryId = category.id || category._id;
                  return (
                    <button
                      key={categoryId}
                      onClick={() => setSelectedCategory(categoryId)}
                      style={{
                        padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                        borderRadius: theme.borderRadius.md,
                        border: "none",
                        backgroundColor: selectedCategory === categoryId ? theme.colors.primary : theme.colors.background,
                        color: selectedCategory === categoryId ? "#fff" : theme.colors.text.primary,
                        fontSize: theme.typography.sizes.xs,
                        fontWeight: theme.typography.fontWeights.medium,
                        cursor: "pointer",
                        transition: "all 0.2s ease"
                      }}
                    >
                      {category.name}
                    </button>
                  );
                })}
              </div>
            </div>
          
          {/* Price Filter */}
          <div style={{ marginBottom: theme.spacing.md }}>
            <label style={{
              fontSize: theme.typography.sizes.xs,
              color: theme.colors.text.secondary,
              marginBottom: theme.spacing.xs,
              display: "block"
            }}>
              Price Range
            </label>
            <div style={{
              display: "flex",
              gap: theme.spacing.xs,
              flexWrap: "wrap"
            }}>
              {priceRanges.map(range => (
                <button
                  key={range.id}
                  onClick={() => setPriceFilter(range.id)}
                  style={{
                    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                    borderRadius: theme.borderRadius.md,
                    border: "none",
                    backgroundColor: priceFilter === range.id ? theme.colors.primary : theme.colors.background,
                    color: priceFilter === range.id ? "#fff" : theme.colors.text.primary,
                    fontSize: theme.typography.sizes.xs,
                    fontWeight: theme.typography.fontWeights.medium,
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Dietary Filters */}
          <div>
            <label style={{
              fontSize: theme.typography.sizes.xs,
              color: theme.colors.text.secondary,
              marginBottom: theme.spacing.xs,
              display: "block"
            }}>
              Dietary Preferences
            </label>
            <div style={{
              display: "flex",
              gap: theme.spacing.xs,
              flexWrap: "wrap"
            }}>
              {dietaryOptions.map(option => (
                <button
                  key={option.id}
                  onClick={() => {
                    setDietaryFilters(prev => 
                      prev.includes(option.id)
                        ? prev.filter(id => id !== option.id)
                        : [...prev, option.id]
                    );
                  }}
                  style={{
                    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                    borderRadius: theme.borderRadius.md,
                    border: "none",
                    backgroundColor: dietaryFilters.includes(option.id) ? theme.colors.success : theme.colors.background,
                    color: dietaryFilters.includes(option.id) ? "#fff" : theme.colors.text.primary,
                    fontSize: theme.typography.sizes.xs,
                    fontWeight: theme.typography.fontWeights.medium,
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Clear Filters */}
          {(priceFilter !== 'all' || dietaryFilters.length > 0 || selectedCategory !== 'all') && (
            <button
              onClick={() => {
                setPriceFilter('all');
                setDietaryFilters([]);
                setSelectedCategory('all');
              }}
              style={{
                marginTop: theme.spacing.md,
                padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                borderRadius: theme.borderRadius.md,
                border: `1px solid ${theme.colors.border}`,
                backgroundColor: "transparent",
                color: theme.colors.text.secondary,
                fontSize: theme.typography.sizes.xs,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: theme.spacing.xs
              }}
            >
              <span className="material-icons" style={{ fontSize: "16px" }}>
                clear
              </span>
              Clear All Filters
            </button>
          )}
        </motion.div>
        )}
      </AnimatePresence>

      {/* Search Results */}
      <AnimatePresence mode="wait">
        {searchQuery ? (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {/* Loading State */}
            {isSearching && (
              <div style={{
                textAlign: "center",
                padding: theme.spacing.xl
              }}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  style={{
                    width: "32px",
                    height: "32px",
                    border: `3px solid ${theme.colors.border}`,
                    borderTopColor: theme.colors.primary,
                    borderRadius: "50%",
                    margin: "0 auto",
                    marginBottom: theme.spacing.md
                  }}
                />
                <p style={{
                  color: theme.colors.text.secondary,
                  fontSize: theme.typography.sizes.sm
                }}>
                  Searching...
                </p>
              </div>
            )}

            {/* Results */}
            {!isSearching && (
              <>
                <div style={{
                  marginBottom: theme.spacing.md,
                  textAlign: "center",
                  padding: `${theme.spacing.sm} 0`
                }}>
                  <p style={{
                    fontSize: theme.typography.sizes.sm,
                    color: theme.colors.text.secondary,
                    margin: 0
                  }}>
                    {isSearching ? (
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: theme.spacing.xs }}>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                          style={{
                            width: "12px",
                            height: "12px",
                            border: `2px solid ${theme.colors.border}`,
                            borderTopColor: theme.colors.primary,
                            borderRadius: "50%"
                          }}
                        />
                        Searching...
                      </span>
                    ) : (
                      <>
                        {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''} found for "
                        <strong style={{ color: theme.colors.primary }}>{searchQuery}</strong>"
                        {selectedCategory !== 'all' && (
                          <> in <strong>{getCategoryName(selectedCategory)}</strong></>
                        )}
                        {priceFilter !== 'all' && (
                          <> • <strong>{priceRanges.find(r => r.id === priceFilter)?.label}</strong></>
                        )}
                        {dietaryFilters.length > 0 && (
                          <> • <strong>{dietaryFilters.length} dietary filter{dietaryFilters.length !== 1 ? 's' : ''}</strong></>
                        )}
                        <span style={{ 
                          fontSize: theme.typography.sizes.xs,
                          marginLeft: theme.spacing.sm,
                          opacity: 0.7
                        }}>
                          ({searchStartTime ? ((performance.now() - searchStartTime) / 1000).toFixed(2) : '0.00'}s)
                        </span>
                      </>
                    )}
                  </p>
                </div>

                {filteredResults.length > 0 ? (
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: window.innerWidth > 768 
                      ? "repeat(auto-fill, minmax(300px, 1fr))" 
                      : "1fr",
                    gap: theme.spacing.md,
                    maxWidth: "1200px",
                    margin: "0 auto"
                  }}>
                    {filteredResults.map((item, index) => (
                      <motion.div
                        key={item.id || item._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        style={{
                          backgroundColor: "#fff",
                          borderRadius: theme.borderRadius.lg,
                          boxShadow: theme.shadows.sm,
                          overflow: "hidden",
                          cursor: "pointer",
                          transition: "all 0.2s ease"
                        }}
                        whileHover={{
                          y: -4,
                          boxShadow: theme.shadows.lg
                        }}
                      >
                        {item.imageUrl && (
                          <div style={{
                            height: "180px",
                            backgroundImage: `url(${item.imageUrl})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center"
                          }} />
                        )}
                        
                        <div style={{ padding: theme.spacing.md }}>
                          <h3 style={{
                            fontSize: theme.typography.sizes.lg,
                            fontWeight: theme.typography.fontWeights.semibold,
                            marginBottom: theme.spacing.xs,
                            color: theme.colors.text.primary,
                            lineHeight: "1.3"
                          }}>
                            {highlightMatch(item.title, searchQuery)}
                          </h3>
                          
                          <p style={{
                            fontSize: theme.typography.sizes.sm,
                            color: theme.colors.text.secondary,
                            marginBottom: theme.spacing.sm,
                            lineHeight: "1.4"
                          }}>
                            {highlightMatch(
                              item.description.length > 120 
                                ? item.description.substring(0, 120) + '...'
                                : item.description,
                              searchQuery
                            )}
                          </p>
                          
                          {/* Category and additional info */}
                          <div style={{
                            marginBottom: theme.spacing.sm,
                            display: "flex",
                            flexWrap: "wrap",
                            gap: theme.spacing.xs,
                            alignItems: "center"
                          }}>
                            {item.category?.name && (
                              <span style={{
                                fontSize: theme.typography.sizes.xs,
                                backgroundColor: `${theme.colors.secondary}10`,
                                color: theme.colors.secondary,
                                padding: `2px ${theme.spacing.xs}`,
                                borderRadius: theme.borderRadius.sm,
                                fontWeight: theme.typography.fontWeights.medium
                              }}>
                                {item.category.name}
                              </span>
                            )}
                            
                            {item.cuisine && (
                              <span style={{
                                fontSize: theme.typography.sizes.xs,
                                backgroundColor: `${theme.colors.accent}10`,
                                color: theme.colors.accent,
                                padding: `2px ${theme.spacing.xs}`,
                                borderRadius: theme.borderRadius.sm,
                                fontWeight: theme.typography.fontWeights.medium
                              }}>
                                {item.cuisine}
                              </span>
                            )}
                            
                            {item.isVegetarian && (
                              <span style={{
                                fontSize: theme.typography.sizes.xs,
                                backgroundColor: `${theme.colors.success}10`,
                                color: theme.colors.success,
                                padding: `2px ${theme.spacing.xs}`,
                                borderRadius: theme.borderRadius.sm,
                                fontWeight: theme.typography.fontWeights.medium
                              }}>
                                🌱 Vegetarian
                              </span>
                            )}
                            
                            {item.isSpicy && (
                              <span style={{
                                fontSize: theme.typography.sizes.xs,
                                backgroundColor: `${theme.colors.danger}10`,
                                color: theme.colors.danger,
                                padding: `2px ${theme.spacing.xs}`,
                                borderRadius: theme.borderRadius.sm,
                                fontWeight: theme.typography.fontWeights.medium
                              }}>
                                🌶️ Spicy
                              </span>
                            )}
                          </div>
                          
                          <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                          }}>
                            <span style={{
                              fontSize: theme.typography.sizes.lg,
                              fontWeight: theme.typography.fontWeights.bold,
                              color: theme.colors.primary
                            }}>
                              {formatCurrency(item.price)}
                            </span>
                            
                            <button 
                              onClick={(e) => handleAddToCart(item, e)}
                              disabled={addingItems.has(item.id || item._id)}
                              style={{
                                backgroundColor: addingItems.has(item.id || item._id) 
                                  ? theme.colors.success 
                                  : theme.colors.primary,
                                color: "#fff",
                                border: "none",
                                borderRadius: theme.borderRadius.md,
                                padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                                fontSize: theme.typography.sizes.sm,
                                fontWeight: theme.typography.fontWeights.medium,
                                cursor: addingItems.has(item.id || item._id) ? "default" : "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: theme.spacing.xs,
                                transition: "all 0.2s ease",
                                minWidth: "90px",
                                justifyContent: "center"
                              }}
                            >
                              {addingItems.has(item.id || item._id) ? (
                                <>
                                  <span className="material-icons" style={{ fontSize: "16px" }}>
                                    check
                                  </span>
                                  Added
                                </>
                              ) : (
                                <>
                                  <span className="material-icons" style={{ fontSize: "16px" }}>
                                    add_shopping_cart
                                  </span>
                                  Add
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{
                      textAlign: "center",
                      padding: theme.spacing.xl,
                      backgroundColor: "#fff",
                      borderRadius: theme.borderRadius.lg,
                      boxShadow: theme.shadows.sm,
                      maxWidth: "500px",
                      margin: "0 auto"
                    }}
                  >
                    <span className="material-icons" style={{
                      fontSize: "48px",
                      color: theme.colors.text.secondary,
                      marginBottom: theme.spacing.md,
                      display: "block"
                    }}>
                      search_off
                    </span>
                    <h3 style={{
                      fontSize: theme.typography.sizes.lg,
                      fontWeight: theme.typography.fontWeights.semibold,
                      marginBottom: theme.spacing.sm,
                      color: theme.colors.text.primary
                    }}>
                      No results found
                    </h3>
                    <p style={{
                      fontSize: theme.typography.sizes.sm,
                      color: theme.colors.text.secondary,
                      marginBottom: theme.spacing.md
                    }}>
                      Try searching with different keywords or browse our categories
                    </p>
                    
                    {/* Similar items suggestions */}
                    {getSimilarItems(searchQuery).length > 0 && (
                      <div style={{
                        marginTop: theme.spacing.lg,
                        marginBottom: theme.spacing.md
                      }}>
                        <h4 style={{
                          fontSize: theme.typography.sizes.md,
                          fontWeight: theme.typography.fontWeights.semibold,
                          marginBottom: theme.spacing.sm,
                          color: theme.colors.text.primary
                        }}>
                          You might like these instead:
                        </h4>
                        <div style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: theme.spacing.sm
                        }}>
                          {getSimilarItems(searchQuery).map(item => (
                            <button
                              key={item.id || item._id}
                              onClick={() => setSearchQuery(item.title)}
                              style={{
                                padding: theme.spacing.sm,
                                backgroundColor: theme.colors.background,
                                border: `1px solid ${theme.colors.border}`,
                                borderRadius: theme.borderRadius.md,
                                textAlign: "left",
                                cursor: "pointer",
                                fontSize: theme.typography.sizes.sm
                              }}
                            >
                              <strong>{item.title}</strong> - {formatCurrency(item.price)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div style={{
                      display: "flex",
                      gap: theme.spacing.sm,
                      justifyContent: "center",
                      flexWrap: "wrap"
                    }}>
                      <button
                        onClick={handleClearSearch}
                        style={{
                          backgroundColor: theme.colors.primary,
                          color: "#fff",
                          border: "none",
                          borderRadius: theme.borderRadius.md,
                          padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                          fontSize: theme.typography.sizes.sm,
                          fontWeight: theme.typography.fontWeights.medium,
                          cursor: "pointer"
                        }}
                      >
                        Clear Search
                      </button>
                      
                      <button
                        onClick={() => {
                          setPriceFilter('all');
                          setDietaryFilters([]);
                          setSelectedCategory('all');
                        }}
                        style={{
                          backgroundColor: "transparent",
                          color: theme.colors.primary,
                          border: `1px solid ${theme.colors.primary}`,
                          borderRadius: theme.borderRadius.md,
                          padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                          fontSize: theme.typography.sizes.sm,
                          fontWeight: theme.typography.fontWeights.medium,
                          cursor: "pointer"
                        }}
                      >
                        Clear Filters
                      </button>
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </motion.div>
        ) : (
          /* Search Suggestions and Popular Searches */
          <motion.div
            key="suggestions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {/* Search History */}
            {searchHistory.length > 0 && (
              <div style={{
                marginBottom: theme.spacing.lg,
                maxWidth: "600px",
                margin: "0 auto",
                marginBottom: theme.spacing.lg
              }}>
                <h3 style={{
                  fontSize: theme.typography.sizes.md,
                  fontWeight: theme.typography.fontWeights.semibold,
                  marginBottom: theme.spacing.md,
                  color: theme.colors.text.primary
                }}>
                  Recent Searches
                </h3>
                <div style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: theme.spacing.sm
                }}>
                  {searchHistory.map((term, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(term)}
                      style={{
                        padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                        backgroundColor: theme.colors.background,
                        border: `1px solid ${theme.colors.border}`,
                        borderRadius: theme.borderRadius.pill,
                        fontSize: theme.typography.sizes.sm,
                        color: theme.colors.text.primary,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: theme.spacing.xs
                      }}
                    >
                      <span className="material-icons" style={{ fontSize: "16px" }}>
                        history
                      </span>
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Popular Searches */}
            <div style={{
              maxWidth: "600px",
              margin: "0 auto"
            }}>
              <h3 style={{
                fontSize: theme.typography.sizes.md,
                fontWeight: theme.typography.fontWeights.semibold,
                marginBottom: theme.spacing.md,
                color: theme.colors.text.primary,
                textAlign: "center"
              }}>
                Popular Searches
              </h3>
              <div style={{
                display: "flex",
                flexWrap: "wrap",
                gap: theme.spacing.sm,
                justifyContent: "center"
              }}>
                {popularSearches.map((term, index) => (
                  <motion.button
                    key={index}
                    onClick={() => handleSuggestionClick(term)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                      backgroundColor: `${theme.colors.primary}15`,
                      border: "none",
                      borderRadius: theme.borderRadius.pill,
                      fontSize: theme.typography.sizes.sm,
                      fontWeight: theme.typography.fontWeights.medium,
                      color: theme.colors.primary,
                      cursor: "pointer"
                    }}
                  >
                    {term}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Search Tips */}
            <div style={{
              maxWidth: "500px",
              margin: "0 auto",
              marginTop: theme.spacing.xl,
              textAlign: "center"
            }}>
              <p style={{
                fontSize: theme.typography.sizes.sm,
                color: theme.colors.text.secondary,
                lineHeight: "1.5"
              }}>
                💡 Try searching for dishes by name, ingredients, or categories to find exactly what you're craving
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error State */}
      {error && (
        <div style={{
          textAlign: "center",
          padding: theme.spacing.xl,
          backgroundColor: "#fff",
          borderRadius: theme.borderRadius.lg,
          boxShadow: theme.shadows.sm,
          maxWidth: "400px",
          margin: "0 auto"
        }}>
          <span className="material-icons" style={{
            fontSize: "48px",
            color: theme.colors.danger,
            marginBottom: theme.spacing.md,
            display: "block"
          }}>
            error_outline
          </span>
          <h3 style={{
            fontSize: theme.typography.sizes.lg,
            fontWeight: theme.typography.fontWeights.semibold,
            marginBottom: theme.spacing.sm,
            color: theme.colors.text.primary
          }}>
            Search Unavailable
          </h3>
          <p style={{
            fontSize: theme.typography.sizes.sm,
            color: theme.colors.text.secondary
          }}>
            {error}
          </p>
        </div>
      )}
    </div>
  );
};

export default SearchView;
