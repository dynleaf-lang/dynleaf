// Dummy data for the customer frontend when backend is not available
export const dummyData = {
  // Restaurant information
  restaurant: {
    _id: 'restaurant1',
    name: 'Gourmet Delight',
    description: 'Experience the finest cuisine with our carefully crafted dishes made from premium ingredients.',
    address: '123 Culinary Avenue',
    phone: '555-123-4567',
    email: 'info@gourmetdelight.com',
    website: 'www.gourmetdelight.com',
    coverImageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8cmVzdGF1cmFudHxlbnwwfHwwfHw%3D&w=1000&q=80'
  },
  
  // Branch information
  branch: {
    _id: 'branch1',
    name: 'Downtown Branch',
    address: '45 Main Street',
    phone: '555-987-6543',
    email: 'downtown@gourmetdelight.com',
    restaurantId: 'restaurant1'
  },
  
  // Table information
  table: {
    _id: 'table1',
    name: 'Table 12',
    tableNumber: '12',
    capacity: 4,
    isOccupied: false,
    branchId: 'branch1',
    restaurantId: 'restaurant1'
  },
  
  // Categories
  categories: [
    {
      id: 'all',
      name: 'All',
      image: 'https://cdn-icons-png.flaticon.com/512/6134/6134645.png'
    },
    {
      id: 'appetizers',
      name: 'Appetizers',
      image: 'https://cdn-icons-png.flaticon.com/512/5787/5787212.png'
    },
    {
      id: 'main-course',
      name: 'Main Course',
      image: 'https://cdn-icons-png.flaticon.com/512/2515/2515263.png'
    },
    {
      id: 'desserts',
      name: 'Desserts',
      image: 'https://cdn-icons-png.flaticon.com/512/3081/3081967.png'
    },
    {
      id: 'drinks',
      name: 'Drinks',
      image: 'https://cdn-icons-png.flaticon.com/512/2405/2405469.png'
    },
    {
      id: 'soups',
      name: 'Soups',
      image: 'https://cdn-icons-png.flaticon.com/512/2276/2276931.png'
    },
    {
      id: 'salads',
      name: 'Salads',
      image: 'https://cdn-icons-png.flaticon.com/512/2515/2515183.png'
    },
    {
      id: 'burgers',
      name: 'Burgers',
      image: 'https://cdn-icons-png.flaticon.com/512/3075/3075977.png'
    },
    {
      id: 'pizza',
      name: 'Pizza',
      image: 'https://cdn-icons-png.flaticon.com/512/3132/3132693.png'
    },
    {
      id: 'pasta',
      name: 'Pasta',
      image: 'https://cdn-icons-png.flaticon.com/512/2276/2276589.png'
    },
    {
      id: 'seafood',
      name: 'Seafood',
      image: 'https://cdn-icons-png.flaticon.com/512/3082/3082040.png'
    },
    {
      id: 'breakfast',
      name: 'Breakfast',
      image: 'https://cdn-icons-png.flaticon.com/512/1147/1147805.png'
    },
    {
      id: 'lunch',
      name: 'Lunch',
      image: 'https://cdn-icons-png.flaticon.com/512/1147/1147940.png'
    },
    {
      id: 'dinner',
      name: 'Dinner',
      image: 'https://cdn-icons-png.flaticon.com/512/1147/1147801.png'
    },
    {
      id: 'snacks',
      name: 'Snacks',
      image: 'https://cdn-icons-png.flaticon.com/512/2515/2515325.png'
    },
    {
      id: 'sides',
      name: 'Sides',
      image: 'https://cdn-icons-png.flaticon.com/512/2515/2515183.png'
    }
  ],
  
  // Menu items
  menuItems: [
    {
      id: 'item1',
      title: 'Classic Caesar Salad',
      subtitle: 'Fresh romaine lettuce with our special dressing',
      description: 'Crisp romaine lettuce tossed in our homemade Caesar dressing, topped with garlic croutons and shaved parmesan.',
      price: 8.99,
      image: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&q=80',
      category: 'Appetizers',
      categoryId: 'appetizers',
      available: true,
      popular: true,
      options: [
        {
          name: 'Add Protein',
          required: false,
          multiple: false,
          values: [
            { value: 'Grilled Chicken', price: 3.99 },
            { value: 'Grilled Shrimp', price: 4.99 },
            { value: 'Salmon', price: 5.99 }
          ]
        },
        {
          name: 'Dressing',
          required: true,
          multiple: false,
          values: [
            { value: 'Regular', price: 0 },
            { value: 'On the Side', price: 0 },
            { value: 'Extra Dressing', price: 1.49 }
          ]
        }
      ]
    },
    {
      id: 'item2',
      title: 'Crispy Calamari',
      subtitle: 'Lightly battered and fried to perfection',
      description: 'Tender calamari rings lightly breaded and fried until golden, served with marinara sauce and lemon wedges.',
      price: 12.99,
      image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8MXx8Y2FsYW1hcml8ZW58MHx8MHx8&auto=format&fit=crop&w=800&q=60',
      category: 'Appetizers',
      categoryId: 'appetizers',
      available: true,
      popular: false
    },
    {
      id: 'item3',
      title: 'Grilled Salmon',
      subtitle: 'Norwegian salmon with lemon herb butter',
      description: 'Fresh Norwegian salmon fillet grilled to perfection and topped with our homemade lemon herb butter. Served with seasonal vegetables and garlic mashed potatoes.',
      price: 24.99,
      image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8c2FsbW9uJTIwZGlzaHxlbnwwfHwwfHw%3D&auto=format&fit=crop&w=800&q=60',
      category: 'Main Course',
      categoryId: 'main-course',
      available: true,
      popular: true,
      options: [
        {
          name: 'Cooking Preference',
          required: true,
          multiple: false,
          values: [
            { value: 'Medium Rare', price: 0 },
            { value: 'Medium', price: 0 },
            { value: 'Well Done', price: 0 }
          ]
        },
        {
          name: 'Side Options',
          required: false,
          multiple: false,
          values: [
            { value: 'Garlic Mashed Potatoes', price: 0 },
            { value: 'Wild Rice', price: 0 },
            { value: 'Sweet Potato Fries', price: 1.99 }
          ]
        }
      ]
    },
    {
      id: 'item4',
      title: 'Filet Mignon',
      subtitle: '8oz center-cut tenderloin',
      description: 'Prime 8oz center-cut tenderloin grilled to your preference, topped with herb butter and served with roasted asparagus and truffle mashed potatoes.',
      price: 34.99,
      image: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8c3RlYWt8ZW58MHx8MHx8&auto=format&fit=crop&w=800&q=60',
      category: 'Main Course',
      categoryId: 'main-course',
      available: true,
      popular: false,
      options: [
        {
          name: 'Cooking Temperature',
          required: true,
          multiple: false,
          values: [
            { value: 'Rare', price: 0 },
            { value: 'Medium Rare', price: 0 },
            { value: 'Medium', price: 0 },
            { value: 'Medium Well', price: 0 },
            { value: 'Well Done', price: 0 }
          ]
        }
      ]
    },
    {
      id: 'item5',
      title: 'New York Cheesecake',
      subtitle: 'Classic creamy cheesecake with graham cracker crust',
      description: 'Our signature creamy New York style cheesecake with a buttery graham cracker crust, topped with your choice of fruit compote.',
      price: 8.99,
      image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8M3x8Y2hlZXNlY2FrZXxlbnwwfHwwfHw%3D&auto=format&fit=crop&w=800&q=60',
      category: 'Desserts',
      categoryId: 'desserts',
      available: true,
      popular: true,
      options: [
        {
          name: 'Topping',
          required: false,
          multiple: false,
          values: [
            { value: 'Strawberry Compote', price: 0 },
            { value: 'Blueberry Compote', price: 0 },
            { value: 'Chocolate Drizzle', price: 0 },
            { value: 'Caramel Drizzle', price: 0 }
          ]
        }
      ]
    },
    {
      id: 'item6',
      title: 'Craft Lemonade',
      subtitle: 'House-made with fresh-squeezed lemons',
      description: 'Refreshing house-made lemonade using fresh-squeezed lemons, pure cane sugar, and filtered water. Garnished with a lemon wheel and mint.',
      price: 4.99,
      image: 'https://images.unsplash.com/photo-1568100119359-dd8eec0b1ca3?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8NXx8bGVtb25hZGV8ZW58MHx8MHx8&auto=format&fit=crop&w=800&q=60',
      category: 'Drinks',
      categoryId: 'drinks',
      available: true,
      popular: false,
      options: [
        {
          name: 'Flavor',
          required: false,
          multiple: false,
          values: [
            { value: 'Classic', price: 0 },
            { value: 'Strawberry', price: 0.50 },
            { value: 'Raspberry', price: 0.50 },
            { value: 'Mango', price: 0.50 }
          ]
        }
      ]
    },
    {
      id: 'item7',
      title: 'Margherita Flatbread',
      subtitle: 'Fresh tomatoes, mozzarella, and basil',
      description: 'Thin crispy flatbread topped with San Marzano tomato sauce, fresh mozzarella, basil, and a drizzle of extra virgin olive oil.',
      price: 10.99,
      image: 'https://images.unsplash.com/photo-1598023696416-0193a0bcd302?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8NHx8ZmxhdGJyZWFkfGVufDB8fDB8fA%3D%3D&auto=format&fit=crop&w=800&q=60',
      category: 'Appetizers',
      categoryId: 'appetizers',
      available: true,
      popular: true
    },    {
      id: 'item8',
      title: 'Chocolate Lava Cake',
      subtitle: 'Warm cake with molten chocolate center',
      description: 'Decadent dark chocolate cake with a warm, flowing chocolate center. Served with vanilla bean ice cream and fresh berries.',
      price: 9.99,
      image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8OHx8Y2hvY29sYXRlJTIwY2FrZXxlbnwwfHwwfHw%3D&auto=format&fit=crop&w=800&q=60',
      category: 'Desserts',
      categoryId: 'desserts',
      available: true,
      popular: false
    },
    {
      id: 'item9',
      title: 'Gourmet Pizza',
      subtitle: 'Artisanal pizza with premium toppings',
      description: 'Our signature pizza made with fresh dough, premium ingredients, and baked to perfection in our stone oven.',
      price: 12.99,
      image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8cGl6emF8ZW58MHx8MHx8&auto=format&fit=crop&w=800&q=60',
      category: 'Main Dishes',
      categoryId: 'main-dishes',
      available: true,
      popular: true,
      sizeVariants: [
        { name: 'Small', price: 12.99, description: '8 inch pizza' },
        { name: 'Medium', price: 15.99, description: '12 inch pizza' },
        { name: 'Large', price: 18.99, description: '16 inch pizza' }
      ]
    }
  ]
};

// Mock orders for display in OrdersView
export const mockOrders = [
  {
    _id: 'order-1687845602756',
    items: [
      { 
        menuItemId: 'item1', 
        name: 'Garlic Butter Shrimp Pasta', 
        quantity: 2, 
        price: 18.99,
        selectedOptions: [
          { name: 'Spice Level', value: 'Medium', price: 0 }
        ]
      },
      { 
        menuItemId: 'item4', 
        name: 'Caesar Salad', 
        quantity: 1, 
        price: 9.99,
        selectedOptions: [
          { name: 'Size', value: 'Regular', price: 0 },
          { name: 'Dressing', value: 'On the side', price: 0 }
        ]
      }
    ],
    customerInfo: {
      name: 'John Smith',
      phone: '555-123-4567',
      email: 'john.smith@example.com'
    },
    orderType: 'dineIn',
    totalAmount: 47.97,
    status: 'completed',
    note: 'Please bring extra napkins.',
    createdAt: '2023-06-27T08:30:22.756Z'
  },
  {
    _id: 'order-1688045685547',
    items: [
      { 
        menuItemId: 'item9', 
        name: 'Margherita Pizza', 
        quantity: 1, 
        price: 14.99
      },
      { 
        menuItemId: 'item12', 
        name: 'Tiramisu', 
        quantity: 2, 
        price: 7.99
      }
    ],
    customerInfo: {
      name: 'Jane Doe',
      phone: '555-987-6543',
      email: 'jane.doe@example.com',
      address: '123 Main St, Apt 4B, Cityville'
    },
    orderType: 'takeaway',
    totalAmount: 30.97,
    status: 'processing',
    createdAt: '2023-06-29T15:48:05.547Z'
  },
  {
    _id: 'order-1688156892347',
    items: [
      { 
        menuItemId: 'item5', 
        name: 'Beef Burger', 
        quantity: 1, 
        price: 12.99,
        selectedOptions: [
          { name: 'Cheese', value: 'Cheddar', price: 1.50 },
          { name: 'Add Bacon', value: 'Yes', price: 2.00 }
        ]
      },
      { 
        menuItemId: 'item6', 
        name: 'French Fries', 
        quantity: 1, 
        price: 4.99
      },
      { 
        menuItemId: 'item7', 
        name: 'Chocolate Milkshake', 
        quantity: 1, 
        price: 5.99
      }
    ],
    customerInfo: {
      name: 'Robert Johnson',
      phone: '555-789-0123'
    },
    orderType: 'dineIn',
    totalAmount: 27.47,
    status: 'pending',
    note: 'Allergic to nuts, please be careful with preparation.',
    createdAt: '2023-06-30T22:34:52.347Z'
  },
  {
    _id: 'order-1688242239478',
    items: [
      { 
        menuItemId: 'item2', 
        name: 'Grilled Salmon', 
        quantity: 2, 
        price: 22.99
      },
      { 
        menuItemId: 'item3', 
        name: 'Roasted Vegetables', 
        quantity: 1, 
        price: 8.99
      }
    ],
    customerInfo: {
      name: 'Emily Wilson',
      phone: '555-456-7890',
      email: 'emily.wilson@example.com',
      address: '456 Oak Avenue, Townsville'
    },
    orderType: 'delivery',
    totalAmount: 54.97,
    status: 'completed',
    createdAt: '2023-07-01T19:17:19.478Z'
  },
  {
    _id: 'order-1688325643219',
    items: [
      { 
        menuItemId: 'item8', 
        name: 'Vegetable Stir Fry', 
        quantity: 1, 
        price: 13.99
      }
    ],
    customerInfo: {
      name: 'Michael Brown',
      phone: '555-234-5678'
    },
    orderType: 'dineIn',
    totalAmount: 13.99,
    status: 'cancelled',
    note: 'Changed my mind about the order.',
    createdAt: '2023-07-02T18:27:23.219Z'
  }
];

// Mock orders utility functions
// Export mock order utility functions
export const mockOrderUtils = {
  addOrder: function(order) {
    const newOrder = {
      ...order,
      _id: `order-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };
    mockOrders.push(newOrder);
    return newOrder;
  },
  getOrderById: function(id) {
    return mockOrders.find(order => order._id === id);
  },
  updateOrderStatus: function(id, status) {
    const order = mockOrders.find(order => order._id === id);
    if (order) {
      order.status = status;
    }
    return order;
  }
};