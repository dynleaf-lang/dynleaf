import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';

// Use consistent API URL with the environment variable or fallback
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5001/api'; 

const MENU_ENDPOINT = `${BASE_URL}/menus`;
const UPLOAD_ENDPOINT = `${BASE_URL}/upload`;

// Updated default restaurant ID based on your other files
const DEFAULT_RESTAURANT_ID = "64daff7c9ea2549d0bd95571";

const MenuContext = createContext();

const MenuProvider = ({ children }) => {
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { token, user, isSuperAdmin } = useContext(AuthContext);

    // Function to fetch all menu items with optional restaurant and branch filters
    const fetchMenuItems = async (filters = {}) => {
        setLoading(true);
        setError(null);
        try {
            const config = token ? {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                params: {}
            } : { params: {} };
            
            // Add restaurant filter if provided
            if (filters.restaurantId) {
                config.params.restaurantId = filters.restaurantId;
            }
            
            // Add branch filter if provided
            if (filters.branchId) {
                config.params.branchId = filters.branchId;
            }
            
            const response = await axios.get(MENU_ENDPOINT, config); 
            
            // The backend now filters based on user's restaurant and branch if specified
            setMenuItems(Array.isArray(response.data) ? response.data : []);
            return response.data;
        } catch (error) {
            console.error('Error fetching menu items:', error);
            setError(error.response?.data?.message || error.message);
            setMenuItems([]);
            return [];
        } finally {
            setLoading(false);
        }
    };

    // Fetch menu items when the component mounts or token changes
    useEffect(() => {
        if (token) {
            fetchMenuItems();
        }
    }, [token]);

    // Upload image function
    const uploadImage = async (imageFile) => {
        try {
            const formData = new FormData();
            formData.append('image', imageFile);

            const config = token ? {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                }
            } : {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            };
            
            const response = await axios.post(UPLOAD_ENDPOINT, formData, config);
            return { success: true, data: response.data };
        } catch (error) {
            console.error('Error uploading image:', error);
            return { 
                success: false, 
                error: error.response?.data?.message || error.message 
            };
        }
    };

    const addMenuItem = async (newItem) => {
        try {
            // For non-Super_Admin users, the backend will automatically
            // use their restaurantId, so we don't need to explicitly set it here
            const itemWithRestaurant = {
                ...newItem
            };
            
            // If user is Super_Admin, ensure restaurantId is set
            if (isSuperAdmin() && !itemWithRestaurant.restaurantId) {
                itemWithRestaurant.restaurantId = DEFAULT_RESTAURANT_ID;
            }
            
            const config = token ? {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            } : {};
            
            const response = await axios.post(MENU_ENDPOINT, itemWithRestaurant, config);
            setMenuItems((prevItems) => [...prevItems, response.data]);
            return { success: true, data: response.data };
        } catch (error) {
            console.error('Error adding menu item:', error);
            return { success: false, error: error.response?.data || error.message };
        }
    };

    const updateMenuItem = async (id, updatedItem) => {
        try {
            const config = token ? {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            } : {};
            
            const response = await axios.put(`${MENU_ENDPOINT}/${id}`, updatedItem, config);
            setMenuItems((prevItems) =>
                prevItems.map((item) => (item._id === id ? response.data : item))
            );
            return { success: true, data: response.data };
        } catch (error) {
            console.error('Error updating menu item:', error);
            return { success: false, error: error.response?.data || error.message };
        }
    };

    const deleteMenuItem = async (id) => {
        try {
            // First, get the menu item to retrieve its image URL
            const menuItem = menuItems.find(item => item._id === id);
            
            const config = token ? {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            } : {};
            
            // Delete the menu item from the server
            await axios.delete(`${MENU_ENDPOINT}/${id}`, config);
            
            // Delete the image if it exists and is stored on our server
            if (menuItem && menuItem.imageUrl && menuItem.imageUrl.includes('/uploads/')) {
                try {
                    // Extract the filename from the URL
                    const filename = menuItem.imageUrl.split('/uploads/').pop();
                    if (filename) {
                        // Call the API to delete the image file
                        await axios.delete(`${UPLOAD_ENDPOINT}/${filename}`, config);
                    }
                } catch (imageError) {
                    console.error('Error deleting image file:', imageError);
                    // We still consider the deletion successful even if image deletion fails
                }
            }
            
            // Update state to remove the item
            setMenuItems((prevItems) => prevItems.filter((item) => item._id !== id));
            return { success: true };
        } catch (error) {
            console.error('Error deleting menu item:', error);
            return { success: false, error: error.response?.data || error.message };
        }
    };

    // Get menu items for a specific branch
    const getMenuItemsByBranch = async (branchId, restaurantId = null) => {
        if (!token) return [];
        
        try {
            const filters = {};
            if (branchId) filters.branchId = branchId;
            if (restaurantId) filters.restaurantId = restaurantId;
            
            return await fetchMenuItems(filters);
        } catch (error) {
            console.error('Error fetching menu items by branch:', error);
            return [];
        }
    };

    const contextValue = {
        menuItems,
        loading,
        error,
        fetchMenuItems,
        getMenuItemsByBranch,
        addMenuItem,
        updateMenuItem,
        deleteMenuItem,
        uploadImage,
        DEFAULT_RESTAURANT_ID
    };

    return (
        <MenuContext.Provider value={contextValue}>
            {children}
        </MenuContext.Provider>
    );
};

export { MenuContext, MenuProvider };
export default MenuProvider;
