// We need to connect the "handleProceedToCheckout" button in CartContent 
// to the setCheckoutStep function in CartComponent.

// Add this to the CartComponent's useEffect:
useEffect(() => {
  // Listen for checkout event from CartContent
  const handleProceedToCheckout = () => {
    if (cartItems.length > 0) {
      setCheckoutStep('checkout');
    }
  };
  
  document.addEventListener('proceedToCheckout', handleProceedToCheckout);
  
  // Clean up when component unmounts
  return () => {
    document.removeEventListener('proceedToCheckout', handleProceedToCheckout);
  };
}, [cartItems, setCheckoutStep]);

// And in the CartContent component:
const handleProceedToCheckout = useCallback(() => {
  if (cartItems.length > 0) {
    document.dispatchEvent(new CustomEvent('proceedToCheckout'));
  }
}, [cartItems]);
