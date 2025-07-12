# Favorites Functionality - Testing Guide

## Backend API Testing

The favorites functionality has been successfully implemented. Here's how to test it:

### Prerequisites
- Backend server running on http://localhost:5001
- A customer registered in the system with phone or email

### API Endpoints

#### 1. Get Customer Favorites
```bash
GET /api/public/favorites/{identifier}
```
**Example:**
```bash
curl http://localhost:5001/api/public/favorites/1234567890
# or
curl http://localhost:5001/api/public/favorites/customer@example.com
```

#### 2. Add Product to Favorites
```bash
POST /api/public/favorites/{identifier}
Content-Type: application/json

{
  "productId": "product123"
}
```
**Example:**
```bash
curl -X POST http://localhost:5001/api/public/favorites/1234567890 \
  -H "Content-Type: application/json" \
  -d '{"productId": "product123"}'
```

#### 3. Check if Product is Favorite
```bash
GET /api/public/favorites/{identifier}/{productId}
```
**Example:**
```bash
curl http://localhost:5001/api/public/favorites/1234567890/product123
```

#### 4. Remove Product from Favorites
```bash
DELETE /api/public/favorites/{identifier}/{productId}
```
**Example:**
```bash
curl -X DELETE http://localhost:5001/api/public/favorites/1234567890/product123
```

### Expected Responses

#### Success Response (Add/Remove):
```json
{
  "success": true,
  "message": "Product added to favorites",
  "favorites": [
    {
      "productId": "product123",
      "addedAt": "2025-07-12T10:30:00.000Z"
    }
  ]
}
```

#### Success Response (Get Favorites):
```json
{
  "success": true,
  "favorites": [
    {
      "productId": "product123",
      "addedAt": "2025-07-12T10:30:00.000Z"
    }
  ]
}
```

#### Success Response (Check Favorite):
```json
{
  "success": true,
  "isFavorite": true
}
```

#### Error Response (Customer Not Found):
```json
{
  "success": false,
  "message": "Customer not found"
}
```

## Frontend Testing

### For Logged-in Users:
1. Log into the customer application
2. Navigate to any product card
3. Click the heart icon in the top-right corner
4. Heart should fill with red color
5. Click again to remove from favorites
6. Heart should return to empty outline

### For Guest Users:
1. Open the customer application without logging in
2. Click the heart icon on any product card
3. Login prompt modal should appear
4. Modal shows benefits of creating an account
5. Click "Login / Sign Up" to navigate to auth
6. Click "Continue Browsing" to close modal

## Database Verification

Check MongoDB collection `customers` for the favorites field:
```javascript
// In MongoDB shell or Compass
db.customers.findOne(
  { $or: [{ phone: "1234567890" }, { email: "customer@example.com" }] },
  { favorites: 1 }
)
```

Should return:
```json
{
  "_id": ObjectId("..."),
  "favorites": [
    {
      "productId": "product123",
      "addedAt": ISODate("2025-07-12T10:30:00.000Z")
    }
  ]
}
```

## Integration Testing

### Complete Flow Test:
1. **Guest Experience:**
   - Open app as guest
   - Try to favorite → See login prompt
   - Close prompt and continue browsing

2. **Login and Favorite:**
   - Log into the app
   - Navigate to products
   - Add items to favorites
   - See heart icons fill with red

3. **Persistence Test:**
   - Refresh the page
   - Verify favorites are still marked
   - Log out and log back in
   - Verify favorites persist

4. **Cross-Device Test:**
   - Log in from different device/browser
   - Verify same favorites appear

## Error Scenarios Handled

✅ **Invalid Product ID**: Proper error message
✅ **Customer Not Found**: 404 with clear message  
✅ **Already in Favorites**: 409 conflict handled gracefully
✅ **Network Errors**: Frontend shows error without breaking
✅ **Authentication Errors**: Proper login prompts
✅ **Database Errors**: Server errors handled gracefully

## Performance Notes

- **Optimistic UI Updates**: Frontend updates immediately
- **Efficient Queries**: Database queries use indexed fields
- **Minimal API Calls**: Smart caching and state management
- **Error Recovery**: Graceful handling without app crashes

The implementation is production-ready and follows all best practices for error handling, user experience, and data persistence.
