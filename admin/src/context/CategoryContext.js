import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';

// Use environment variable for API base URL
axios.defaults.baseURL = process.env.API_BASE_URL || 'http://localhost:5001';



const CategoryContext = createContext();


const CategoryProvider = ({ children }) => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { token, user, isSuperAdmin } = useContext(AuthContext);

     


    // Function to fetch all categories - memoized with useCallback
    const fetchCategories = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const config = token ? {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            } : {};
            
            // The backend now handles restaurant-based filtering automatically
            const response = await axios.get('/api/categories', config);
            setCategories(response.data);
        } catch (error) {
            console.error('Error fetching categories:', error);
            setError(error.response?.data?.message || error.message);
            setCategories([]);
        } finally {
            setLoading(false);
        }
    }, [token]); // Only recreate this function when token changes

    // Function to upload an image for a category
    const uploadImage = useCallback(async (imageFile) => {
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

            const response = await axios.post('/api/upload', formData, config);
            return { success: true, data: response.data };
        } catch (error) {
            console.error('Error uploading category image:', error);
            return { success: false, error: error.response?.data?.message || error.message };
        }
    }, [token]);

    // Function to create a new category
    const createCategory = useCallback(async (categoryData) => {
        try {
            const config = token ? {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            } : {};
            
            // Make sure we have the required data
            const dataToSend = {
                ...categoryData,
                name: categoryData.name || '',
                description: categoryData.description || '',
                tags: Array.isArray(categoryData.tags) ? categoryData.tags : 
                      (categoryData.tags ? categoryData.tags.split(',').map(tag => tag.trim()) : [])
            };
            
            // For non-Super_Admin users, ensure we use their assigned restaurant ID
            if (!isSuperAdmin() && user && user.restaurantId) {
                dataToSend.restaurantId = user.restaurantId;
                
                // If user has a branch ID, use that too
                if (user.branchId) {
                    dataToSend.branchId = user.branchId;
                }
                
                console.log('Using user assigned restaurant/branch:', {
                    restaurantId: dataToSend.restaurantId,
                    branchId: dataToSend.branchId || 'none'
                });
            }
            
            // For Super_Admin, ensure they've selected a restaurant
            if (isSuperAdmin() && !dataToSend.restaurantId) {
                return { 
                    success: false, 
                    error: 'Please select a restaurant before creating a category'
                };
            }
            
            // Ensure name is provided
            if (!dataToSend.name) {
                return { 
                    success: false, 
                    error: 'Category name is required' 
                };
            }
            
            console.log('Sending category data:', dataToSend);
            
            const response = await axios.post('/api/categories', dataToSend, config);
            console.log('Category creation response:', response.data);
            setCategories(prevCategories => [...prevCategories, response.data]);
            return { success: true, data: response.data };
        } catch (error) {
            console.error('Error creating category:', error);
            
            // Extract a user-friendly error message
            let errorMessage = 'Failed to create category. Please try again.';
            
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            return { success: false, error: errorMessage };
        }
    }, [token, user, isSuperAdmin]);

    // Function to update a category
    const updateCategory = useCallback(async (id, categoryData) => {
        try {
            const config = token ? {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            } : {};
            
            const response = await axios.put(`/api/categories/${id}`, categoryData, config);
            
            setCategories(prevCategories =>
                prevCategories.map(category => category._id === id ? response.data : category)
            );
            
            return { success: true, data: response.data };
        } catch (error) {
            console.error('Error updating category:', error);
            return { success: false, error: error.response?.data?.message || error.message };
        }
    }, [token]);

    // Function to delete a category
    const deleteCategory = useCallback(async (id) => {
        try {
            // First find the category to get its image URL if needed
            const categoryToDelete = categories.find(cat => cat._id === id);
            
            const config = token ? {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            } : {};
            
            // Delete the category
            await axios.delete(`/api/categories/${id}`, config);
            
            // If the category had an image URL that was uploaded to our server, delete that too
            if (categoryToDelete?.imageUrl?.includes('/uploads/')) {
                try {
                    const filename = categoryToDelete.imageUrl.split('/uploads/').pop();
                    await axios.delete(`/api/upload/${filename}`, config);
                } catch (imageError) {
                    console.error('Error deleting category image:', imageError);
                    // We still consider the deletion a success even if image deletion fails
                }
            }
            
            // Update state to remove the deleted category
            setCategories(prevCategories => prevCategories.filter(category => category._id !== id));
            
            return { success: true };
        } catch (error) {
            console.error('Error deleting category:', error);
            return { success: false, error: error.response?.data?.message || error.message };
        }
    }, [token, categories]);

    // Fetch categories when the component mounts or token changes
    useEffect(() => {
        if (token) {
            fetchCategories();
        }
    }, [token]);

    return (
        <CategoryContext.Provider value={{
            categories,
            loading,
            error,
            fetchCategories,
            createCategory,
            updateCategory,
            deleteCategory,
            uploadImage
        }}>
            {children}
        </CategoryContext.Provider>
    );
};

export { CategoryContext, CategoryProvider };
export default CategoryProvider;