const mongoose = require('mongoose');
const Order = require('../src/models/Order');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/food-ordering-system', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const sampleOrders = [
  {
    restaurantId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    orderId: 'ORD-001',
    customerName: 'John Doe',
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
    orderDate: new Date('2024-01-15'),
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  },
  {
    restaurantId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    orderId: 'ORD-002',
    customerName: 'Jane Smith',
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
    orderDate: new Date('2024-01-16'),
    createdAt: new Date('2024-01-16'),
    updatedAt: new Date('2024-01-16')
  },
  {
    restaurantId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    orderId: 'ORD-003',
    customerName: 'Bob Johnson',
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
    orderDate: new Date('2024-01-17'),
    createdAt: new Date('2024-01-17'),
    updatedAt: new Date('2024-01-17')
  },
  {
    restaurantId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    orderId: 'ORD-004',
    customerName: 'Alice Brown',
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
    orderDate: new Date('2024-01-18'),
    createdAt: new Date('2024-01-18'),
    updatedAt: new Date('2024-01-18')
  },
  {
    restaurantId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    orderId: 'ORD-005',
    customerName: 'Charlie Wilson',
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
    orderDate: new Date('2024-01-19'),
    createdAt: new Date('2024-01-19'),
    updatedAt: new Date('2024-01-19')
  }
];

async function addSampleOrders() {
  try {
    console.log('Adding sample orders...');
    
    // Clear existing orders (optional)
    // await Order.deleteMany({});
    
    // Insert sample orders
    const result = await Order.insertMany(sampleOrders);
    console.log(`Successfully added ${result.length} sample orders`);
    
    // Display the orders
    result.forEach((order, index) => {
      console.log(`Order ${index + 1}:`, {
        orderId: order.orderId,
        customerName: order.customerName,
        totalAmount: order.totalAmount,
        orderType: order.orderType,
        paymentStatus: order.paymentStatus,
        status: order.status,
        orderDate: order.orderDate
      });
    });
    
  } catch (error) {
    console.error('Error adding sample orders:', error);
  } finally {
    mongoose.connection.close();
  }
}

addSampleOrders();
