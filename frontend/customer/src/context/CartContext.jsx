import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRestaurant } from './RestaurantContext';
import { useTax } from './TaxContext';
import { api } from '../utils/apiClient';

// Create context
const CartContext = createContext(null);

// Provider component
export const CartProvider = ({ children }) => {
  const { restaurant, branch, table } = useRestaurant();
  const { taxRate, taxName, taxDetails, calculateTax } = useTax();
  const [cartItems, setCartItems] = useState([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [orderNote, setOrderNote] = useState('');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState(null);
  const [cartAnimation, setCartAnimation] = useState({
    isAnimating: false,
    item: null,
    position: { x: 0, y: 0 }
  });

  // Load cart from localStorage
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);
        setCartItems(parsedCart);
      }
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
    }
  }, []);
  // Save cart to localStorage whenever it changes
  useEffect(() => {
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
  }, [cartItems]);  // Helper function to get the price for an item based on its size variant
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
      });      if (existingItemIndex !== -1) {
        // Update quantity if item already exists
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex].quantity += quantity;
        return updatedItems;
      } else {
        // Add new item to cart with potentially updated price from sizeVariant
        return [...prevItems, { 
          ...itemToAdd, 
          quantity, 
          selectedOptions
        }];
      }
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

  // Clear cart
  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem('cart');
  };
  // Submit order using the real API
  const placeOrder = async (customerInfo = {}) => {
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

      // Calculate subtotal and tax for the order
      const subtotal = cartItems.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
      }, 0);
      
      // Calculate tax using the tax context
      const taxAmount = calculateTax(subtotal);
      
      // Prepare order data according to the API schema
      const orderData = {
        restaurantId: restaurant._id,
        branchId: branch._id,
        tableId: table ? table._id : null,
        items: cartItems.map(item => ({
          menuItemId: item.id || item._id,
          name: item.title || item.name,
          quantity: item.quantity,
          price: item.price,
          notes: item.selectedOptions ? JSON.stringify(item.selectedOptions) : '',
          subtotal: item.price * item.quantity
        })),
        customerInfo: {
          name: customerInfo.name || 'Guest',
          email: customerInfo.email || '',
          phone: customerInfo.phone || ''
        },
        orderType: table ? 'dine-in' : 'takeaway',        paymentMethod: 'cash', // Default to cash payment
        status: 'pending',
        notes: orderNote,
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
        setCurrentOrder(createdOrder);
        setOrderPlaced(true);
        clearCart();
        return createdOrder;
      } else {
        throw new Error('Failed to create order');
      }
    } catch (error) {
      console.error('Order placement error:', error);
      setOrderError(error.message || 'Failed to place order');
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
  };  // Provide context value
  const contextValue = {
    cartItems,
    cartTotal,
    orderNote,
    setOrderNote,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    placeOrder,
    orderPlaced,
    setOrderPlaced,
    getItemPriceWithSizeVariant,
    currentOrder,
    orderLoading,
    orderError,
    checkOrderStatus,
    cartAnimation
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