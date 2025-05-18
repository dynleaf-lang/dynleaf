import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

// Use environment variable for API base URL
const API_BASE_URL = process.env.BASE_API_URL || '/api/categories';

const CategoryContext = createContext();

const CategoryProvider = ({ children }) => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await axios.get(API_BASE_URL);
                setCategories(response.data);
            } catch (error) {
                console.error('Error fetching categories:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCategories();
    }, []);

    const addCategory = async (newCategory) => {
        try {
            const response = await axios.post(API_BASE_URL, newCategory);
            setCategories((prevCategories) => [...prevCategories, response.data]);
            return { success: true, data: response.data };
        } catch (error) {
            console.error('Error adding category:', error);
            return { success: false, error: error.response?.data || error.message };
        }
    };

    const updateCategory = async (id, updatedCategory) => {
        try {
            const response = await axios.put(`${API_BASE_URL}/${id}`, updatedCategory);
            setCategories((prevCategories) =>
                prevCategories.map((category) => (category._id === id ? response.data : category))
            );
            return { success: true, data: response.data };
        } catch (error) {
            console.error('Error updating category:', error);
            return { success: false, error: error.response?.data || error.message };
        }
    };

    const deleteCategory = async (id) => {
        try {
            await axios.delete(`${API_BASE_URL}/${id}`);
            setCategories((prevCategories) => prevCategories.filter((category) => category._id !== id));
            return { success: true };
        } catch (error) {
            console.error('Error deleting category:', error);
            return { success: false, error: error.response?.data || error.message };
        }
    };

    const contextValue = {
        categories,
        loading,
        addCategory,
        updateCategory,
        deleteCategory,
    };

    return (
        <CategoryContext.Provider value={contextValue}>
            {children}
        </CategoryContext.Provider>
    );
};

export { CategoryContext, CategoryProvider };
export default CategoryProvider;