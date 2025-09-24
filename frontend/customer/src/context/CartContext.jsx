import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useRestaurant } from './RestaurantContext';
import { useTax } from './TaxContext';
import { api as authApi } from '../utils/authApiClient';
import { api } from '../utils/api';
import { useAuth } from './AuthContext';
import { mapOrderTypeToBackend } from '../utils/orderTypeMapping';
import { useOrderNotifications } from '../hooks/useOrderNotifications';

// Create context
const CartContext = createContext(null);

// Provider component
export const CartProvider = ({ children }) => {
  const { restaurant, branch, table } = useRestaurant();
  const { taxRate, taxName, taxDetails, calculateTax } = useTax();
  const { isAuthenticated, user } = useAuth();
  const { trackOrder } = useOrderNotifications();
  
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
  
  // Track ongoing order requests to prevent duplicates
  const [ongoingOrderRequest, setOngoingOrderRequest] = useState(null);
  const [lastOrderAttempt, setLastOrderAttempt] = useState(null);
  // Cooldown timestamp for too-many-attempts protection
  const [orderCooldownUntil, setOrderCooldownUntil] = useState(null);
  const [orderSubmissionCount, setOrderSubmissionCount] = useState(0);
  const orderAttempts = useRef(0);

  // Load cart from localStorage
  useEffect(() => {
    const loadCartFromStorage = () => {
      try {
        const savedCart = localStorage.getItem('cart');
        
        if (savedCart) {
          const parsedCart = JSON.parse(savedCart);
          
          if (Array.isArray(parsedCart) && parsedCart.length > 0) {
            setCartItems(parsedCart);
          } else {
            setCartItems([]);
          }
        } else {
          setCartItems([]);
        }
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
        setCartItems([]);
      } finally {
        setCartLoaded(true);
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
      }
    }
    
    // Add extras, addons and variant groups price deltas (non-size)
    try {
      const opts = Array.isArray(selectedOptions) ? selectedOptions : [];
      let delta = 0;

      // Extras
      if (Array.isArray(item.extras)) {
        const chosenExtras = opts.filter(o => o && o.category === 'extras' && o.value);
        chosenExtras.forEach(sel => {
          const match = item.extras.find(ex => (ex?.value || ex?.name) === sel.value || (ex?.value || ex?.name) === sel.name);
          if (match) {
            const d = parseFloat(match.priceDelta ?? match.price ?? 0);
            if (!isNaN(d)) delta += d;
          }
        });
      }

      // Addons
      if (Array.isArray(item.addons)) {
        const chosenAddons = opts.filter(o => o && o.category === 'addons' && o.value);
        chosenAddons.forEach(sel => {
          const match = item.addons.find(ad => (ad?.value || ad?.name) === sel.value || (ad?.value || ad?.name) === sel.name);
          if (match) {
            const d = parseFloat(match.priceDelta ?? match.price ?? 0);
            if (!isNaN(d)) delta += d;
          }
        });
      }

      // Variant groups (non-size)
      if (Array.isArray(item.variantGroups)) {
        item.variantGroups.forEach(g => {
          const gName = String(g?.name || '').trim();
          if (!gName || gName.toLowerCase() === 'size') return;
          const options = Array.isArray(g?.options) ? g.options : [];
          const chosen = opts.filter(o => o && o.category === 'option' && o.name === gName && o.value);
          chosen.forEach(sel => {
            const opt = options.find(o => o?.name === sel.value || o?.name === sel.name);
            if (opt) {
              const d = parseFloat(opt.priceDelta ?? 0);
              if (!isNaN(d)) delta += d;
            }
          });
        });
      }

      // Update price with accumulated deltas
      const base = parseFloat(result.price) || 0;
      result.price = base + delta;
    } catch (e) {
      // Fail-safe: keep existing price if anything goes wrong
    }

    return result;
  };
  
  // Track last add operation to prevent rapid duplicates
  const lastAddOperation = useRef({ itemId: null, timestamp: 0 });

  // Add item to cart
  const addToCart = useCallback((item, quantity = 1, selectedOptions = [], sourcePosition = null) => {
    // Wait for cart to be loaded from localStorage before proceeding
    if (!cartLoaded) {
      // Retry after a short delay
      setTimeout(() => {
        addToCart(item, quantity, selectedOptions, sourcePosition);
      }, 50);
      return;
    }
    
    // Prevent rapid duplicate additions (debounce within 300ms)
    const now = Date.now();
    const itemId = item.id || item._id;
    if (lastAddOperation.current.itemId === itemId && 
        (now - lastAddOperation.current.timestamp) < 300) {
      console.log('⚠️ BLOCKED: Rapid duplicate add prevented for:', itemId);
      return;
    }
    lastAddOperation.current = { itemId, timestamp: now };
    
    // Ensure quantity is always 1 for button clicks
    const safeQuantity = Number(quantity) || 1;
    
    // Reset order state when starting a new cart session (adding new items after order completion)
    if (orderPlaced || currentOrder) {
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
          quantity: safeQuantity,
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
        // Check if item ID matches - ensure both are strings for comparison
        const cartItemId = String(cartItem.id || cartItem._id);
        const newItemId = String(item.id || item._id);
        
        if (cartItemId !== newItemId) return false;
        
        // Normalize options arrays (treat undefined/null as empty arrays)
        const cartItemOptions = cartItem.selectedOptions || [];
        const newItemOptions = selectedOptions || [];
        
        // Check if options length match
        if (cartItemOptions.length !== newItemOptions.length) return false;
        
        // If both have no options, they match
        if (cartItemOptions.length === 0 && newItemOptions.length === 0) return true;
        
        // Compare each option
        const optionsMatch = cartItemOptions.every(option => {
          return newItemOptions.some(selectedOption => 
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
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + safeQuantity
        };
      } else {
        // Add new item to cart with potentially updated price from sizeVariant
        updatedItems = [...prevItems, { 
          ...itemToAdd, 
          quantity: safeQuantity, 
          selectedOptions
        }];
      }
      
      return updatedItems;
    });
  }, [cartLoaded, cartItems.length, orderPlaced, currentOrder]);

  // Remove item from cart
  const removeFromCart = (itemId, selectedOptions = []) => {
    setCartItems(prevItems => {
      return prevItems.filter(item => {
        // If itemId doesn't match, keep the item
        if (item.id !== itemId) return true;
        
        // Normalize options arrays
        const itemOptions = item.selectedOptions || [];
        const removeOptions = selectedOptions || [];
        
        // If options are specified, only remove if they match
        if (removeOptions.length > 0) {
          // Check if options match
          const optionsMatch = itemOptions.length === removeOptions.length &&
            itemOptions.every(option => {
              return removeOptions.some(selectedOption => 
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
          // Normalize options arrays
          const itemOptions = item.selectedOptions || [];
          const updateOptions = selectedOptions || [];
          
          // If options are specified, only update if they match
          if (updateOptions.length > 0) {
            const optionsMatch = itemOptions.length === updateOptions.length &&
              itemOptions.every(option => {
                return updateOptions.some(selectedOption => 
                  selectedOption.name === option.name && 
                  selectedOption.value === option.value
                );
              });
              
            if (optionsMatch) {
              return { ...item, quantity };
            }
          } else if (updateOptions.length === 0 && itemOptions.length === 0) {
            // If both have no options, update the item
            return { ...item, quantity };
          }
        }
        return item;
      });
    });
  };

  // Manually sync cart with localStorage
  const syncCartWithLocalStorage = () => {
    try {
      localStorage.setItem('cart', JSON.stringify(cartItems));
    } catch (error) {
      console.error('Error manually syncing cart with localStorage:', error);
    }
  };

  // Clear cart
  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem('cart');
    // Note: We don't reset cartLoaded here because the cart is still "loaded", just empty
  };
  // Submit order using the real API
  const placeOrder = async ({ customerInfo = {}, orderType: providedOrderType, note, paymentMethod, paymentStatus } = {}) => {
    if (cartItems.length === 0) {
      setOrderError('Your cart is empty');
      return null;
    }

    // Prevent duplicate orders
    if (ongoingOrderRequest) {
      setOrderError('Order is currently being submitted. Please wait...');
      return null;
    }

    // Rate limiting: prevent too many rapid order attempts
    const now = Date.now();
    if (orderCooldownUntil && now < orderCooldownUntil) {
      const secs = Math.max(1, Math.ceil((orderCooldownUntil - now) / 1000));
      setOrderError(`Too many order attempts. Please wait ${secs} seconds before trying again.`);
      return null;
    }
    if (lastOrderAttempt && (now - lastOrderAttempt) < 3000) {
      setOrderError('Please wait a moment before trying again.');
      return null;
    }

    // Session rate limiting: prevent too many order attempts in a short time
    orderAttempts.current++;
    if (orderAttempts.current > 5) {
      // Exponential backoff cooldown (max 60s)
      const over = orderAttempts.current - 5; // 1..n
      const cooldownSecs = Math.min(60, Math.pow(2, over) * 5); // 5,10,20,40,60...
      const until = Date.now() + cooldownSecs * 1000;
      setOrderCooldownUntil(until);
      setOrderError(`Too many order attempts. Please wait ${cooldownSecs} seconds before trying again.`);
      return null;
    }

    try {
      // Generate a unique request ID for this order
      const requestId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setOngoingOrderRequest(requestId);
      setLastOrderAttempt(now);

      setOrderLoading(true);
      setOrderError(null);

      // Calculate subtotal and tax for the order
      const subtotal = cartItems.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
      }, 0);
      
      // Calculate tax using the tax context
      const taxAmount = calculateTax(subtotal);
      
      // Determine order type and map it to backend format
      const frontendOrderType = providedOrderType || (table ? 'dineIn' : 'takeaway');
      const finalOrderType = mapOrderTypeToBackend(frontendOrderType);
      
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
      
      // Create a unique signature for this order to prevent exact duplicates
      const orderSignature = {
        restaurantId: restaurant._id,
        branchId: branch._id,
        tableId: table?._id || null,
        items: cartItems.map(item => ({
          id: item.id || item._id,
          quantity: item.quantity,
          price: item.price
        })).sort((a, b) => a.id.localeCompare(b.id)), // Sort for consistent comparison
        customerPhone: customerInfo.phone || '',
        subtotal: subtotal
      };
      
      const orderHash = btoa(JSON.stringify(orderSignature));
      
      // Check if we've recently submitted this exact order
      const recentOrderHash = sessionStorage.getItem('lastOrderHash');
      const recentOrderTime = sessionStorage.getItem('lastOrderTime');
      
      if (recentOrderHash === orderHash && recentOrderTime) {
        const timeDiff = now - parseInt(recentOrderTime);
        if (timeDiff < 10000) { // 10 seconds
          setOrderError('This exact order was just submitted. Please wait a moment before trying again.');
          return null;
        }
      }
      
      // Store current order signature
      sessionStorage.setItem('lastOrderHash', orderHash);
      sessionStorage.setItem('lastOrderTime', now.toString());

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
          
          return mappedItem;
        }),
        customerInfo: {
          name: customerInfo.name || 'Guest',
          email: customerInfo.email || '',
          phone: customerInfo.phone || ''
        },
  orderType: finalOrderType,
  paymentMethod: paymentMethod || 'cash',
  paymentStatus: paymentStatus || undefined,
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

      // Call the public API to create the order
      const createdOrder = await api.public.orders.create(orderData);
      
      if (createdOrder) {
        // Check if this was flagged as a duplicate by the backend
        if (createdOrder._duplicateDetected) {
          // Backend detected and returned existing order
        }
        
        // Clear any previous errors since the order was successful
        setOrderError(null);
        setCurrentOrder(createdOrder);
        setOrderPlaced(true);
        setOrderSubmissionCount(0); // Reset submission count on success
        // Reset attempt guards on success
        orderAttempts.current = 0;
        setOrderCooldownUntil(null);
        clearCart();
        
        // Track the order for notifications
        trackOrder(createdOrder);
        
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
        const responseData = error.response.data;
        
        console.error('[CART CONTEXT] Server error response:', {
          status: statusCode,
          data: error.response.data
        });
        
        // Handle duplicate request detection from backend
        if (statusCode === 429 && responseData?._duplicateRequest) {
          const waitSeconds = responseData._waitSeconds || 10;
          errorMessage = `Please wait ${waitSeconds} seconds before submitting another order.`;
        } else if (statusCode >= 500) {
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
      setOngoingOrderRequest(null);
    }
  };

  // Auto-clear cooldown when time passes
  useEffect(() => {
    if (!orderCooldownUntil) return;
    const t = setInterval(() => {
      const now = Date.now();
      if (now >= orderCooldownUntil) {
        orderAttempts.current = 0;
        setOrderCooldownUntil(null);
        setOrderError(null);
      }
    }, 500);
    return () => clearInterval(t);
  }, [orderCooldownUntil]);
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
  };

  // Clear cart and reset order state (complete reset)
  const resetCartAndOrder = () => {
    clearCart();
    resetOrderState();
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
    ongoingOrderRequest,
    checkOrderStatus,
    cartAnimation,
    syncCartWithUser,
    syncCartWithLocalStorage,
    checkoutAuth,
    authRequired,
    resetAuthRequired,
    startCartAnimation,
    resetOrderState,
    resetCartAndOrder
  };

  // Listen for user logout to clear user-specific cart data
  useEffect(() => {
    const handleUserLogout = () => {
      console.log('[CART CONTEXT] User logged out, clearing user-specific data');
      // Reset auth required state
      setAuthRequired(false);
      // Clear any order-related data that's user-specific
      setOrderError(null);
      // Don't clear the cart itself as guest users should keep their cart
      // Only clear completed orders
      if (orderPlaced) {
        setOrderPlaced(false);
        setCurrentOrder(null);
      }
    };

    // Listen for logout event
    window.addEventListener('user-logout', handleUserLogout);

    // Cleanup listener
    return () => {
      window.removeEventListener('user-logout', handleUserLogout);
    };
  }, [orderPlaced]);

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
    throw new Error('useCart must be used within a CartProvider. Make sure your component is wrapped in <CartProvider>.');
  }
  return context;
};

export default CartProvider;