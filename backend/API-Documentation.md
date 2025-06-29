# Food Menu Order Management System API Documentation

## Table of Contents
1. [Introduction](#introduction)
2. [Base URL](#base-url)
3. [Authentication](#authentication)
4. [Error Handling](#error-handling)
5. [API Endpoints](#api-endpoints)
   - [Health Check](#health-check)
   - [Users](#users)
   - [Categories](#categories)
   - [Menu Items](#menu-items)
   - [File Upload](#file-upload)
   - [Restaurants](#restaurants)
   - [Branches](#branches)
   - [Tables](#tables)
   - [Taxes](#taxes)
   - [Orders](#orders)
   - [Customers](#customers)
   - [Floors](#floors)
6. [Public API Endpoints](#public-api-endpoints)
   - [Health Check](#check-public-api-health)
   - [Public Tables](#public-tables)
   - [Public Menus](#public-menus)
   - [Public Branches](#public-branches)
   - [Public Orders](#public-orders)
7. [Data Models](#data-models)
8. [Best Practices](#best-practices)

---

## Introduction

This documentation provides details about the RESTful API endpoints available in the Food Menu Order Management System. The API provides functionality for managing restaurants, menus, orders, customers, and other related entities.

## Base URL

The base URL for all API endpoints is:

```
http://localhost:5001
```

For production, replace with your domain:

```
https://yourdomain.com/api
```

## Authentication

Most endpoints require authentication using JSON Web Tokens (JWT). Include the token in the Authorization header for all authenticated requests:

```
Authorization: Bearer <your_token>
```

### Authentication Flow

1. **Register/Login** to get a token
2. Include the token in the Authorization header for subsequent requests
3. Token expiration is set to 24 hours by default

### Role-Based Access

The system has multiple user roles with different access levels:
- `Super_Admin`: Full system access
- `admin`: Restaurant-level administrative access
- `manager`: Branch-level management access
- `staff`: Limited operational access

---

## Error Handling

The API uses standard HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Server Error

Error responses follow this format:

```json
{
  "message": "Error description here"
}
```

Some endpoints provide additional error details:

```json
{
  "message": "Error description",
  "error": "Detailed error information"
}
```

---

## API Endpoints

### Health Check

#### Check API Status
- **GET** `/`
- **Description**: Verify if the API is running
- **Authentication**: None required
- **Response**:
  - Status: `200 OK`
  - Body: `API is running...`

---

### Users

#### User Registration
- **POST** `/api/users/register`
- **Description**: Register a new user
- **Authentication**: None required
- **Request Body**:
  ```json
  {
    "name": "John Doe",
    "email": "john.doe@example.com",
    "password": "securepassword",
    "role": "admin"  // Optional, defaults to "staff"
  }
  ```
- **Response**:
  - Status: `201 Created`
  - Body:
    ```json
    {
      "user": {
        "id": "user_id",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "role": "admin"
      },
      "token": "jwt_token"
    }
    ```

#### User Login
- **POST** `/api/users/login`
- **Description**: Login and get authentication token
- **Authentication**: None required
- **Request Body**:
  ```json
  {
    "email": "john.doe@example.com",
    "password": "securepassword"
  }
  ```
- **Response**:
  - Status: `200 OK`
  - Body:
    ```json
    {
      "user": {
        "id": "user_id",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "role": "admin"
      },
      "token": "jwt_token"
    }
    ```

#### Get User Profile
- **GET** `/api/users/profile`
- **Description**: Get the current user's profile
- **Authentication**: Required
- **Response**:
  - Status: `200 OK`
  - Body:
    ```json
    {
      "user": {
        "id": "user_id",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "role": "admin",
        "restaurantId": "restaurant_id",
        "branchId": "branch_id",
        "username": "johndoe",
        "firstName": "John",
        "lastName": "Doe",
        "address": "123 Main St",
        "city": "Example City",
        "country": "Example Country",
        "postalCode": "12345",
        "aboutMe": "About me text",
        "profilePhoto": "photo_url",
        "isEmailVerified": true
      }
    }
    ```

#### Update User Profile
- **PUT** `/api/users/profile`
- **Description**: Update user profile information
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "name": "John Smith",
    "username": "johnsmith",
    "firstName": "John",
    "lastName": "Smith",
    "address": "123 Main St",
    "city": "New City",
    "country": "Country",
    "postalCode": "12345",
    "aboutMe": "Updated about me"
  }
  ```
- **Response**:
  - Status: `200 OK`
  - Body:
    ```json
    {
      "message": "Profile updated successfully",
      "user": {
        // Updated user profile
      }
    }
    ```

#### Upload Profile Photo
- **POST** `/api/users/profile-photo`
- **Description**: Upload a profile photo
- **Authentication**: Required
- **Request Body**: `multipart/form-data` with photo file
- **Response**:
  - Status: `200 OK`
  - Body:
    ```json
    {
      "message": "Profile photo uploaded successfully",
      "profilePhoto": "photo_url"
    }
    ```

#### Delete Profile Photo
- **DELETE** `/api/users/profile-photo`
- **Description**: Delete the user's profile photo
- **Authentication**: Required
- **Response**:
  - Status: `200 OK`
  - Body:
    ```json
    {
      "message": "Profile photo deleted successfully"
    }
    ```

#### Change Password
- **PUT** `/api/users/change-password`
- **Description**: Change user password
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "currentPassword": "current_password",
    "newPassword": "new_password"
  }
  ```
- **Response**:
  - Status: `200 OK`
  - Body:
    ```json
    {
      "message": "Password updated successfully"
    }
    ```

#### Forgot Password
- **POST** `/api/users/forgot-password`
- **Description**: Initiate password reset process
- **Authentication**: None required
- **Request Body**:
  ```json
  {
    "email": "john.doe@example.com"
  }
  ```
- **Response**:
  - Status: `200 OK`
  - Body:
    ```json
    {
      "message": "OTP sent to your email"
    }
    ```

#### Verify Reset OTP
- **POST** `/api/users/verify-reset-otp`
- **Description**: Verify OTP for password reset
- **Authentication**: None required
- **Request Body**:
  ```json
  {
    "email": "john.doe@example.com",
    "otp": "123456"
  }
  ```
- **Response**:
  - Status: `200 OK`
  - Body:
    ```json
    {
      "message": "OTP verified successfully",
      "resetToken": "reset_token"
    }
    ```

#### Reset Password
- **POST** `/api/users/reset-password`
- **Description**: Reset password using token
- **Authentication**: None required
- **Request Body**:
  ```json
  {
    "token": "reset_token",
    "password": "new_password"
  }
  ```
- **Response**:
  - Status: `200 OK`
  - Body:
    ```json
    {
      "message": "Password reset successful"
    }
    ```

#### Get All Users (Admin)
- **GET** `/api/users/all`
- **Description**: Get all users (Admin only)
- **Authentication**: Required (Admin)
- **Response**:
  - Status: `200 OK`
  - Body: Array of user objects

#### Get User by ID (Admin)
- **GET** `/api/users/:id`
- **Description**: Get user by ID (Admin only)
- **Authentication**: Required (Admin)
- **Response**:
  - Status: `200 OK`
  - Body: User object

---

### Categories

#### Get All Categories
- **GET** `/api/categories`
- **Description**: Get all categories with optional restaurant and branch filtering
- **Authentication**: Required
- **Query Parameters**:
  - `restaurantId` (optional): Filter by restaurant
  - `branchId` (optional): Filter by branch
- **Response**:
  - Status: `200 OK`
  - Body: Array of category objects

#### Create Category
- **POST** `/api/categories`
- **Description**: Create a new category
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "name": "Category Name",
    "description": "Category Description",
    "image": "image_url",
    "restaurantId": "restaurant_id",
    "branchId": "branch_id"
  }
  ```
- **Response**:
  - Status: `201 Created`
  - Body: Created category object

#### Get Category by ID
- **GET** `/api/categories/:id`
- **Description**: Get category by ID
- **Authentication**: Required
- **Response**:
  - Status: `200 OK`
  - Body: Category object

#### Update Category
- **PUT** `/api/categories/:id`
- **Description**: Update a category
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "name": "Updated Category Name",
    "description": "Updated Description",
    "image": "updated_image_url"
  }
  ```
- **Response**:
  - Status: `200 OK`
  - Body: Updated category object

#### Delete Category
- **DELETE** `/api/categories/:id`
- **Description**: Delete a category
- **Authentication**: Required (Admin)
- **Response**:
  - Status: `200 OK`
  - Body:
    ```json
    {
      "message": "Category deleted"
    }
    ```

---

### Menu Items

#### Get All Menu Items
- **GET** `/api/menus`
- **Description**: Get all menu items with filtering
- **Authentication**: Required
- **Query Parameters**:
  - `restaurantId` (optional): Filter by restaurant
  - `branchId` (optional): Filter by branch
- **Response**:
  - Status: `200 OK`
  - Body: Array of menu item objects

#### Export Menu Items
- **GET** `/api/menus/export`
- **Description**: Export menu items to Excel/CSV
- **Authentication**: Required
- **Query Parameters**:
  - `restaurantId` (optional): Filter by restaurant
  - `branchId` (optional): Filter by branch
  - `categoryId` (optional): Filter by category
  - `isActive` (optional): Filter by active status
- **Response**:
  - Status: `200 OK`
  - Body: Excel/CSV file download

#### Import Menu Items
- **POST** `/api/menus/import`
- **Description**: Import menu items from Excel/CSV
- **Authentication**: Required
- **Request Body**: `multipart/form-data` with file
- **Response**:
  - Status: `200 OK`
  - Body:
    ```json
    {
      "message": "Import successful",
      "created": 5,
      "updated": 2,
      "failed": 0
    }
    ```

#### Create Menu Item
- **POST** `/api/menus`
- **Description**: Create a new menu item
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "name": "Menu Item Name",
    "description": "Description",
    "price": 9.99,
    "image": "image_url",
    "categoryId": "category_id",
    "restaurantId": "restaurant_id",
    "branchId": "branch_id",
    "isActive": true,
    "isVegetarian": false,
    "isVegan": false,
    "isGlutenFree": false,
    "calories": 500,
    "preparationTime": 15,
    "taxable": true
  }
  ```
- **Response**:
  - Status: `201 Created`
  - Body: Created menu item object

#### Get Menu Item by ID
- **GET** `/api/menus/:id`
- **Description**: Get a menu item by ID
- **Authentication**: Required
- **Response**:
  - Status: `200 OK`
  - Body: Menu item object

#### Update Menu Item
- **PUT** `/api/menus/:id`
- **Description**: Update a menu item
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "name": "Updated Name",
    "description": "Updated Description",
    "price": 12.99,
    "image": "updated_image_url",
    "isActive": true
  }
  ```
- **Response**:
  - Status: `200 OK`
  - Body: Updated menu item object

#### Delete Menu Item
- **DELETE** `/api/menus/:id`
- **Description**: Delete a menu item
- **Authentication**: Required (Admin)
- **Response**:
  - Status: `200 OK`
  - Body:
    ```json
    {
      "message": "Menu item deleted"
    }
    ```

#### Batch Update Menu Items
- **PUT** `/api/menus/batch`
- **Description**: Update multiple menu items at once
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "items": [
      {
        "id": "menu_item_id_1",
        "updates": {
          "price": 11.99,
          "isActive": false
        }
      },
      {
        "id": "menu_item_id_2",
        "updates": {
          "price": 14.99,
          "isActive": true
        }
      }
    ]
  }
  ```
- **Response**:
  - Status: `200 OK`
  - Body:
    ```json
    {
      "message": "Batch update successful",
      "updated": 2
    }
    ```

---

### File Upload

#### Upload File
- **POST** `/api/upload`
- **Description**: Upload a file (image, document, etc.)
- **Authentication**: Required
- **Request Body**: `multipart/form-data` with file
- **Response**:
  - Status: `200 OK`
  - Body:
    ```json
    {
      "message": "File uploaded successfully",
      "file": "file_url"
    }
    ```

---

### Restaurants

#### Get All Restaurants
- **GET** `/api/restaurants`
- **Description**: Get all restaurants
- **Authentication**: Required
- **Response**:
  - Status: `200 OK`
  - Body: Array of restaurant objects

#### Create Restaurant
- **POST** `/api/restaurants`
- **Description**: Create a new restaurant
- **Authentication**: Required (Admin)
- **Request Body**:
  ```json
  {
    "name": "Restaurant Name",
    "description": "Restaurant Description",
    "address": "123 Main St",
    "city": "City Name",
    "country": "Country Name",
    "postalCode": "12345",
    "phone": "+1234567890",
    "email": "restaurant@example.com",
    "logo": "logo_url",
    "website": "https://www.restaurant.com",
    "openingHours": {
      "monday": "9:00 AM - 10:00 PM",
      "tuesday": "9:00 AM - 10:00 PM",
      "wednesday": "9:00 AM - 10:00 PM",
      "thursday": "9:00 AM - 10:00 PM",
      "friday": "9:00 AM - 11:00 PM",
      "saturday": "9:00 AM - 11:00 PM",
      "sunday": "9:00 AM - 10:00 PM"
    },
    "cuisineType": "Italian"
  }
  ```
- **Response**:
  - Status: `201 Created`
  - Body: Created restaurant object

#### Get Restaurant by ID
- **GET** `/api/restaurants/:id`
- **Description**: Get restaurant by ID
- **Authentication**: Required
- **Response**:
  - Status: `200 OK`
  - Body: Restaurant object

#### Update Restaurant
- **PUT** `/api/restaurants/:id`
- **Description**: Update a restaurant
- **Authentication**: Required (Admin)
- **Request Body**:
  ```json
  {
    "name": "Updated Restaurant Name",
    "description": "Updated Description",
    "address": "Updated Address",
    "phone": "Updated Phone"
  }
  ```
- **Response**:
  - Status: `200 OK`
  - Body: Updated restaurant object

#### Delete Restaurant
- **DELETE** `/api/restaurants/:id`
- **Description**: Delete a restaurant
- **Authentication**: Required (Super_Admin)
- **Response**:
  - Status: `200 OK`
  - Body:
    ```json
    {
      "message": "Restaurant deleted"
    }
    ```

---

### Branches

#### Get All Branches
- **GET** `/api/branches`
- **Description**: Get all branches with optional restaurant filtering
- **Authentication**: Required
- **Query Parameters**:
  - `restaurantId` (optional): Filter by restaurant
- **Response**:
  - Status: `200 OK`
  - Body: Array of branch objects

#### Create Branch
- **POST** `/api/branches`
- **Description**: Create a new branch
- **Authentication**: Required (Admin)
- **Request Body**:
  ```json
  {
    "name": "Branch Name",
    "restaurantId": "restaurant_id",
    "address": "456 Branch St",
    "city": "Branch City",
    "country": "Country Name",
    "postalCode": "12345",
    "phone": "+1234567890",
    "email": "branch@example.com",
    "managerName": "Manager Name",
    "openingHours": {
      "monday": "9:00 AM - 10:00 PM",
      "tuesday": "9:00 AM - 10:00 PM",
      "wednesday": "9:00 AM - 10:00 PM",
      "thursday": "9:00 AM - 10:00 PM",
      "friday": "9:00 AM - 11:00 PM",
      "saturday": "9:00 AM - 11:00 PM",
      "sunday": "9:00 AM - 10:00 PM"
    }
  }
  ```
- **Response**:
  - Status: `201 Created`
  - Body: Created branch object

#### Get Branch by ID
- **GET** `/api/branches/:id`
- **Description**: Get branch by ID
- **Authentication**: Required
- **Response**:
  - Status: `200 OK`
  - Body: Branch object

#### Update Branch
- **PUT** `/api/branches/:id`
- **Description**: Update a branch
- **Authentication**: Required (Admin)
- **Request Body**:
  ```json
  {
    "name": "Updated Branch Name",
    "address": "Updated Address",
    "phone": "Updated Phone"
  }
  ```
- **Response**:
  - Status: `200 OK`
  - Body: Updated branch object

#### Delete Branch
- **DELETE** `/api/branches/:id`
- **Description**: Delete a branch
- **Authentication**: Required (Admin)
- **Response**:
  - Status: `200 OK`
  - Body:
    ```json
    {
      "message": "Branch deleted"
    }
    ```

---

### Tables

#### Get All Tables
- **GET** `/api/tables`
- **Description**: Get all dining tables with filtering
- **Authentication**: Required
- **Query Parameters**:
  - `restaurantId` (optional): Filter by restaurant
  - `branchId` (optional): Filter by branch
  - `floorId` (optional): Filter by floor
  - `status` (optional): Filter by status (available, occupied, reserved)
- **Response**:
  - Status: `200 OK`
  - Body: Array of table objects

#### Create Table
- **POST** `/api/tables`
- **Description**: Create a new dining table
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "tableNumber": "T1",
    "capacity": 4,
    "status": "available",
    "restaurantId": "restaurant_id",
    "branchId": "branch_id",
    "floorId": "floor_id",
    "position": {
      "x": 100,
      "y": 150
    }
  }
  ```
- **Response**:
  - Status: `201 Created`
  - Body: Created table object

#### Get Table by ID
- **GET** `/api/tables/:id`
- **Description**: Get table by ID
- **Authentication**: Required
- **Response**:
  - Status: `200 OK`
  - Body: Table object

#### Update Table
- **PUT** `/api/tables/:id`
- **Description**: Update a table
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "tableNumber": "T1-A",
    "capacity": 6,
    "status": "occupied"
  }
  ```
- **Response**:
  - Status: `200 OK`
  - Body: Updated table object

#### Delete Table
- **DELETE** `/api/tables/:id`
- **Description**: Delete a table
- **Authentication**: Required (Admin)
- **Response**:
  - Status: `200 OK`
  - Body:
    ```json
    {
      "message": "Table deleted"
    }
    ```

#### Update Table Status
- **PATCH** `/api/tables/:id/status`
- **Description**: Update only the status of a table
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "status": "reserved"
  }
  ```
- **Response**:
  - Status: `200 OK`
  - Body: Updated table object with new status

#### Update Table Position
- **PATCH** `/api/tables/:id/position`
- **Description**: Update the position of a table
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "position": {
      "x": 200,
      "y": 300
    }
  }
  ```
- **Response**:
  - Status: `200 OK`
  - Body: Updated table object

---

### Taxes

#### Get All Taxes
- **GET** `/api/taxes`
- **Description**: Get all tax rates
- **Authentication**: Required
- **Query Parameters**:
  - `restaurantId` (optional): Filter by restaurant
- **Response**:
  - Status: `200 OK`
  - Body: Array of tax objects

#### Create Tax
- **POST** `/api/taxes`
- **Description**: Create a new tax rate
- **Authentication**: Required (Admin)
- **Request Body**:
  ```json
  {
    "name": "VAT",
    "rate": 10.0,
    "description": "Value Added Tax",
    "restaurantId": "restaurant_id",
    "isDefault": false
  }
  ```
- **Response**:
  - Status: `201 Created`
  - Body: Created tax object

#### Get Tax by ID
- **GET** `/api/taxes/:id`
- **Description**: Get tax by ID
- **Authentication**: Required
- **Response**:
  - Status: `200 OK`
  - Body: Tax object

#### Update Tax
- **PUT** `/api/taxes/:id`
- **Description**: Update a tax rate
- **Authentication**: Required (Admin)
- **Request Body**:
  ```json
  {
    "name": "Updated VAT",
    "rate": 12.5,
    "description": "Updated description"
  }
  ```
- **Response**:
  - Status: `200 OK`
  - Body: Updated tax object

#### Delete Tax
- **DELETE** `/api/taxes/:id`
- **Description**: Delete a tax rate
- **Authentication**: Required (Admin)
- **Response**:
  - Status: `200 OK`
  - Body:
    ```json
    {
      "message": "Tax deleted"
    }
    ```

---

### Orders

#### Get All Orders
- **GET** `/api/orders`
- **Description**: Get all orders for the current user's restaurant/branch
- **Authentication**: Required
- **Response**:
  - Status: `200 OK`
  - Body: Array of order objects

#### Get All Orders with Filters (Super Admin)
- **GET** `/api/orders/all`
- **Description**: Get all orders with filtering options
- **Authentication**: Required (Super_Admin)
- **Query Parameters**:
  - `restaurantId` (optional): Filter by restaurant
  - `branchId` (optional): Filter by branch
  - `status` (optional): Filter by order status
  - `fromDate` (optional): Filter by start date
  - `toDate` (optional): Filter by end date
  - `customerId` (optional): Filter by customer
- **Response**:
  - Status: `200 OK`
  - Body: Array of order objects

#### Get Order Statistics
- **GET** `/api/orders/statistics`
- **Description**: Get order statistics and analytics
- **Authentication**: Required
- **Query Parameters**:
  - `period` (optional): Time period (daily, weekly, monthly, yearly)
  - `restaurantId` (optional): Filter by restaurant
  - `branchId` (optional): Filter by branch
- **Response**:
  - Status: `200 OK`
  - Body: Statistics object with sales data

#### Create Order
- **POST** `/api/orders`
- **Description**: Create a new order
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "customerInfo": {
      "name": "John Doe",
      "phone": "+1234567890",
      "email": "john@example.com"
    },
    "items": [
      {
        "menuItemId": "menu_item_id_1",
        "quantity": 2,
        "price": 9.99,
        "notes": "Extra spicy"
      },
      {
        "menuItemId": "menu_item_id_2",
        "quantity": 1,
        "price": 12.99,
        "notes": ""
      }
    ],
    "tableId": "table_id",
    "restaurantId": "restaurant_id",
    "branchId": "branch_id",
    "orderType": "dine-in",
    "paymentMethod": "cash",
    "status": "pending",
    "notes": "Please deliver as soon as possible",
    "taxAmount": 2.29,
    "subtotal": 32.97,
    "total": 35.26
  }
  ```
- **Response**:
  - Status: `201 Created`
  - Body: Created order object

#### Get Order by ID
- **GET** `/api/orders/:id`
- **Description**: Get order by ID
- **Authentication**: Required
- **Response**:
  - Status: `200 OK`
  - Body: Order object

#### Update Order
- **PUT** `/api/orders/:id`
- **Description**: Update an order
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "items": [
      {
        "menuItemId": "menu_item_id_1",
        "quantity": 3,
        "price": 9.99,
        "notes": "Extra spicy"
      }
    ],
    "status": "in-progress",
    "notes": "Updated notes"
  }
  ```
- **Response**:
  - Status: `200 OK`
  - Body: Updated order object

#### Update Order Status
- **PATCH** `/api/orders/:id/status`
- **Description**: Update only the status of an order
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "status": "completed"
  }
  ```
- **Response**:
  - Status: `200 OK`
  - Body: Updated order object

#### Generate Invoice
- **GET** `/api/orders/:id/invoice`
- **Description**: Generate an invoice for an order
- **Authentication**: Required
- **Response**:
  - Status: `200 OK`
  - Body: Invoice data or PDF file

#### Get Orders by Restaurant
- **GET** `/api/orders/restaurant/:restaurantId`
- **Description**: Get all orders for a specific restaurant
- **Authentication**: Required (Admin)
- **Response**:
  - Status: `200 OK`
  - Body: Array of order objects

#### Get Orders by Branch
- **GET** `/api/orders/branch/:branchId`
- **Description**: Get all orders for a specific branch
- **Authentication**: Required (Admin or Manager)
- **Response**:
  - Status: `200 OK`
  - Body: Array of order objects

#### Get Orders by Customer
- **GET** `/api/orders/customer/:customerId`
- **Description**: Get all orders for a specific customer
- **Authentication**: Required
- **Response**:
  - Status: `200 OK`
  - Body: Array of order objects

#### Delete Order
- **DELETE** `/api/orders/:id`
- **Description**: Delete an order
- **Authentication**: Required (Admin or Super_Admin)
- **Response**:
  - Status: `200 OK`
  - Body:
    ```json
    {
      "message": "Order deleted"
    }
    ```

---

### Customers

#### Get All Customers
- **GET** `/api/customers`
- **Description**: Get all customers with filtering
- **Authentication**: Required
- **Query Parameters**:
  - `restaurantId` (optional): Filter by restaurant
- **Response**:
  - Status: `200 OK`
  - Body: Array of customer objects

#### Create Customer
- **POST** `/api/customers`
- **Description**: Create a new customer
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "address": "123 Customer St",
    "restaurantId": "restaurant_id"
  }
  ```
- **Response**:
  - Status: `201 Created`
  - Body: Created customer object

#### Get Customer by ID
- **GET** `/api/customers/:id`
- **Description**: Get customer by ID
- **Authentication**: Required
- **Response**:
  - Status: `200 OK`
  - Body: Customer object

#### Update Customer
- **PUT** `/api/customers/:id`
- **Description**: Update a customer
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "name": "John Smith",
    "email": "john.smith@example.com",
    "phone": "Updated Phone Number"
  }
  ```
- **Response**:
  - Status: `200 OK`
  - Body: Updated customer object

#### Delete Customer
- **DELETE** `/api/customers/:id`
- **Description**: Delete a customer
- **Authentication**: Required (Admin)
- **Response**:
  - Status: `200 OK`
  - Body:
    ```json
    {
      "message": "Customer deleted"
    }
    ```

---

### Floors

#### Get All Floors
- **GET** `/api/floors`
- **Description**: Get all floors with filtering
- **Authentication**: Required
- **Query Parameters**:
  - `restaurantId` (optional): Filter by restaurant
  - `branchId` (optional): Filter by branch
- **Response**:
  - Status: `200 OK`
  - Body: Array of floor objects

#### Create Floor
- **POST** `/api/floors`
- **Description**: Create a new floor
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "name": "Ground Floor",
    "restaurantId": "restaurant_id",
    "branchId": "branch_id",
    "width": 800,
    "height": 600
  }
  ```
- **Response**:
  - Status: `201 Created`
  - Body: Created floor object

#### Get Floor by ID
- **GET** `/api/floors/:id`
- **Description**: Get floor by ID
- **Authentication**: Required
- **Response**:
  - Status: `200 OK`
  - Body: Floor object

#### Update Floor
- **PUT** `/api/floors/:id`
- **Description**: Update a floor
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "name": "Updated Floor Name",
    "width": 1000,
    "height": 800
  }
  ```
- **Response**:
  - Status: `200 OK`
  - Body: Updated floor object

#### Delete Floor
- **DELETE** `/api/floors/:id`
- **Description**: Delete a floor
- **Authentication**: Required (Admin)
- **Response**:
  - Status: `200 OK`
  - Body:
    ```json
    {
      "message": "Floor deleted"
    }
    ```

---

## Data Models

### User
```json
{
  "id": "string",
  "name": "string",
  "email": "string",
  "password": "string (hashed)",
  "role": "string (Super_Admin, admin, manager, staff)",
  "restaurantId": "string (ObjectId)",
  "branchId": "string (ObjectId)",
  "username": "string",
  "firstName": "string",
  "lastName": "string",
  "address": "string",
  "city": "string",
  "country": "string",
  "postalCode": "string",
  "aboutMe": "string",
  "profilePhoto": "string (URL)",
  "isEmailVerified": "boolean",
  "status": "string (active, inactive)",
  "isDeleted": "boolean",
  "createdAt": "date",
  "updatedAt": "date"
}
```

### Category
```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "image": "string (URL)",
  "restaurantId": "string (ObjectId)",
  "branchId": "string (ObjectId)",
  "isActive": "boolean",
  "createdAt": "date",
  "updatedAt": "date"
}
```

### MenuItem
```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "price": "number",
  "image": "string (URL)",
  "categoryId": "string (ObjectId)",
  "restaurantId": "string (ObjectId)",
  "branchId": "string (ObjectId)",
  "isActive": "boolean",
  "isVegetarian": "boolean",
  "isVegan": "boolean",
  "isGlutenFree": "boolean", 
  "calories": "number",
  "preparationTime": "number (minutes)",
  "taxable": "boolean",
  "createdAt": "date",
  "updatedAt": "date"
}
```

### Restaurant
```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "address": "string",
  "city": "string",
  "country": "string",
  "postalCode": "string",
  "phone": "string",
  "email": "string",
  "logo": "string (URL)",
  "website": "string (URL)",
  "openingHours": {
    "monday": "string",
    "tuesday": "string",
    "wednesday": "string",
    "thursday": "string",
    "friday": "string",
    "saturday": "string",
    "sunday": "string"
  },
  "cuisineType": "string",
  "createdAt": "date",
  "updatedAt": "date"
}
```

### Branch
```json
{
  "id": "string",
  "name": "string",
  "restaurantId": "string (ObjectId)",
  "address": "string",
  "city": "string",
  "country": "string",
  "postalCode": "string",
  "phone": "string",
  "email": "string",
  "managerName": "string",
  "openingHours": {
    "monday": "string",
    "tuesday": "string",
    "wednesday": "string",
    "thursday": "string",
    "friday": "string",
    "saturday": "string",
    "sunday": "string"
  },
  "createdAt": "date",
  "updatedAt": "date"
}
```

### DiningTable
```json
{
  "id": "string",
  "tableNumber": "string",
  "capacity": "number",
  "status": "string (available, occupied, reserved)",
  "restaurantId": "string (ObjectId)",
  "branchId": "string (ObjectId)",
  "floorId": "string (ObjectId)",
  "position": {
    "x": "number",
    "y": "number"
  },
  "createdAt": "date",
  "updatedAt": "date"
}
```

### Tax
```json
{
  "id": "string",
  "name": "string",
  "rate": "number",
  "description": "string",
  "restaurantId": "string (ObjectId)",
  "isDefault": "boolean",
  "createdAt": "date",
  "updatedAt": "date"
}
```

### Order
```json
{
  "id": "string",
  "orderNumber": "string",
  "customerInfo": {
    "name": "string",
    "phone": "string",
    "email": "string"
  },
  "customerId": "string (ObjectId)",
  "items": [
    {
      "menuItemId": "string (ObjectId)",
      "name": "string",
      "quantity": "number",
      "price": "number",
      "notes": "string",
      "subtotal": "number"
    }
  ],
  "tableId": "string (ObjectId)",
  "restaurantId": "string (ObjectId)",
  "branchId": "string (ObjectId)",
  "orderType": "string (dine-in, takeaway, delivery)",
  "paymentMethod": "string (cash, card, online)",
  "status": "string (pending, in-progress, completed, cancelled)",
  "notes": "string",
  "taxAmount": "number",
  "subtotal": "number",
  "total": "number",
  "createdBy": "string (ObjectId)",
  "createdAt": "date",
  "updatedAt": "date"
}
```

### Customer
```json
{
  "id": "string",
  "name": "string",
  "email": "string",
  "phone": "string",
  "address": "string",
  "restaurantId": "string (ObjectId)",
  "orderHistory": ["string (ObjectId)"],
  "createdAt": "date",
  "updatedAt": "date"
}
```

### Floor
```json
{
  "id": "string",
  "name": "string",
  "restaurantId": "string (ObjectId)",
  "branchId": "string (ObjectId)",
  "width": "number",
  "height": "number",
  "createdAt": "date",
  "updatedAt": "date"
}
```

---

## Best Practices

### Authentication

1. Always include the JWT token in the Authorization header:
   ```
   Authorization: Bearer <your_token>
   ```

2. Tokens expire after 24 hours. Handle token refresh appropriately in your frontend application.

### Error Handling

1. Always check for error responses from the API and handle them gracefully in your frontend application.

2. Common HTTP status codes:
   - `200`: Success
   - `201`: Resource created
   - `400`: Bad request (client error)
   - `401`: Unauthorized (missing or invalid token)
   - `403`: Forbidden (insufficient permissions)
   - `404`: Resource not found
   - `500`: Server error

### Resource Access

1. Users can only access resources associated with their restaurant and branch unless they are Super_Admins.

2. Use appropriate query parameters to filter resources by restaurant, branch, etc.

### File Upload

1. Use multipart/form-data for file uploads.

2. Image files are stored in `/uploads` directory and accessible via `/uploads/<filename>`.

3. Maximum file size is 10MB.

---

© 2025 Food Menu Order Management System. All rights reserved.

---

## Public API Endpoints

The following endpoints are public and are used by the customer frontend application. These endpoints do not require authentication.

### Health Check

#### Check Public API Health
- **GET** `/api/public/health`
- **Description**: Check if the public API is running
- **Authentication**: None required
- **Response**:
  - Status: `200 OK`
  - Body:
    ```json
    {
      "status": "ok",
      "message": "Public API is running",
      "timestamp": "2025-06-27T12:00:00.000Z"
    }
    ```

### Public Tables

#### Get All Tables
- **GET** `/api/public/tables`
- **Description**: Get all tables with optional filtering
- **Authentication**: None required
- **Query Parameters**:
  - `branchId` (optional): Filter by branch ID
  - `floorId` (optional): Filter by floor ID
  - `zone` (optional): Filter by zone
  - `status` (optional): Filter by table status
  - `isVIP` (optional): Filter by VIP status (true/false)
- **Response**:
  - Status: `200 OK`
  - Body: Array of table objects

#### Get Table by ID
- **GET** `/api/public/tables/:id`
- **Description**: Get a single table by ID
- **Authentication**: None required
- **Response**:
  - Status: `200 OK`
  - Body: Table object

#### Get Tables by Branch
- **GET** `/api/public/tables/branch/:branchId`
- **Description**: Get all tables for a specific branch
- **Authentication**: None required
- **Response**:
  - Status: `200 OK`
  - Body: Array of table objects

### Public Menus

#### Get Menu Items by Branch
- **GET** `/api/public/menus/branch/:branchId`
- **Description**: Get all menu items for a specific branch
- **Authentication**: None required
- **Response**:
  - Status: `200 OK`
  - Body: Array of menu item objects

#### Get Menu Categories by Branch
- **GET** `/api/public/menus/branch/:branchId/categories`
- **Description**: Get all menu categories for a specific branch
- **Authentication**: None required
- **Response**:
  - Status: `200 OK`
  - Body: Array of category objects

#### Get Menu Items by Category
- **GET** `/api/public/menus/branch/:branchId/category/:categoryId`
- **Description**: Get all menu items for a specific category in a branch
- **Authentication**: None required
- **Response**:
  - Status: `200 OK`
  - Body: Array of menu item objects

#### Get Menu Item by ID
- **GET** `/api/public/menus/item/:itemId`
- **Description**: Get details of a specific menu item
- **Authentication**: None required
- **Response**:
  - Status: `200 OK`
  - Body: Menu item object

#### Search Menu Items
- **GET** `/api/public/menus/search`
- **Description**: Search menu items by query text
- **Authentication**: None required
- **Query Parameters**:
  - `branchId`: Branch ID to search in
  - `query`: Search query text
- **Response**:
  - Status: `200 OK`
  - Body: Array of matching menu item objects

### Public Branches

#### Get Branch by ID
- **GET** `/api/public/branches/:id`
- **Description**: Get details of a specific branch
- **Authentication**: None required
- **Response**:
  - Status: `200 OK`
  - Body: Branch object with restaurant information

#### Get Branches by Restaurant
- **GET** `/api/public/branches/restaurant/:restaurantId`
- **Description**: Get all branches for a specific restaurant
- **Authentication**: None required
- **Response**:
  - Status: `200 OK`
  - Body: Array of branch objects

#### Find Nearby Branches
- **GET** `/api/public/branches/nearby`
- **Description**: Find branches near a geographic location
- **Authentication**: None required
- **Query Parameters**:
  - `lat`: Latitude
  - `lng`: Longitude
  - `radius` (optional): Search radius in kilometers (default: 10)
- **Response**:
  - Status: `200 OK`
  - Body: Array of branch objects with distance information

### Public Orders

#### Create Order
- **POST** `/api/public/orders`
- **Description**: Create a new order
- **Authentication**: None required
- **Request Body**:
  ```json
  {
    "branchId": "branch_id",
    "tableId": "table_id",
    "items": [
      {
        "menuItemId": "menu_item_id",
        "name": "Item Name",
        "price": 9.99,
        "quantity": 2,
        "specialInstructions": "No onions"
      }
    ],
    "customerName": "John Doe",
    "customerPhone": "+1234567890",
    "specialInstructions": "Please deliver ASAP"
  }
  ```
- **Response**:
  - Status: `201 Created`
  - Body: Created order object

#### Get Order by ID
- **GET** `/api/public/orders/:id`
- **Description**: Get order details
- **Authentication**: None required
- **Response**:
  - Status: `200 OK`
  - Body: Order object

#### Get Orders by Table
- **GET** `/api/public/orders/table/:tableId`
- **Description**: Get active orders for a specific table
- **Authentication**: None required
- **Response**:
  - Status: `200 OK`
  - Body: Array of order objects

#### Get Orders by Customer Phone Number
- **GET** `/api/public/orders/customer/:phoneNumber`
- **Description**: Get recent orders for a specific customer by phone number
- **Authentication**: None required
- **Response**:
  - Status: `200 OK`
  - Body: Array of order objects (limited to 5 most recent)
