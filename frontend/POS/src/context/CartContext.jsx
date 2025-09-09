import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from '../utils/notify';
import { useShift } from './ShiftContext';
import playPosSound from '../utils/sound';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const { isOpen, refresh: refreshSession } = useShift();
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

  // --- Helpers to ensure consistent identity for cart items ---
  const isPlainObject = (val) => Object.prototype.toString.call(val) === '[object Object]';

  // Recursively create a stable object with sorted keys; sort arrays of primitives
  const normalizeForIdentity = (value) => {
    if (Array.isArray(value)) {
      const normalizedArray = value.map(normalizeForIdentity);
      const allPrimitives = normalizedArray.every(v => (typeof v !== 'object' || v === null));
      return allPrimitives
        ? [...normalizedArray].sort((a, b) => String(a).localeCompare(String(b)))
        : normalizedArray.map((v) => normalizeForIdentity(v)).sort((a, b) => {
            const sa = JSON.stringify(a);
            const sb = JSON.stringify(b);
            return sa.localeCompare(sb);
          });
    }
    if (isPlainObject(value)) {
      const result = {};
      Object.keys(value)
        .filter((k) => value[k] !== undefined && value[k] !== null && value[k] !== '')
        .sort()
        .forEach((k) => {
          result[k] = normalizeForIdentity(value[k]);
        });
      return result;
    }
    return value;
  };

  const normalizeCustomizations = (customizations, basePrice) => {
    const base = isPlainObject(customizations) ? { ...customizations } : {};
    // Remove neutral defaults so they don't split identity
    if (base.spiceLevel === 'medium') delete base.spiceLevel; // medium treated as default
    if (base.specialInstructions === '') delete base.specialInstructions;
    // If variant/price chosen equals base price or is empty, drop it to avoid identity split
    if (base.selectedPrice == null) {
      delete base.selectedPrice;
    } else if (basePrice != null) {
      const bp = Number(basePrice);
      const sp = Number(base.selectedPrice);
      if (!Number.isNaN(bp) && !Number.isNaN(sp) && bp === sp) {
        delete base.selectedPrice;
      }
    }
    return normalizeForIdentity(base);
  };

  const stableStringify = (obj) => JSON.stringify(normalizeForIdentity(obj));

  const addToCart = (menuItem, quantity = 1, customizations = {}) => {
    if (!isOpen) {
      toast.error('Register is closed. Please open a session to start selling.');
      try { refreshSession(); } catch { /* noop */ }
      return;
    }
    const normalizedCustom = normalizeCustomizations(customizations, menuItem?.price);
    const identityString = stableStringify(normalizedCustom);
    const cartItemId = `${menuItem._id}_${identityString}`;
    
    setCartItems(prevItems => {
      // Try exact ID match first
      let existingItem = prevItems.find(item => item.cartItemId === cartItemId);
      // If not found, try legacy match: same menuItemId + normalized customizations equivalence
      if (!existingItem) {
        existingItem = prevItems.find(item => (
          item.menuItemId === menuItem._id &&
          stableStringify(normalizeForIdentity(item.customizations || {})) === identityString
        ));
      }
      
      if (existingItem) {
        // Update quantity if item already exists
        return prevItems.map(item => {
          if (item === existingItem || item.cartItemId === existingItem.cartItemId) {
            return {
              ...item,
              cartItemId, // standardize to stable id going forward
              customizations: normalizedCustom, // standardize normalization
              quantity: (Number(item.quantity) || 0) + (Number(quantity) || 0)
            };
          }
          return item;
        });
      } else {
        // Add new item to cart
        // Start from selected size price if provided, otherwise base price
        const basePriceRaw = (customizations && customizations.selectedPrice != null)
          ? customizations.selectedPrice
          : menuItem.price;
        let computedPrice = Number(basePriceRaw) || 0;

        // Add addon prices
        try {
          const selectedAddons = (customizations && customizations.selectedAddons) || [];
          if (Array.isArray(selectedAddons) && Array.isArray(menuItem?.addons)) {
            selectedAddons.forEach((addonName) => {
              const addon = menuItem.addons.find(a => a && a.name === addonName);
              if (addon && addon.price) {
                const p = Number(addon.price);
                if (!Number.isNaN(p)) computedPrice += p;
              }
            });
          }
        } catch {}

        // Add flexible variant group deltas (non-size)
        try {
          const vsel = (customizations && customizations.variantSelections) || null;
          if (vsel && Array.isArray(menuItem?.variantGroups)) {
            menuItem.variantGroups.forEach(g => {
              const gName = String(g?.name || '').trim();
              if (!gName || gName.toLowerCase() === 'size') return;
              const options = Array.isArray(g?.options) ? g.options : [];
              const selType = g?.selectionType || 'single';
              const sel = vsel[gName];
              if (!sel) return;
              if (selType === 'single') {
                const opt = options.find(o => o?.name === sel);
                if (opt && opt.priceDelta != null) {
                  const d = Number(opt.priceDelta);
                  if (!Number.isNaN(d)) computedPrice += d;
                }
              } else {
                const arr = Array.isArray(sel) ? sel : [];
                arr.forEach(val => {
                  const opt = options.find(o => o?.name === val);
                  if (opt && opt.priceDelta != null) {
                    const d = Number(opt.priceDelta);
                    if (!Number.isNaN(d)) computedPrice += d;
                  }
                });
              }
            });
          }
        } catch {}
        
        const newItem = {
          cartItemId,
          menuItemId: menuItem._id,
          name: menuItem.name,
          price: computedPrice,
          image: menuItem.image,
          description: menuItem.description,
          category: menuItem.category,
          quantity,
          customizations: normalizedCustom,
          addedAt: new Date().toISOString()
        };
        return [...prevItems, newItem];
      }
    });

  playPosSound('success');
  };

  const removeFromCart = (cartItemId) => {
    setCartItems(prevItems => {
  // play a subtle sound on remove
  const item = prevItems.find(item => item.cartItemId === cartItemId);
  if (item) playPosSound('info');
      return prevItems.filter(item => item.cartItemId !== cartItemId);
    });
  };

  const updateQuantity = (cartItemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    setCartItems(prevItems => {
      const existing = prevItems.find(i => i.cartItemId === cartItemId);
      if (!existing) return prevItems;
      // Prevent increasing quantity when register is closed; allow decreases/removals
      const currentQty = Number(existing.quantity) || 0;
      if (!isOpen && newQuantity > currentQty) {
        toast.error('Register is closed. Please open a session to start selling.');
        try { refreshSession(); } catch { /* noop */ }
        return prevItems;
      }
      return prevItems.map(item =>
        item.cartItemId === cartItemId ? { ...item, quantity: newQuantity } : item
      );
    });
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
  playPosSound('info');
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
      playPosSound('error');
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
  playPosSound('success');
  };

  // Load a saved order
  const loadSavedOrder = (orderId) => {
    const savedOrder = savedOrders.find(order => order.id === orderId);
    if (savedOrder) {
      setCartItems(savedOrder.items);
      setCustomerInfo(savedOrder.customerInfo);
  playPosSound('success');
    }
  };

  // Delete a saved order
  const deleteSavedOrder = (orderId) => {
    setSavedOrders(prev => prev.filter(order => order.id !== orderId));
  playPosSound('info');
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
