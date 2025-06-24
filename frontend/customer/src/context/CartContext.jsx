import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRestaurant } from './RestaurantContext';
import { mockOrders } from '../data/dummyData';

// Create context
const CartContext = createContext(null);

// Provider component
export const CartProvider = ({ children }) => {
  const { restaurant, branch, table } = useRestaurant();
  const [cartItems, setCartItems] = useState([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [orderNote, setOrderNote] = useState('');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState(null);

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
      
      // Calculate total
      const total = cartItems.reduce((sum, item) => {
        const basePrice = item.price * item.quantity;
        
        // Add option prices if any
        const optionsTotal = item.selectedOptions?.reduce((optSum, opt) => {
          return optSum + (opt.price || 0);
        }, 0) || 0;
        
        return sum + basePrice + (optionsTotal * item.quantity);
      }, 0);
      
      setCartTotal(total);
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }, [cartItems]);

  // Add item to cart
  const addToCart = (item, quantity = 1, selectedOptions = []) => {
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

      if (existingItemIndex !== -1) {
        // Update quantity if item already exists
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex].quantity += quantity;
        return updatedItems;
      } else {
        // Add new item to cart
        return [...prevItems, { 
          ...item, 
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

  // Submit order - using mock system instead of API
  const placeOrder = async (customerInfo = {}) => {
    if (cartItems.length === 0) {
      setOrderError('Your cart is empty');
      return null;
    }

    if (!restaurant || !branch) {
      setOrderError('Restaurant information is missing');
      return null;
    }

    try {
      setOrderLoading(true);
      setOrderError(null);

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      const orderData = {
        restaurantId: restaurant._id,
        branchId: branch._id,
        tableId: table ? table._id : null,
        items: cartItems.map(item => ({
          menuItemId: item.id,
          name: item.title,
          quantity: item.quantity,
          price: item.price,
          options: item.selectedOptions || []
        })),
        totalAmount: cartTotal,
        note: orderNote,
        customerInfo: {
          name: customerInfo.name || 'Guest',
          email: customerInfo.email || '',
          phone: customerInfo.phone || ''
        }
      };

      // Use our mock order system instead of API
      const createdOrder = mockOrders.addOrder(orderData);
      
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

  // Check order status - using mock system instead of API
  const checkOrderStatus = async (orderId) => {
    if (!orderId) {
      return null;
    }

    try {
      setOrderLoading(true);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const order = mockOrders.getOrderById(orderId);
      
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
  };

  // Provide context value
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
    currentOrder,
    orderLoading,
    orderError,
    checkOrderStatus
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