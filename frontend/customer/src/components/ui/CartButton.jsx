import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../../context/CartContext';
import { theme } from '../../data/theme';
import CurrencyDisplay from '../Utils/CurrencyFormatter';

const CartButton = ({ onClick }) => {
  const { cartItems, cartTotal, cartAnimation } = useCart();
  const [isPulsing, setIsPulsing] = useState(false);
    // Calculate total quantity of items in cart
  const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  
  // Trigger pulse animation when item is added to cart
  useEffect(() => {
    if (cartAnimation.isAnimating) {
      setIsPulsing(true);
      
      // Reset pulse animation after it completes
      const timer = setTimeout(() => {
        setIsPulsing(false);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [cartAnimation.isAnimating]);

  return (    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        scale: isPulsing ? [1, 1.15, 1] : 1,
      }}
      transition={{ 
        duration: 0.3,
        scale: {
          duration: 0.5,
          ease: "easeInOut"
        }
      }}
      aria-label="Open cart"
      style={{
        position: 'fixed',
        bottom: '80px',
        right: '20px',
        backgroundColor: theme.colors.primary,
        color: 'white',
        border: 'none',
        borderRadius: '50px',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
        zIndex: 1000,
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: 'bold'
      }}
    >
      <div style={{ position: 'relative', marginRight: '8px' }}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="9" cy="21" r="1"></circle>
          <circle cx="20" cy="21" r="1"></circle>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        </svg>
        {itemCount > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              backgroundColor: theme.colors.secondary,
              color: 'white',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
          >
            {itemCount}          </div>
        )}
      </div>
      {cartTotal > 0 ? <><CurrencyDisplay amount={cartTotal} /></> : 'Cart'}
    </motion.button>
  );
};

export default CartButton;