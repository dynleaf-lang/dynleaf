# Real-time Order Updates Implementation Guide

## Overview
This implementation adds real-time order updates using Socket.IO, allowing both admin and customer portals to receive instant notifications without page refresh.

## Installation Steps

### 1. Backend Dependencies
```bash
cd backend
npm install socket.io@^4.7.5
```

### 2. Admin Portal Dependencies  
```bash
cd admin
npm install socket.io-client@^4.7.5
```

### 3. Customer Portal Dependencies
```bash
cd frontend/customer
npm install socket.io-client@^4.7.5
```

## Features Implemented

### Backend (Server-side)
- **Socket.IO Server**: Integrated with Express server
- **Room Management**: Automatic room assignment based on user type, restaurant, branch, and table
- **Event Emission**: Real-time notifications for order creation and status updates
- **Order Controllers**: Updated to emit socket events when orders are created or updated

### Admin Portal
- **SocketContext**: React context for managing WebSocket connections
- **Real-time Listeners**: Automatic order list refresh when updates occur
- **Notifications**: Visual notifications for new orders and status changes
- **Room Joining**: Automatic joining of restaurant/branch specific rooms

### Customer Portal  
- **SocketContext**: React context for customer WebSocket connections
- **Table-specific Updates**: Customers only receive updates for their table orders
- **Status Synchronization**: Real-time status updates reflected in customer order view
- **Automatic Refresh**: Order list updates without manual refresh

## Socket Events

### Server Events (Emitted by Backend)
1. **orderUpdate**: General order changes (create, update, delete)
2. **statusUpdate**: Specific order status changes
3. **newOrder**: New order notifications for admin

### Client Events (Sent to Backend)
1. **join**: Client joins appropriate rooms based on user type and context

## Room Structure

### Admin Rooms
- `admin_global`: All admin users
- `restaurant_{restaurantId}`: Restaurant-specific admins
- `branch_{branchId}`: Branch-specific admins

### Customer Rooms  
- `table_{tableId}`: Table-specific customers
- `customer_branch_{branchId}`: Branch-specific customers

## How It Works

### Order Creation Flow
1. Customer places order → Backend creates order
2. Backend emits `newOrder` event to admin rooms
3. Admin portal receives notification and refreshes order list
4. Customer portal receives update for their table

### Status Update Flow
1. Admin updates order status → Backend updates database
2. Backend emits `statusUpdate` event to all relevant rooms
3. Both admin and customer portals receive real-time status update
4. Order lists refresh automatically showing new status

### Connection Management
- Automatic reconnection on connection loss
- Room re-joining after reconnection
- Error handling for failed connections
- Connection status indicators

## Configuration

### Environment Variables
Add to your backend `.env` file if needed:
```
SOCKET_IO_CORS_ORIGIN=*
```

### Frontend Configuration
The socket connections use the same backend URL as the REST API:
- Admin: `process.env.REACT_APP_BACKEND_URL` or `http://localhost:5000`
- Customer: `import.meta.env.VITE_BACKEND_URL` or `http://localhost:5000`

## Testing the Implementation

### 1. Start Services
```bash
# Terminal 1 - Backend
cd backend && npm start

# Terminal 2 - Admin Portal  
cd admin && npm start

# Terminal 3 - Customer Portal
cd frontend/customer && npm run dev
```

### 2. Test Real-time Updates
1. Open admin portal and navigate to Order Management
2. Open customer portal on a different browser/tab
3. Place an order from customer portal
4. Watch admin portal receive real-time notification
5. Update order status from admin portal
6. Watch customer portal update status in real-time

### 3. Verify Connection Status
- Check browser console for socket connection logs
- Look for "[SOCKET]" prefixed messages
- Verify room joining messages

## Troubleshooting

### Common Issues
1. **CORS Errors**: Ensure Socket.IO CORS is configured properly
2. **Connection Failures**: Check if backend is running and accessible
3. **Missing Updates**: Verify room joining is working correctly
4. **Multiple Connections**: Each tab/window creates separate connection

### Debug Messages
Both portals log detailed socket information to browser console:
- Connection status
- Room joining
- Event reception
- Error messages

## Performance Considerations
- Connections are automatically cleaned up on component unmount
- Failed connections attempt automatic reconnection
- Event listeners are properly removed to prevent memory leaks
- Room-based messaging reduces unnecessary network traffic

## Security Notes
- In production, configure CORS to only allow your frontend domains
- Consider implementing authentication for socket connections
- Monitor connection counts and implement rate limiting if needed
