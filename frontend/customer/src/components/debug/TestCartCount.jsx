// Simple test to isolate cart count issue
// Add this temporarily to your ProductCard component to test

const TestCartCount = () => {
  const { cartItems } = useCart();
  
  // Calculate count the same way as BottomNav
  const countMethod1 = cartItems.reduce((total, item) => total + item.quantity, 0);
  
  // Alternative calculation method
  const countMethod2 = cartItems.length > 0 ? cartItems.map(item => item.quantity).reduce((a, b) => a + b, 0) : 0;
  
  // Count total items vs total quantity
  const totalItems = cartItems.length;
  const totalQuantity = countMethod1;
  
  return (
    <div style={{
      position: 'fixed',
      top: 10,
      right: 10,
      background: 'red',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      zIndex: 9999,
      fontSize: '12px'
    }}>
      <div>Items: {totalItems}</div>
      <div>Quantity: {totalQuantity}</div>
      <div>Method1: {countMethod1}</div>
      <div>Method2: {countMethod2}</div>
      <div>Cart: {JSON.stringify(cartItems.map(i => ({id: i.id, qty: i.quantity})))}</div>
    </div>
  );
};

export default TestCartCount;
