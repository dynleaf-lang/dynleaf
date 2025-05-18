import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';

const API_BASE_URL = process.env.REACT_APP_BASE_API_URL || 'http://localhost:5001/api/menus'; // Base URL for all menu-related endpoints
const UPLOAD_URL = '/api/upload'; // URL for image uploads

// Default restaurant ID - must be a valid MongoDB ObjectId in your database
const DEFAULT_RESTAURANT_ID = "64daff7c9ea2549d0bd95571"; 

const MenuContext = createContext();

const MenuProvider = ({ children }) => {
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const { token } = useContext(AuthContext);

    useEffect(() => {
        const fetchMenuItems = async () => {
            try {
                const response = await axios.get(API_BASE_URL);
                setMenuItems(response.data);
            } catch (error) {
                console.error('Error fetching menu items:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchMenuItems();
    }, []);

    // New function to handle image uploads
    const uploadImage = async (imageFile) => {
        try {
            // Create form data for the file upload
            const formData = new FormData();
            formData.append('image', imageFile);

            // Upload the image
            const response = await axios.post(UPLOAD_URL, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            // Return the response, which should include the image URL
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
            // Ensure restaurantId is always included
            const itemWithRestaurant = {
                ...newItem,
                restaurantId: newItem.restaurantId || DEFAULT_RESTAURANT_ID
            };
            
            const response = await axios.post(API_BASE_URL, itemWithRestaurant);
            setMenuItems((prevItems) => [...prevItems, response.data]);
            return { success: true, data: response.data };
        } catch (error) {
            console.error('Error adding menu item:', error);
            return { success: false, error: error.response?.data || error.message };
        }
    };

    const updateMenuItem = async (id, updatedItem) => {
        try {
            const response = await axios.put(`${API_BASE_URL}/${id}`, updatedItem);
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
            
            // Delete the menu item from the server
            await axios.delete(`${API_BASE_URL}/${id}`);
            
            // Delete the image if it exists and is stored on our server
            if (menuItem && menuItem.imageUrl && menuItem.imageUrl.includes('/uploads/')) {
                try {
                    // Extract the filename from the URL
                    const filename = menuItem.imageUrl.split('/uploads/').pop();
                    if (filename) {
                        // Call the API to delete the image file
                        await axios.delete(`${UPLOAD_URL}/${filename}`);
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

    const contextValue = {
        menuItems,
        loading,
        addMenuItem,
        updateMenuItem,
        deleteMenuItem,
        uploadImage,
        DEFAULT_RESTAURANT_ID, // Export the default restaurant ID for component use
    };

    return (
        <MenuContext.Provider value={contextValue}>
            {loading ? <div>Loading...</div> : children}
        </MenuContext.Provider>
    );
}

export { MenuContext, MenuProvider };
export default MenuProvider;
