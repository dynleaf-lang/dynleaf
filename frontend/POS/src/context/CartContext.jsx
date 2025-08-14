import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    customerId: null,
    orderType: 'dine-in', // dine-in, takeaway, delivery
    specialInstructions: ''
  });
  const [savedOrders, setSavedOrders] = useState([]); // For hold/save functionality

  // Load saved data from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('pos_cart');
    const savedCustomer = localStorage.getItem('pos_customer');
    const savedOrdersData = localStorage.getItem('pos_saved_orders');

    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (error) {
        console.error('Error loading saved cart:', error);
      }
    }

    if (savedCustomer) {
      try {
        setCustomerInfo(JSON.parse(savedCustomer));
      } catch (error) {
        console.error('Error loading saved customer info:', error);
      }
    }

    if (savedOrdersData) {
      try {
        setSavedOrders(JSON.parse(savedOrdersData));
      } catch (error) {
        console.error('Error loading saved orders:', error);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('pos_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  // Save customer info to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('pos_customer', JSON.stringify(customerInfo));
  }, [customerInfo]);

  // Save orders to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('pos_saved_orders', JSON.stringify(savedOrders));
  }, [savedOrders]);

  const addToCart = (menuItem, quantity = 1, customizations = {}) => {
    const cartItemId = `${menuItem._id}_${JSON.stringify(customizations)}`;
    
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.cartItemId === cartItemId);
      
      if (existingItem) {
        // Update quantity if item already exists
        return prevItems.map(item =>
          item.cartItemId === cartItemId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        // Add new item to cart
        // Use selected variant price if available, otherwise use base price
        const itemPrice = customizations.selectedPrice || menuItem.price;
        
        const newItem = {
          cartItemId,
          menuItemId: menuItem._id,
          name: menuItem.name,
          price: itemPrice,
          image: menuItem.image,
          description: menuItem.description,
          category: menuItem.category,
          quantity,
          customizations,
          addedAt: new Date().toISOString()
        };
        return [...prevItems, newItem];
      }
    });

    toast.success(`${menuItem.name} added to cart`);
  };

  const removeFromCart = (cartItemId) => {
    setCartItems(prevItems => {
      const item = prevItems.find(item => item.cartItemId === cartItemId);
      if (item) {
        toast.success(`${item.name} removed from cart`);
      }
      return prevItems.filter(item => item.cartItemId !== cartItemId);
    });
  };

  const updateQuantity = (cartItemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }

    setCartItems(prevItems =>
      prevItems.map(item =>
        item.cartItemId === cartItemId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
    setCustomerInfo({
      name: '',
      phone: '',
      customerId: null,
      orderType: 'dine-in',
      specialInstructions: ''
    });
    localStorage.removeItem('pos_cart');
    localStorage.removeItem('pos_customer');
    toast.success('Cart cleared');
  };

  const updateCustomerInfo = (info) => {
    setCustomerInfo(prevInfo => ({
      ...prevInfo,
      ...info
    }));
  };

  // Replace entire cart (used when switching tables to load per-table carts)
  // customerInfoOverride is optional; if provided, it replaces customer info; otherwise preserve existing
  const replaceCart = (items, customerInfoOverride = null) => {
    try {
      setCartItems(Array.isArray(items) ? items : []);
      if (customerInfoOverride && typeof customerInfoOverride === 'object') {
        setCustomerInfo(prev => ({ ...prev, ...customerInfoOverride }));
      }
    } catch (e) {
      console.error('Error replacing cart:', e);
    }
  };

  // Calculate totals
  const getSubtotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getTax = (taxRate = 0.1) => {
    return getSubtotal() * taxRate;
  };

  const getTotal = (taxRate = 0.1) => {
    return getSubtotal() + getTax(taxRate);
  };

  const getItemCount = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  // Save current order for later
  const saveOrder = (orderName) => {
    if (cartItems.length === 0) {
      toast.error('Cannot save empty cart');
      return;
    }

    const savedOrder = {
      id: Date.now().toString(),
      name: orderName || `Order ${new Date().toLocaleTimeString()}`,
      items: [...cartItems],
      customerInfo: { ...customerInfo },
      savedAt: new Date().toISOString(),
      subtotal: getSubtotal(),
      total: getTotal()
    };

    setSavedOrders(prev => [...prev, savedOrder]);
    clearCart();
    toast.success(`Order saved as "${savedOrder.name}"`);
  };

  // Load a saved order
  const loadSavedOrder = (orderId) => {
    const savedOrder = savedOrders.find(order => order.id === orderId);
    if (savedOrder) {
      setCartItems(savedOrder.items);
      setCustomerInfo(savedOrder.customerInfo);
      toast.success(`Loaded order "${savedOrder.name}"`);
    }
  };

  // Delete a saved order
  const deleteSavedOrder = (orderId) => {
    setSavedOrders(prev => prev.filter(order => order.id !== orderId));
    toast.success('Saved order deleted');
  };

  // Update item customizations
  const updateItemCustomizations = (cartItemId, customizations) => {
    setCartItems(prevItems =>
      prevItems.map(item =>
        item.cartItemId === cartItemId
          ? { ...item, customizations }
          : item
      )
    );
  };

  const value = {
    // State
    cartItems,
    customerInfo,
    savedOrders,

    // Actions
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    updateCustomerInfo,
    updateItemCustomizations,
    replaceCart,

    // Save/Load functionality
    saveOrder,
    loadSavedOrder,
    deleteSavedOrder,

    // Calculations
    getSubtotal,
    getTax,
    getTotal,
    getItemCount,

    // Helpers
    isEmpty: cartItems.length === 0,
    hasItems: cartItems.length > 0
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
