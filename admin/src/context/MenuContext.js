import React, { createContext, useState, useEffect, useCallback, useContext, useRef } from 'react';
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
    
    // Keep track of the last filter to prevent unnecessary rerenders
    const lastFilterRef = useRef({});
    
    // Compare if two filter objects are equal
    const areFiltersEqual = (a, b) => {
        if (!a || !b) return false;
        
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        
        // If _timestamp is included, treat filters as different to force refresh
        if (a._timestamp || b._timestamp) return false;
        
        // Check if key counts match (ignoring _timestamp)
        const filteredKeysA = keysA.filter(k => k !== '_timestamp');
        const filteredKeysB = keysB.filter(k => k !== '_timestamp');
        
        if (filteredKeysA.length !== filteredKeysB.length) return false;
        
        // Compare each key value
        return filteredKeysA.every(key => {
            if (key === 'sortOrder' || key === 'sortBy') {
                // Special handling for sorting parameters which might be undefined or have default values
                const valueA = a[key] || (key === 'sortOrder' ? 'asc' : 'name');
                const valueB = b[key] || (key === 'sortOrder' ? 'asc' : 'name');
                return valueA === valueB;
            }
            
            // Handle search differently - treat empty strings and undefined as equal
            if (key === 'search') {
                const searchA = a[key] || '';
                const searchB = b[key] || '';
                return searchA === searchB;
            }
            
            return a[key] === b[key];
        });
    };

    // Function to fetch all menu items with optional restaurant and branch filters
    const fetchMenuItems = useCallback(async (filters = {}) => {
        // Check if the filters are the same as last time - if so, don't refetch
        if (areFiltersEqual(lastFilterRef.current, filters) && menuItems.length > 0) {
            return menuItems;
        }
        
        // Update last filter reference
        lastFilterRef.current = {...filters};
        
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
            
            // For non-Super_Admin users, automatically filter by their assigned restaurant and branch
            if (user && !isSuperAdmin()) {
                if (user.restaurantId) {
                    config.params.restaurantId = user.restaurantId;
                }
                
                if (user.branchId) {
                    config.params.branchId = user.branchId;
                }
            }
            // Add restaurant filter if provided in filters (only for Super_Admin)
            else if (filters.restaurantId) {
                config.params.restaurantId = filters.restaurantId;
            }
            
            // Add branch filter if provided in filters (only for Super_Admin)
            if (isSuperAdmin() && filters.branchId) {
                config.params.branchId = filters.branchId;
            }
            
            // Add category filter if provided
            if (filters.categoryId) {
                config.params.categoryId = filters.categoryId;
            }
            
            // Add search query if provided
            if (filters.search) {
                config.params.search = filters.search;
            }
            
            // Add pagination parameters if provided
            if (filters.page) {
                config.params.page = filters.page;
            }
            
            if (filters.limit) {
                config.params.limit = filters.limit;
            }
            
            // Add sorting parameters if provided
            if (filters.sortBy) {
                config.params.sortBy = filters.sortBy;
                config.params.sortOrder = filters.sortOrder || 'asc';
            }
            
            const response = await axios.get(MENU_ENDPOINT, config); 
            
            // The backend now filters based on user's restaurant and branch if specified
            const responseData = Array.isArray(response.data) ? response.data : [];
            
            // Set menu items from response data
            setMenuItems(responseData);
            try { console.log('MenuContext: fetched menu items:', Array.isArray(responseData) ? responseData.length : 0); } catch (_) {}
            
            return responseData;
        } catch (error) {
            console.error('Error fetching menu items:', error);
            setError(error.response?.data?.message || error.message);
            setMenuItems([]);
            return [];
        } finally {
            setLoading(false);
        }
    }, [token, user, isSuperAdmin]); // Added user and isSuperAdmin to dependencies

    // Fetch menu items when the component mounts or token changes
    useEffect(() => {
        if (token) {
            // Only fetch menu items once when the token is available
            const initializeMenuItems = async () => {
                await fetchMenuItems({});
            };
            initializeMenuItems();
        }
    }, [token]); // eslint-disable-line react-hooks/exhaustive-deps
    
    // Upload image function with improved FormData handling
    const uploadImage = async (imageFile) => {
        try {
            if (!imageFile) {
                console.error('No file provided to uploadImage function');
                return { 
                    success: false, 
                    error: { message: 'No file to upload' } 
                };
            }
            
            console.log("Creating FormData for file upload");
            const formData = new FormData();
            
            // Use 'image' field name to match what the backend expects in uploadRoutes.js
            formData.append('image', imageFile);
            
            // Add extra metadata to help with debugging
            formData.append('name', imageFile.name.split('.')[0] || 'item');
            formData.append('timestamp', Date.now().toString());
            
            console.log("File details:", {
                name: imageFile.name,
                type: imageFile.type,
                size: `${(imageFile.size / 1024).toFixed(2)} KB`
            });
            
            // IMPORTANT: Do NOT set Content-Type header when uploading files
            const config = {};
            
            // Only add authorization header if we have a token
            if (token) {
                config.headers = {
                    'Authorization': `Bearer ${token}`
                };
            }
            
            // Log axios request configuration
            console.log(`Sending request to ${UPLOAD_ENDPOINT}`);
            console.log("Request config:", JSON.stringify(config));
            
            // Use XMLHttpRequest directly for more control over the upload
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                
                xhr.open('POST', UPLOAD_ENDPOINT, true);
                
                // Add authorization header if token exists
                if (token) {
                    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                }
                
                xhr.onload = function() {
                    if (this.status >= 200 && this.status < 300) {
                        try {
                            const response = JSON.parse(this.response);
                            console.log("Upload response:", response);
                            resolve({ success: true, data: response });
                        } catch (error) {
                            console.error("Error parsing response:", error);
                            reject({ 
                                success: false, 
                                error: { message: 'Failed to parse server response' } 
                            });
                        }
                    } else {
                        console.error("Upload failed with status:", this.status);
                        try {
                            const errorResponse = JSON.parse(this.response);
                            reject({ 
                                success: false, 
                                error: errorResponse || { message: `Upload failed with status ${this.status}` }
                            });
                        } catch (e) {
                            reject({ 
                                success: false, 
                                error: { message: `Upload failed with status ${this.status}` } 
                            });
                        }
                    }
                };
                
                xhr.onerror = function() {
                    console.error("Network error during upload");
                    reject({ 
                        success: false, 
                        error: { message: 'Network error during upload' } 
                    });
                };
                
                xhr.upload.onprogress = function(e) {
                    if (e.lengthComputable) {
                        const percentComplete = (e.loaded / e.total) * 100;
                        console.log(`Upload progress: ${percentComplete.toFixed(2)}%`);
                    }
                };
                
                // Send the FormData object
                xhr.send(formData);
            });
        } catch (error) {
            console.error('Error in uploadImage:', error);
            return { 
                success: false, 
                error: { message: error.message || 'Upload failed' } 
            };
        }
    };

    // Upload multiple images at once
    const uploadMultipleImages = async (imageFiles) => {
        try {
            const uploadPromises = imageFiles.map(file => uploadImage(file));
            const results = await Promise.allSettled(uploadPromises);
            
            const successful = results
                .filter(result => result.status === 'fulfilled' && result.value.success)
                .map(result => result.value.data);
                
            const failed = results
                .filter(result => result.status === 'rejected' || !result.value.success)
                .map(result => result.status === 'rejected' ? result.reason : result.value.error);
                
            return { 
                success: failed.length === 0,
                successful,
                failed,
                totalSuccess: successful.length,
                totalFailed: failed.length
            };
        } catch (error) {
            console.error('Error in bulk image upload:', error);
            return { 
                success: false, 
                error: error.message,
                successful: [],
                failed: [error],
                totalSuccess: 0,
                totalFailed: 1
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
    
    // Bulk add menu items from array
    const bulkAddMenuItems = async (items) => {
        try {
            const config = token ? {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            } : {};
            
            // Ensure all items have restaurant ID if user is Super_Admin
            const preparedItems = items.map(item => {
                if (isSuperAdmin() && !item.restaurantId) {
                    return {...item, restaurantId: DEFAULT_RESTAURANT_ID};
                }
                return item;
            });
            
            const response = await axios.post(`${MENU_ENDPOINT}/bulk`, preparedItems, config);
            
            if (response.data.success) {
                // Add all successfully created items to the state
                setMenuItems(prevItems => [...prevItems, ...response.data.items]);
            }
            
            return response.data;
        } catch (error) {
            console.error('Error in bulk adding menu items:', error);
            return { 
                success: false, 
                error: error.response?.data || error.message,
                itemsAdded: 0
            };
        }
    };

    // Import menu items from Excel/CSV
    const importMenuItems = async (file, options = {}) => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            // Add import options
            if (options.restaurantId) formData.append('restaurantId', options.restaurantId);
            if (options.branchId) formData.append('branchId', options.branchId);
            if (options.overwrite !== undefined) formData.append('overwrite', options.overwrite);
            
            // Important: Do NOT set Content-Type manually; let the browser add the multipart boundary
            const config = token ? {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            } : {};
            
            // Lightweight debug: list appended form keys (values not logged for privacy)
            try {
                const keys = [];
                // FormData iteration is supported in browsers
                for (const [k] of formData.entries()) keys.push(k);
                console.log('POST', `${MENU_ENDPOINT}/import`, 'FormData keys:', keys);
            } catch (_) {}
            
            // Use XMLHttpRequest for reliable multipart upload (mirrors uploadImage approach)
            const result = await new Promise((resolve) => {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', `${MENU_ENDPOINT}/import`, true);
                if (token) {
                    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                }
                xhr.onload = async function () {
                    try {
                        const data = JSON.parse(this.response || '{}');
                        if (this.status >= 200 && this.status < 300) {
                            // Refresh menu after successful import
                            if (data.success) {
                                try { await fetchMenuItems(); } catch (_) {}
                            }
                            resolve(data);
                        } else {
                            resolve({ success: false, error: data?.message || `Import failed with status ${this.status}` });
                        }
                    } catch (e) {
                        resolve({ success: false, error: `Import response parse error: ${e.message}` });
                    }
                };
                xhr.onerror = function () {
                    resolve({ success: false, error: 'Network error during import upload' });
                };
                xhr.send(formData);
            });
            
            return result;
        } catch (error) {
            console.error('Error importing menu items:', error);
            // Normalize error into a user-friendly string
            const errData = error?.response?.data;
            const message = typeof errData === 'string'
                ? errData
                : (errData?.message || error.message || 'An error occurred while importing');
            return {
                success: false,
                error: message
            };
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
    
    // Bulk update menu items for a specific property
    const bulkUpdateMenuItems = async (itemIds, updateData) => {
        try {
            const config = token ? {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            } : {};
            
            const response = await axios.put(`${MENU_ENDPOINT}/bulk`, 
                { itemIds, updateData }, 
                config
            );
            
            if (response.data.success) {
                // Update the local state if the update was successful
                setMenuItems(prevItems => {
                    return prevItems.map(item => {
                        if (itemIds.includes(item._id)) {
                            return { ...item, ...updateData };
                        }
                        return item;
                    });
                });
            }
            
            return response.data;
        } catch (error) {
            console.error('Error in bulk updating menu items:', error);
            return { 
                success: false, 
                error: error.response?.data || error.message 
            };
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
            const response = await axios.delete(`${MENU_ENDPOINT}/${id}`, config);
            
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
            return { success: true, data: response.data };
        } catch (error) {
            console.error('Error deleting menu item:', error);
            
            // Improved access denied error detection
            if (error.response?.status === 403 || 
                error.response?.data?.message?.toLowerCase().includes('access denied') ||
                error.message?.toLowerCase().includes('access denied')) {
                return { 
                    success: false, 
                    error: { 
                        message: 'Access denied: You do not have permission to delete this menu item.',
                        accessDenied: true,
                        details: error.response?.data || error.message
                    }
                };
            }
            
            // Handle other error types
            return { 
                success: false, 
                error: error.response?.data || { message: error.message || 'Failed to delete menu item' }
            };
        }
    };
    
    // Bulk delete menu items
    const bulkDeleteMenuItems = async (itemIds) => {
        try {
            const config = token ? {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            } : {};
            
            const response = await axios.post(`${MENU_ENDPOINT}/bulk-delete`, 
                { itemIds }, 
                config
            );
            
            if (response.data.success) {
                // Update local state to remove deleted items
                setMenuItems(prevItems => 
                    prevItems.filter(item => !itemIds.includes(item._id))
                );
            }
            
            return response.data;
        } catch (error) {
            console.error('Error in bulk deleting menu items:', error);
            return { 
                success: false, 
                error: error.response?.data || error.message 
            };
        }
    };

    // Export menu items to Excel/CSV
    const exportMenuItems = async (filters = {}, format = 'excel') => {
        try {
            const config = token ? {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                params: { ...filters, format },
                responseType: 'blob'
            } : {};
            
            // Log the export attempt
            console.log(`Attempting to export menu items in ${format} format with filters:`, filters);
            
            const response = await axios.get(`${MENU_ENDPOINT}/export`, config);
            
            // Check if response data is a blob and has size
            if (!response.data || response.data.size === 0) {
                throw new Error('Received empty data from server');
            }
            
            // Check if the response is an error message disguised as a blob
            // This could happen if the server returns an error with the wrong content type
            if (response.data.type === 'application/json') {
                const reader = new FileReader();
                const errorPromise = new Promise((resolve, reject) => {
                    reader.onload = () => {
                        try {
                            const errorJSON = JSON.parse(reader.result);
                            reject(new Error(errorJSON.message || 'Export failed'));
                        } catch (e) {
                            reject(new Error('Unknown error during export'));
                        }
                    };
                    reader.onerror = () => reject(new Error('Failed to read error response'));
                });
                reader.readAsText(response.data);
                await errorPromise;
                return; // This will never be reached due to the reject above
            }
            
            // Create a download link and trigger it
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const extension = format === 'csv' ? 'csv' : 'xlsx';
            link.setAttribute('download', `menu-items-${new Date().toISOString().slice(0,10)}.${extension}`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up the object URL
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
            }, 100);
            
            return { success: true };
        } catch (error) {
            console.error('Error exporting menu items:', error);
            
            // Handle axios error response that might contain error details
            if (error.response) {
                // Try to extract a readable error message if available
                const errorData = error.response.data;
                
                if (errorData instanceof Blob) {
                    try {
                        // Try to read the blob as text and parse it if it contains JSON
                        const text = await errorData.text();
                        try {
                            const json = JSON.parse(text);
                            return { success: false, error: json.message || 'Export failed' };
                        } catch (e) {
                            return { success: false, error: text || 'Export failed' };
                        }
                    } catch (e) {
                        return { success: false, error: 'Unable to process server response' };
                    }
                } else if (errorData && (errorData.message || errorData.error)) {
                    return { success: false, error: errorData.message || errorData.error };
                }
                
                return { 
                    success: false, 
                    error: `Server error: ${error.response.status} ${error.response.statusText}` 
                };
            }
            
            return { 
                success: false, 
                error: error.message || 'Failed to export menu items' 
            };
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

    // Use a stable reference to the context value to prevent unnecessary rerenders
    const contextValue = React.useMemo(() => ({
        menuItems,
        loading,
        error,
        fetchMenuItems,
        getMenuItemsByBranch,
        addMenuItem,
        updateMenuItem,
        deleteMenuItem,
        uploadImage,
        uploadMultipleImages,
        bulkAddMenuItems,
        bulkUpdateMenuItems,
        bulkDeleteMenuItems,
        importMenuItems,
        exportMenuItems,
        DEFAULT_RESTAURANT_ID
    }), [
        menuItems, 
        loading, 
        error, 
        fetchMenuItems, 
        addMenuItem, 
        updateMenuItem, 
        deleteMenuItem, 
        uploadImage, 
        uploadMultipleImages, 
        bulkAddMenuItems, 
        bulkUpdateMenuItems,
        bulkDeleteMenuItems,
        importMenuItems,
        exportMenuItems,
        getMenuItemsByBranch
    ]);

    return (
        <MenuContext.Provider value={contextValue}>
            {children}
        </MenuContext.Provider>
    );
};

export { MenuContext, MenuProvider };
export default MenuProvider;
