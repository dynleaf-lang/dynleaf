import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../../context/CartContext';

// Animation of item flying to cart when added
const CartAnimationEffect = () => {
  const { cartAnimation, addToCart } = useCart();
  const { isAnimating, item, position } = cartAnimation;
  
  // For direct testing of the animation
  const triggerTestAnimation = () => {
    const testItem = {
      id: 'test-item',
      title: 'Test Product',
      price: 9.99,
      image: 'https://via.placeholder.com/100/FF5733/FFFFFF?text=Test'
    };
    const testPosition = {
      x: window.innerWidth / 4,
      y: window.innerHeight / 3
    };
    addToCart(testItem, 1, [], testPosition);
  };
  const [cartPosition, setCartPosition] = useState({ x: 0, y: 0 });
  
  // Debugging for animation state
  useEffect(() => {
    if (isAnimating) {
    //   console.log("CartAnimationEffect: Animation triggered", { item, position });
    }
  }, [isAnimating, item, position]);
  
  // Get cart button position
  useEffect(() => {
    if (isAnimating) {
      // Try different selectors to find the cart button
      // 1. Try bottom nav cart button
      const cartNavButton = document.querySelector('nav.bottom-navigation button[data-tab-id="cart"]');
      // 2. Try floating cart button
      const floatingCartButton = document.querySelector('button[aria-label="Open cart"]');
      // 3. Try more generic selectors
      const svgCartButton = document.querySelector('button svg circle[cx="9"][cy="21"]')?.closest('button');
      // 4. Try to find any bottom right fixed button
      const fixedButtons = Array.from(document.querySelectorAll('button[style*="position: fixed"]'));
      const bottomRightButton = fixedButtons.find(btn => {
        const style = window.getComputedStyle(btn);
        return style.position === 'fixed' && style.bottom && style.right;
      });
      
      // Use the first available button
      const targetButton = cartNavButton || floatingCartButton || svgCartButton || bottomRightButton;
      
      if (targetButton) {
        const rect = targetButton.getBoundingClientRect();
        setCartPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        });
        // console.log("CartAnimationEffect: Cart button found", targetButton, rect);
      } else {
        // Fallback position - bottom right corner
        setCartPosition({
          x: window.innerWidth - 60,
          y: window.innerHeight - 80
        });
        // console.log("CartAnimationEffect: Using fallback position", window.innerWidth, window.innerHeight);
      }
    }
  }, [isAnimating]);

  if (!isAnimating || !item) return null;

  // Item image or a fallback
  const imageUrl = item.image || 'https://via.placeholder.com/50';
    // Make sure we have valid position coordinates
  const startPos = position && position.x && position.y 
    ? position 
    : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    
  
      return (
    <AnimatePresence>
      {process.env.NODE_ENV === 'development' && (
        <button 
          onClick={triggerTestAnimation}
          style={{
            position: 'fixed',
            top: '50px',
            right: '20px',
            zIndex: 9000,
            backgroundColor: 'rgba(0,0,0,0.5)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '10px',
            opacity: 0.6
          }}
        >
          Test Animation
        </button>
      )}
      {isAnimating && item && (
        <motion.div
          key="cart-animation"
          initial={{ 
            opacity: 1, 
            scale: 1.2,
            x: startPos.x, 
            y: startPos.y,
            rotate: 0,
          }}          
          animate={{ 
            opacity: 1,
            scale: 0.6,
            x: cartPosition.x,
            y: cartPosition.y,
            rotate: 720,
          }}
          exit={{ opacity: 0, scale: 0 }}
          transition={{ 
            type: "spring", 
            duration: 1, 
            bounce: 0.4,
            stiffness: 100 
          }}          style={{
            position: 'fixed',
            zIndex: 9999,
            pointerEvents: 'none',
            width: '70px',
            height: '70px',
            borderRadius: '50%',
            overflow: 'hidden',
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4)',
            border: '3px solid white',
            transformOrigin: 'center center'
          }}
        >          <div style={{
            position: 'relative',
            width: '100%',
            height: '100%'
          }}>
            <img 
              src={imageUrl} 
              alt={item.title || 'Product'} 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover' 
              }} 
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/70?text=Food';
              }}
            />
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(2px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span className="material-icons" style={{ 
                fontSize: '24px', 
                color: 'white',
                textShadow: '0 2px 4px rgba(0,0,0,0.5)'
              }}>
                shopping_cart
              </span>
            </div>
            {item.quantity > 1 && (
              <div style={{
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                background: '#e53935',
                color: 'white',
                borderRadius: '50%',
                width: '26px',
                height: '26px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 'bold',
                boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                border: '2px solid white'
              }}>
                {item.quantity}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Debug component - shows last cart action in development mode
const CartDebugStatus = () => {
  const { cartItems, cartAnimation } = useCart();
  const [lastAction, setLastAction] = useState(null);
  
  useEffect(() => {
    if (cartAnimation.isAnimating) {
      const item = cartAnimation.item;
      setLastAction({
        type: 'add',
        item: item?.title || 'Unknown item',
        time: new Date().toLocaleTimeString(),
        position: cartAnimation.position
      });
    }
  }, [cartAnimation]);
  
  useEffect(() => {
    const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0);
    setLastAction(prev => ({
      ...prev,
      cartCount: itemCount
    }));
  }, [cartItems]);
  
//   if (process.env.NODE_ENV !== 'development') return null;
  
//   return (
//     <div style={{
//       position: 'fixed',
//       bottom: '130px',
//       right: '10px',
//       backgroundColor: 'rgba(0,0,0,0.7)',
//       color: 'white',
//       padding: '5px',
//       borderRadius: '4px',
//       fontSize: '10px',
//       zIndex: 9000,
//       maxWidth: '150px',
//       pointerEvents: 'none'
//     }}>
//       {lastAction ? (
//         <>
//           <div>Last: {lastAction.type} {lastAction.item}</div>
//           <div>At: {lastAction.time}</div>
//           <div>Items: {lastAction.cartCount || 0}</div>
//           {lastAction.position && (
//             <div>Pos: {Math.round(lastAction.position.x)},{Math.round(lastAction.position.y)}</div>
//           )}
//         </>
//       ) : 'No cart actions'}
//     </div>
//   );
};

const CartAnimationWithDebug = () => (
  <>
    <CartAnimationEffect />
    <CartDebugStatus />
  </>
);

export default process.env.NODE_ENV === 'development' ? CartAnimationWithDebug : CartAnimationEffect;
