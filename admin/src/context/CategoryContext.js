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
    const [filteredCategories, setFilteredCategories] = useState([]);
    const { token, user, isSuperAdmin } = useContext(AuthContext);

    // Declare fetchCategories first without the circular dependency
    const fetchCategories = useCallback(async (restaurantId = null, branchId = null) => {
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
            const fetchedCategories = response.data;
            setCategories(fetchedCategories);
            
            // Apply immediate filtering if params provided
            if (restaurantId || branchId) {
                // Filter the categories directly instead of calling filterCategories
                let filtered = [...fetchedCategories];
                
                if (restaurantId) {
                    filtered = filtered.filter(category => 
                        category.restaurantId && String(category.restaurantId) === String(restaurantId)
                    );
                }
                
                if (branchId) {
                    filtered = filtered.filter(category => 
                        !category.branchId || 
                        String(category.branchId) === String(branchId)
                    );
                }
                
                setFilteredCategories(filtered);
            } else {
                setFilteredCategories(fetchedCategories);
            }
            
            return fetchedCategories;
        } catch (error) {
            console.error('Error fetching categories:', error);
            setError(error.response?.data?.message || error.message);
            setCategories([]);
            setFilteredCategories([]);
            return [];
        } finally {
            setLoading(false);
        }
    }, [token]); // Remove filterCategories dependency
     
    // Now define filterCategories with access to fetchCategories
    const filterCategories = useCallback((restaurantId = null, branchId = null) => {
        // Return a promise to allow async/await usage with this function
        return new Promise(async (resolve) => {
            if (!categories.length) {
                try {
                    // If categories aren't loaded yet, fetch them first
                    const fetchedCategories = await fetchCategories();
                    
                    // Apply filtering to the fetched categories
                    let result = [...fetchedCategories];
                    
                    // Filter by restaurant if provided
                    if (restaurantId) {
                        result = result.filter(category => 
                            category.restaurantId && String(category.restaurantId) === String(restaurantId)
                        );
                    }
                    
                    // Filter by branch if provided
                    if (branchId) {
                        result = result.filter(category => 
                            !category.branchId || // Include categories without branch (shared across all branches)
                            String(category.branchId) === String(branchId) // Or match the specific branch
                        );
                    }
                    
                    setFilteredCategories(result);
                    resolve(result);
                    return result;
                } catch (error) {
                    console.error("Error in filterCategories:", error);
                    setFilteredCategories([]);
                    resolve([]);
                    return [];
                }
            } else {
                // Categories are already loaded, just filter them
                let result = [...categories];
                
                // Filter by restaurant if provided
                if (restaurantId) {
                    result = result.filter(category => 
                        category.restaurantId && String(category.restaurantId) === String(restaurantId)
                    );
                }
                
                // Filter by branch if provided
                if (branchId) {
                    result = result.filter(category => 
                        !category.branchId || // Include categories without branch (shared across all branches)
                        String(category.branchId) === String(branchId) // Or match the specific branch
                    );
                }
                
                setFilteredCategories(result);
                resolve(result);
                return result;
            }
        });
    }, [categories, fetchCategories]);

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
            }
            
            // For Super_Admin, ensure they've selected a restaurant
            if (isSuperAdmin() && !dataToSend.restaurantId) {
                throw new Error('Please select a restaurant before creating a category');
            }
            
            // Ensure name is provided
            if (!dataToSend.name) {
                throw new Error('Category name is required');
            }
            
            const response = await axios.post('/api/categories', dataToSend, config);
            setCategories(prevCategories => [...prevCategories, response.data]);
            setFilteredCategories(prevFiltered => [...prevFiltered, response.data]);
            return response.data;
        } catch (error) {
            console.error('Error creating category:', error);
            throw error;
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
            filteredCategories,
            loading,
            error,
            fetchCategories,
            createCategory,
            updateCategory,
            deleteCategory,
            uploadImage,
            filterCategories
        }}>
            {children}
        </CategoryContext.Provider>
    );
};

export { CategoryContext, CategoryProvider };
export default CategoryProvider;