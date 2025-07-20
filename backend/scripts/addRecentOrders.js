const mongoose = require('mongoose');
const Order = require('../src/models/Order');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/food-ordering-system', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Get current date and create orders for the last 7 days
const today = new Date();
const getRecentDate = (daysAgo) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
};

const recentOrders = [
  {
    restaurantId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    orderId: 'ORD-RECENT-001',
    customerName: 'Recent Customer 1',
    customerPhone: '+1234567890',
    items: [
      {
        menuItemId: new mongoose.Types.ObjectId(),
        name: 'Burger',
        price: 12.99,
        quantity: 2,
        subtotal: 25.98
      }
    ],
    subtotal: 25.98,
    taxAmount: 2.60,
    totalAmount: 28.58,
    orderType: 'dine-in',
    status: 'delivered',
    paymentMethod: 'card',
    paymentStatus: 'paid',
    orderDate: getRecentDate(1), // Yesterday
    createdAt: getRecentDate(1),
    updatedAt: getRecentDate(1)
  },
  {
    restaurantId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    orderId: 'ORD-RECENT-002',
    customerName: 'Recent Customer 2',
    customerPhone: '+1234567891',
    items: [
      {
        menuItemId: new mongoose.Types.ObjectId(),
        name: 'Pizza',
        price: 18.99,
        quantity: 1,
        subtotal: 18.99
      }
    ],
    subtotal: 18.99,
    taxAmount: 1.90,
    totalAmount: 20.89,
    orderType: 'takeaway',
    status: 'pending',
    paymentMethod: 'cash',
    paymentStatus: 'unpaid',
    orderDate: getRecentDate(2), // 2 days ago
    createdAt: getRecentDate(2),
    updatedAt: getRecentDate(2)
  },
  {
    restaurantId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    orderId: 'ORD-RECENT-003',
    customerName: 'Recent Customer 3',
    customerPhone: '+1234567892',
    items: [
      {
        menuItemId: new mongoose.Types.ObjectId(),
        name: 'Pasta',
        price: 15.50,
        quantity: 1,
        subtotal: 15.50
      }
    ],
    subtotal: 15.50,
    taxAmount: 1.55,
    totalAmount: 17.05,
    orderType: 'delivery',
    status: 'preparing',
    paymentMethod: 'online',
    paymentStatus: 'pending',
    orderDate: getRecentDate(3), // 3 days ago
    createdAt: getRecentDate(3),
    updatedAt: getRecentDate(3)
  },
  {
    restaurantId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    orderId: 'ORD-RECENT-004',
    customerName: 'Recent Customer 4',
    customerPhone: '+1234567893',
    items: [
      {
        menuItemId: new mongoose.Types.ObjectId(),
        name: 'Salad',
        price: 9.99,
        quantity: 2,
        subtotal: 19.98
      }
    ],
    subtotal: 19.98,
    taxAmount: 2.00,
    totalAmount: 21.98,
    orderType: 'dine-in',
    status: 'delivered',
    paymentMethod: 'card',
    paymentStatus: 'paid',
    orderDate: today, // Today
    createdAt: today,
    updatedAt: today
  },
  {
    restaurantId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    orderId: 'ORD-RECENT-005',
    customerName: 'Recent Customer 5',
    customerPhone: '+1234567894',
    items: [
      {
        menuItemId: new mongoose.Types.ObjectId(),
        name: 'Sandwich',
        price: 8.50,
        quantity: 3,
        subtotal: 25.50
      }
    ],
    subtotal: 25.50,
    taxAmount: 2.55,
    totalAmount: 28.05,
    orderType: 'takeaway',
    status: 'cancelled',
    paymentMethod: 'cash',
    paymentStatus: 'refunded',
    orderDate: getRecentDate(4), // 4 days ago
    createdAt: getRecentDate(4),
    updatedAt: getRecentDate(4)
  },
  {
    restaurantId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    orderId: 'ORD-RECENT-006',
    customerName: 'Recent Customer 6',
    customerPhone: '+1234567895',
    items: [
      {
        menuItemId: new mongoose.Types.ObjectId(),
        name: 'Steak',
        price: 24.99,
        quantity: 1,
        subtotal: 24.99
      }
    ],
    subtotal: 24.99,
    taxAmount: 2.50,
    totalAmount: 27.49,
    orderType: 'dine-in',
    status: 'ready',
    paymentMethod: 'card',
    paymentStatus: 'paid',
    orderDate: getRecentDate(5), // 5 days ago
    createdAt: getRecentDate(5),
    updatedAt: getRecentDate(5)
  }
];

async function addRecentOrders() {
  try {
    console.log('Adding recent orders...');
    console.log('Date range:', getRecentDate(7), 'to', today);
    
    // Insert recent orders
    const result = await Order.insertMany(recentOrders);
    console.log(`Successfully added ${result.length} recent orders`);
    
    // Display the orders
    result.forEach((order, index) => {
      console.log(`Order ${index + 1}:`, {
        orderId: order.orderId,
        customerName: order.customerName,
        totalAmount: order.totalAmount,
        orderType: order.orderType,
        paymentStatus: order.paymentStatus,
        status: order.status,
        orderDate: order.orderDate.toISOString().split('T')[0] // Format as YYYY-MM-DD
      });
    });
    
  } catch (error) {
    console.error('Error adding recent orders:', error);
  } finally {
    mongoose.connection.close();
  }
}

addRecentOrders();
