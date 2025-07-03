import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRestaurant } from './RestaurantContext';
import { useTax } from './TaxContext';
import { api as authApi } from '../utils/authApiClient';
import { api } from '../utils/api';
import { useAuth } from './AuthContext';
import { mapOrderTypeToBackend } from '../utils/orderTypeMapping';

// Create context
const CartContext = createContext(null);

// Provider component
export const CartProvider = ({ children }) => {
  const { restaurant, branch, table } = useRestaurant();
  const { taxRate, taxName, taxDetails, calculateTax } = useTax();
  const { isAuthenticated, user } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [orderNote, setOrderNote] = useState('');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [cartAnimation, setCartAnimation] = useState({
    isAnimating: false,
    item: null,
    position: { x: 0, y: 0 }
  });

  // Load cart from localStorage
  useEffect(() => {
    const loadCartFromStorage = () => {
      try {
        const savedCart = localStorage.getItem('cart');
        console.log('Loading cart from localStorage...');
        console.log('Raw localStorage data:', savedCart);
        
        if (savedCart) {
          const parsedCart = JSON.parse(savedCart);
          console.log('Parsed cart data:', parsedCart);
          
          if (Array.isArray(parsedCart) && parsedCart.length > 0) {
            setCartItems(parsedCart);
            console.log('Cart loaded successfully with', parsedCart.length, 'items');
          } else {
            console.log('Cart is empty or invalid format');
            setCartItems([]);
          }
        } else {
          console.log('No saved cart found in localStorage');
          setCartItems([]);
        }
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
        setCartItems([]);
      } finally {
        setCartLoaded(true);
        console.log('Cart loading completed');
      }
    };

    // Small delay to ensure DOM is ready and avoid conflicts
    const timeoutId = setTimeout(() => {
      loadCartFromStorage();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, []);
  // Save cart to localStorage whenever it changes (but only after initial load)
  useEffect(() => {
    // Only save to localStorage if cart has been loaded from storage first
    if (cartLoaded) {
      try {
        localStorage.setItem('cart', JSON.stringify(cartItems));
        console.log('Cart saved to localStorage:', cartItems);
        
        // Calculate total, accounting for size variants
        const total = cartItems.reduce((sum, item) => {
          // Use the item's price (which already includes any size variant adjustments)
          const basePrice = item.price * item.quantity;
          
          // Add any additional option prices if present
          const optionsTotal = item.selectedOptions?.reduce((optSum, opt) => {
            // Skip size options as their price is already reflected in the base price
            if (opt.category === 'size' && opt.name === 'Size') return optSum;
            return optSum + (opt.price || 0);
          }, 0) || 0;
          
          return sum + basePrice + (optionsTotal * item.quantity);
        }, 0);
        
        setCartTotal(total);
      } catch (error) {
        console.error('Error saving cart to localStorage:', error);
      }
    }
  }, [cartItems, cartLoaded]);  // Helper function to get the price for an item based on its size variant
  const getItemPriceWithSizeVariant = (item, selectedOptions) => {
    // Start with a copy of the item
    let result = { ...item };
    let selectedSizeVariant = null;
    
    // Find any size selection in the options
    const sizeOption = selectedOptions.find(option => 
      option.category === 'size' && option.name === 'Size' && option.value
    );
    
    // If a size is selected and the item has size variants
    if (sizeOption && item.sizeVariants && Array.isArray(item.sizeVariants) && item.sizeVariants.length > 0) {
      // Find the matching size variant
      selectedSizeVariant = item.sizeVariants.find(variant => 
        variant.name === sizeOption.value || 
        variant.size === sizeOption.value ||
        variant.label === sizeOption.value ||
        variant.title === sizeOption.value
      );
      
      // If we found a matching size variant with a price, use that price
      if (selectedSizeVariant && selectedSizeVariant.price !== undefined) {
        result.price = parseFloat(selectedSizeVariant.price);
        result.selectedSize = sizeOption.value;
        console.log(`Using size variant price: ${selectedSizeVariant.price} for ${sizeOption.value}`);
      }
    }
    
    // If no size variant was selected but the item has size variants, find and use the lowest price
    else if (item.sizeVariants && Array.isArray(item.sizeVariants) && item.sizeVariants.length > 0) {
      // Find the variant with the lowest price
      const lowestPriceVariant = item.sizeVariants.reduce((lowest, current) => {
        if (!current || current.price === undefined || current.price === null) return lowest;
        
        const currentPrice = parseFloat(current.price);
        const lowestPrice = lowest ? parseFloat(lowest.price) : Infinity;
        
        return !isNaN(currentPrice) && currentPrice < lowestPrice ? current : lowest;
      }, null);
      
      if (lowestPriceVariant && lowestPriceVariant.price !== undefined) {
        const variantName = lowestPriceVariant.name || lowestPriceVariant.size || 
                            lowestPriceVariant.label || lowestPriceVariant.title;
        
        result.price = parseFloat(lowestPriceVariant.price);
        result.selectedSize = variantName;
        console.log(`Using lowest price variant: ${lowestPriceVariant.price} for ${variantName}`);
      }
    }
    
    return result;
  };
  
  // Add item to cart
  const addToCart = (item, quantity = 1, selectedOptions = [], sourcePosition = null) => {
    console.log('Adding item to cart:', { item, quantity, selectedOptions });
    console.log('Item ID check:', { id: item.id, _id: item._id });
    
    // Reset order state when starting a new cart session (adding new items after order completion)
    if (orderPlaced || currentOrder) {
      console.log('[CART CONTEXT] Resetting order state due to new item being added');
      resetOrderState();
    }
    
    // Ensure the item has an ID (use _id if id is not present)
    if (!item.id && item._id) {
      item.id = item._id;
    }
    
    if (!item.id && !item._id) {
      console.error('Item has no ID field:', item);
      // Show user-friendly error
      alert('Error: Cannot add item to cart - missing item ID');
      return;
    }
    
    // Check for size variant selection and adjust price if needed
    let itemToAdd = getItemPriceWithSizeVariant(item, selectedOptions);
    
    // Trigger animation if source position is provided
    if (sourcePosition) {
      setCartAnimation({
        isAnimating: true,
        item: {
          ...itemToAdd,
          quantity,
          selectedOptions
        },
        position: sourcePosition
      });
      
      // Reset animation state after animation completes
      setTimeout(() => {
        setCartAnimation({
          isAnimating: false,
          item: null,
          position: { x: 0, y: 0 }
        });
      }, 1000); // Animation duration
    }
    
    setCartItems(prevItems => {
      // Check if the item is already in the cart with the same options
      const existingItemIndex = prevItems.findIndex(cartItem => {
        // Check if item ID matches
        if (cartItem.id !== item.id) return false;
        
        // Check if options match
        if (cartItem.selectedOptions?.length !== selectedOptions?.length) return false;
        
        // Compare each option
        const optionsMatch = cartItem.selectedOptions?.every(option => {
          return selectedOptions.some(selectedOption => 
            selectedOption.name === option.name && 
            selectedOption.value === option.value
          );
        });
        
        return optionsMatch;
      });

      let updatedItems;
      if (existingItemIndex !== -1) {
        // Update quantity if item already exists
        updatedItems = [...prevItems];
        updatedItems[existingItemIndex].quantity += quantity;
      } else {
        // Add new item to cart with potentially updated price from sizeVariant
        updatedItems = [...prevItems, { 
          ...itemToAdd, 
          quantity, 
          selectedOptions
        }];
      }
      
      console.log('Updated cart items:', updatedItems);
      return updatedItems;
    });
  };

  // Remove item from cart
  const removeFromCart = (itemId, selectedOptions = []) => {
    setCartItems(prevItems => {
      return prevItems.filter(item => {
        // If itemId doesn't match, keep the item
        if (item.id !== itemId) return true;
        
        // If options are specified, only remove if they match
        if (selectedOptions?.length > 0) {
          // Check if options match
          const optionsMatch = item.selectedOptions?.length === selectedOptions?.length &&
            item.selectedOptions?.every(option => {
              return selectedOptions.some(selectedOption => 
                selectedOption.name === option.name && 
                selectedOption.value === option.value
              );
            });
            
          // Keep the item if options don't match
          return !optionsMatch;
        }
        
        // If we got here, remove the item
        return false;
      });
    });
  };

  // Update item quantity
  const updateQuantity = (itemId, quantity, selectedOptions = []) => {
    setCartItems(prevItems => {
      return prevItems.map(item => {
        // Find the specific item with matching ID and options
        if (item.id === itemId) {
          // If options are specified, only update if they match
          if (selectedOptions?.length > 0) {
            const optionsMatch = item.selectedOptions?.length === selectedOptions?.length &&
              item.selectedOptions?.every(option => {
                return selectedOptions.some(selectedOption => 
                  selectedOption.name === option.name && 
                  selectedOption.value === option.value
                );
              });
              
            if (optionsMatch) {
              return { ...item, quantity };
            }
          } else {
            // If no options specified, update the item
            return { ...item, quantity };
          }
        }
        return item;
      });
    });
  };

  // Debug function to check localStorage state
  const debugCartState = () => {
    try {
      const localStorageCart = localStorage.getItem('cart');
      console.log('=== CART DEBUG STATE ===');
      console.log('Cart loaded state:', cartLoaded);
      console.log('Current localStorage cart:', localStorageCart);
      console.log('Current cartItems state:', cartItems);
      console.log('Current cartTotal:', cartTotal);
      
      if (localStorageCart) {
        const parsedCart = JSON.parse(localStorageCart);
        console.log('Parsed localStorage cart:', parsedCart);
        console.log('Items in localStorage:', parsedCart.length);
      }
      
      console.log('Items in React state:', cartItems.length);
      console.log('========================');
    } catch (error) {
      console.error('Error debugging cart state:', error);
    }
  };

  // Manually sync cart with localStorage
  const syncCartWithLocalStorage = () => {
    try {
      localStorage.setItem('cart', JSON.stringify(cartItems));
      console.log('Cart manually synced with localStorage:', cartItems);
    } catch (error) {
      console.error('Error manually syncing cart with localStorage:', error);
    }
  };

  // Clear cart
  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem('cart');
    console.log('Cart cleared from state and localStorage');
    // Note: We don't reset cartLoaded here because the cart is still "loaded", just empty
  };
  // Submit order using the real API
  const placeOrder = async ({ customerInfo = {}, orderType: providedOrderType, note } = {}) => {
    if (cartItems.length === 0) {
      setOrderError('Your cart is empty');
      return null;
    }

    if (!restaurant || !branch) {
      setOrderError('Restaurant information is missing');
      return null;
    }

    try {      setOrderLoading(true);
      setOrderError(null);

      console.log('[CART CONTEXT] Placing order with:', { customerInfo, orderType: providedOrderType, note });

      // Calculate subtotal and tax for the order
      const subtotal = cartItems.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
      }, 0);
      
      // Calculate tax using the tax context
      const taxAmount = calculateTax(subtotal);
      
      // Determine order type and map it to backend format
      const frontendOrderType = providedOrderType || (table ? 'dineIn' : 'takeaway');
      const finalOrderType = mapOrderTypeToBackend(frontendOrderType);
      
      console.log('[CART CONTEXT] Order type mapping:', {
        provided: providedOrderType,
        frontend: frontendOrderType,
        backend: finalOrderType
      });
      
      // Validate required IDs
      if (!restaurant?._id) {
        const error = 'Restaurant ID is missing - please reload the page and try again';
        console.error('[CART CONTEXT]', error);
        setOrderError(error);
        throw new Error(error);
      }
      if (!branch?._id) {
        const error = 'Branch ID is missing - please reload the page and try again';
        console.error('[CART CONTEXT]', error);
        setOrderError(error);
        throw new Error(error);
      }
      
      console.log('[CART CONTEXT] Using IDs:', {
        restaurantId: restaurant._id,
        branchId: branch._id,
        tableId: table?._id || null
      });

      // Validate cart items have valid IDs
      const invalidItems = cartItems.filter(item => !item.id && !item._id);
      if (invalidItems.length > 0) {
        const error = `Cart contains ${invalidItems.length} items without valid IDs`;
        console.error('[CART CONTEXT]', error, invalidItems);
        setOrderError(error);
        throw new Error(error);
      }
      
      // Prepare order data according to the API schema
      const orderData = {
        restaurantId: restaurant._id,
        branchId: branch._id,
        tableId: table ? table._id : null,
        items: cartItems.map(item => {
          // Validate that we have a valid menuItemId
          const menuItemId = item.id || item._id;
          if (!menuItemId) {
            console.error('[CART CONTEXT] Item missing ID:', item);
            throw new Error(`Cart item "${item.title || item.name}" is missing an ID`);
          }
          
          // Basic ObjectId format validation (24 character hex string)
          if (typeof menuItemId === 'string' && !/^[0-9a-fA-F]{24}$/.test(menuItemId)) {
            console.error('[CART CONTEXT] Item has invalid ObjectId format:', { menuItemId, item });
            throw new Error(`Cart item "${item.title || item.name}" has invalid ID format`);
          }
          
          // Ensure all required fields are valid numbers and strings
          const quantity = Number(item.quantity);
          const price = Number(item.price);
          const subtotal = Number(price * quantity);
          const name = String(item.title || item.name || 'Unknown Item');
          
          // Validate required fields
          if (isNaN(quantity) || quantity <= 0) {
            throw new Error(`Cart item "${name}" has invalid quantity: ${item.quantity}`);
          }
          if (isNaN(price) || price < 0) {
            throw new Error(`Cart item "${name}" has invalid price: ${item.price}`);
          }
          if (isNaN(subtotal) || subtotal < 0) {
            throw new Error(`Cart item "${name}" has invalid subtotal calculation`);
          }
          
          // Format notes - convert selectedOptions to a readable string or keep as empty string
          let notes = '';
          if (item.selectedOptions && Array.isArray(item.selectedOptions) && item.selectedOptions.length > 0) {
            try {
              // Create a more readable notes format instead of raw JSON
              notes = item.selectedOptions
                .filter(opt => opt && opt.value) // Only include options with values
                .map(opt => `${opt.category || 'Option'}: ${opt.value}`)
                .join(', ');
            } catch (error) {
              console.warn('[CART CONTEXT] Error formatting notes for item:', name, error);
              notes = 'Custom options selected';
            }
          }
          
          const mappedItem = {
            menuItemId: String(menuItemId), // Ensure it's a string
            name: name,
            quantity: quantity,
            price: price,
            notes: notes,
            subtotal: subtotal
          };
          
          console.log('[CART CONTEXT] Mapping cart item:', item, '-> mapped:', mappedItem);
          return mappedItem;
        }),
        customerInfo: {
          name: customerInfo.name || 'Guest',
          email: customerInfo.email || '',
          phone: customerInfo.phone || ''
        },
        orderType: finalOrderType,
        paymentMethod: 'cash', // Default to cash payment
        status: 'pending',
        notes: note || orderNote || '',
        taxAmount: taxAmount,
        taxDetails: {
          taxName: taxName,
          percentage: taxRate * 100,
          countryCode: taxDetails ? taxDetails.country : 'DEFAULT',
          isCompound: taxDetails ? taxDetails.isCompound : false
        },
        subtotal: subtotal,
        total: subtotal + taxAmount
      };

      console.log('[CART CONTEXT] Order data to send:', JSON.stringify(orderData, null, 2));
      
      console.log('[CART CONTEXT] About to call API...');
      // Call the public API to create the order
      const createdOrder = await api.public.orders.create(orderData);
      console.log('[CART CONTEXT] API call completed successfully');
      
      if (createdOrder) {
        console.log('[CART CONTEXT] Order created successfully:', createdOrder);
        setCurrentOrder(createdOrder);
        setOrderPlaced(true);
        clearCart();
        return createdOrder;
      } else {
        throw new Error('Failed to create order');
      }
    } catch (error) {
      console.error('[CART CONTEXT] Order placement error:', error);
      console.error('[CART CONTEXT] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack
      });
      
      let errorMessage = 'Failed to place order';
      
      // Handle different types of errors
      if (error.response) {
        // Server responded with an error status
        const statusCode = error.response.status;
        const serverMessage = error.response.data?.message || error.response.data;
        
        console.error('[CART CONTEXT] Server error response:', {
          status: statusCode,
          data: error.response.data
        });
        
        if (statusCode >= 500) {
          errorMessage = `Server error (${statusCode}): ${serverMessage || 'Internal server error'}`;
        } else if (statusCode >= 400) {
          errorMessage = `Request error (${statusCode}): ${serverMessage || 'Bad request'}`;
        } else {
          errorMessage = serverMessage || `HTTP ${statusCode} error`;
        }
      } else if (error.request) {
        // Request was made but no response received
        console.error('[CART CONTEXT] No response received:', error.request);
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        // Something else happened
        errorMessage = error.message || 'Unknown error occurred';
      }
      
      setOrderError(errorMessage);
      return null;
    } finally {
      setOrderLoading(false);
    }
  };
  // Check order status using public API
  const checkOrderStatus = async (orderId) => {
    if (!orderId) {
      return null;
    }

    try {
      setOrderLoading(true);
      
      // Call the public API to get order status
      const order = await api.public.orders.getById(orderId);
      
      if (!order) {
        throw new Error('Order not found');
      }
      
      setCurrentOrder(order);
      return order;
    } catch (error) {
      console.error('Error checking order status:', error);
      setOrderError('Failed to check order status');
      return null;
    } finally {
      setOrderLoading(false);
    }
  };  // Sync cart with user when they log in
  const syncCartWithUser = async () => {
    if (isAuthenticated && user) {
      try {
        // Wait a bit for localStorage to be updated with token
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Verify token is available
        const userData = localStorage.getItem('user');
        if (!userData) {
          throw new Error('User data not found in localStorage');
        }
        
        const parsedUser = JSON.parse(userData);
        if (!parsedUser.token) {
          throw new Error('Authentication token not found');
        }
        
        // Send current cart to server to associate with user
        await authApi.post('/api/customers/auth/sync-cart', {
          customerId: user._id,
          cartItems
        });
        
        // Optionally, fetch any stored cart items from the server
        // This could merge with the current cart or replace it
        const response = await authApi.get(`/api/customers/auth/${user._id}/cart`);
        if (response.data && response.data.length > 0) {
          setCartItems(response.data);
        }
        
        return { success: true };
      } catch (error) {
        console.error('Error syncing cart with user:', error);
        // Don't throw error if cart sync fails - it's not critical
        return { 
          success: false, 
          error: error.response?.data || error.message 
        };
      }
    }
    return { success: false, error: 'User not authenticated' };
  };

  // Function to check if auth is required for checkout and set the flag
  const checkoutAuth = () => {
    if (!isAuthenticated) {
      setAuthRequired(true);
      return false;
    }
    return true;
  };

  // Reset auth required state
  const resetAuthRequired = () => {
    setAuthRequired(false);
  };
  
  // Function to start a cart animation when an item is added
  const startCartAnimation = (item, position) => {
    setCartAnimation({
      isAnimating: true,
      item,
      position
    });
    
    // Reset animation after it completes
    setTimeout(() => {
      setCartAnimation({
        isAnimating: false,
        item: null,
        position: { x: 0, y: 0 }
      });
    }, 1000); // Animation duration
  };

  // Reset order state (for starting new orders)
  const resetOrderState = () => {
    setOrderPlaced(false);
    setCurrentOrder(null);
    setOrderLoading(false);
    setOrderError(null);
    console.log('[CART CONTEXT] Order state reset - ready for new order');
  };

  // Clear cart and reset order state (complete reset)
  const resetCartAndOrder = () => {
    clearCart();
    resetOrderState();
    console.log('[CART CONTEXT] Cart and order state completely reset');
  };

  // Provide context value
  const contextValue = {
    cartItems,
    cartTotal,
    cartLoaded,
    orderNote,
    setOrderNote,
    addItem: addToCart,
    removeItem: removeFromCart,
    updateItemQuantity: updateQuantity,
    clearCart,
    resetOrderState,
    resetCartAndOrder,
    placeOrder,
    orderPlaced,
    setOrderPlaced,
    getItemPriceWithSizeVariant,
    currentOrder,
    setCurrentOrder,
    orderLoading,
    orderError,
    checkOrderStatus,
    cartAnimation,
    syncCartWithUser,
    syncCartWithLocalStorage,
    debugCartState,
    checkoutAuth,
    authRequired,
    resetAuthRequired,
    startCartAnimation,
    resetOrderState,
    resetCartAndOrder
  };

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};

// Custom hook to use this context
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartProvider;