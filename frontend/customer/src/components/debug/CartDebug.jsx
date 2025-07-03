import React from 'react';
import { useCart } from '../../context/CartContext';

const CartDebug = () => {
  const { cartItems, cartTotal, cartLoaded, debugCartState } = useCart();

  const handleDebugClick = () => {
    debugCartState();
  };

  const handleClearLocalStorage = () => {
    localStorage.removeItem('cart');
    console.log('Cleared cart from localStorage');
  };

  const handleAddTestItem = () => {
    const testItem = {
      id: 'test-item-1',
      name: 'Test Item',
      title: 'Test Item',
      price: 10.99,
      image: 'https://via.placeholder.com/150'
    };
    
    // Manually add to localStorage to test persistence
    const currentCart = JSON.parse(localStorage.getItem('cart') || '[]');
    const updatedCart = [...currentCart, { ...testItem, quantity: 1, selectedOptions: [] }];
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    console.log('Added test item to localStorage:', updatedCart);
    
    // Refresh the page to test persistence
    window.location.reload();
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      background: '#f0f0f0',
      padding: '15px',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px'
    }}>
      <h4 style={{ margin: '0 0 10px 0' }}>Cart Debug Panel</h4>
      
      <div style={{ marginBottom: '10px' }}>
        <strong>Cart Loaded:</strong> {cartLoaded ? 'Yes' : 'No'}<br/>
        <strong>Cart Items Count:</strong> {cartItems.length}<br/>
        <strong>Cart Total:</strong> ${cartTotal.toFixed(2)}<br/>
        <strong>LocalStorage Cart:</strong> {localStorage.getItem('cart') ? 'Present' : 'Empty'}
      </div>
      
      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
        <button 
          onClick={handleDebugClick}
          style={{ padding: '5px 8px', fontSize: '11px', cursor: 'pointer' }}
        >
          Debug State
        </button>
        
        <button 
          onClick={handleClearLocalStorage}
          style={{ padding: '5px 8px', fontSize: '11px', cursor: 'pointer', background: '#ff6b6b', color: 'white', border: 'none' }}
        >
          Clear LS
        </button>
        
        <button 
          onClick={handleAddTestItem}
          style={{ padding: '5px 8px', fontSize: '11px', cursor: 'pointer', background: '#4ecdc4', color: 'white', border: 'none' }}
        >
          Add Test Item
        </button>
      </div>
      
      {cartItems.length > 0 && (
        <div style={{ marginTop: '10px', maxHeight: '100px', overflow: 'auto' }}>
          <strong>Items:</strong>
          <ul style={{ margin: '5px 0', paddingLeft: '15px' }}>
            {cartItems.map((item, index) => (
              <li key={index} style={{ fontSize: '11px' }}>
                {item.name || item.title} - Qty: {item.quantity} - ${item.price}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CartDebug;
