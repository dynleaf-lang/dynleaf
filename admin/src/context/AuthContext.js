import React, { createContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// Configure axios with base URL from environment variables
axios.defaults.baseURL = process.env.REACT_APP_BASE_API_URL || 'http://localhost:5001';

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    
    useEffect(() => {
        const fetchUser = async () => {
        try {
            // Check for token in localStorage
            const storedToken = localStorage.getItem('token');
            
            if (!storedToken) {
                setLoading(false);
                return;
            }
            
            setToken(storedToken); // Set token in state
            
            // Use the profile endpoint instead of /api/auth/user
            const response = await axios.get('/api/users/profile', { 
                headers: { 
                    Authorization: `Bearer ${storedToken}` 
                }
            });
            
            setUser(response.data.user);
        } catch (error) {
            console.error('Error fetching user:', error);
            // Clear token if invalid
            localStorage.removeItem('token');
            setToken(null);
        } finally {
            setLoading(false);
        }
        };
    
        fetchUser();
    }, []);
    
    const login = async (credentials, navigate) => {
        try {
        const response = await axios.post('/api/users/login', credentials);
        const newToken = response.data.token;
        localStorage.setItem('token', newToken);
        setToken(newToken);
        setUser(response.data.user);
        if (navigate) {
            navigate('/admin/dashboard'); // Redirect to dashboard after login
        }
        return { success: true };
        } catch (error) {
        console.error('Login error:', error);
        return { success: false, error };
        }
    };  

    const logout = async (navigate) => {
        try {
        // Simply remove the token from localStorage
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        if (navigate) {
            navigate('/auth/login'); // Redirect to login after logout
        }
        return { success: true };
        } catch (error) {
        console.error('Logout error:', error);
        return { success: false, error };
        }
    };

    const register = async (userData, navigate) => {
        try {
            console.log('Sending registration data:', userData); // Log what we're sending
            const response = await axios.post('/api/users/register', userData);
            
            // If registration auto-logs in
            if (response.data.token) {
                const newToken = response.data.token;
                localStorage.setItem('token', newToken);
                setToken(newToken);
                setUser(response.data.user);
            }
            
            if (navigate) {
                navigate('/admin/dashboard'); // Redirect to dashboard after registration
            }
            
            return { 
                success: true,
                token: response.data.token,
                user: response.data.user
            };
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, error };
        }
    };

    const isAuthenticated = useCallback(() => {
        // Check for both user object and token
        return user !== null && token !== null;
    }, [user, token]);

    const isAdmin = useCallback(() => {
        return user && user.role === 'admin';
    }, [user]);  

    const isSuperAdmin = useCallback(() => {
        return user && user.role === 'Super_Admin';
    }, [user]);
    
    const isBranchManager = useCallback(() => {
        return user && user.role === 'Branch_Manager';
    }, [user]);

    const isKitchen = useCallback(() => {
        return user && user.role === 'Kitchen';
    }, [user]);  

    const isDelivery = useCallback(() => {
        return user && user.role === 'Delivery';
    }, [user]);

    const isPOSOperator = useCallback(() => {
        return user && user.role === 'POS_Operator';
    }, [user]);  

    const isAuthenticatedAndAuthorized = useCallback(() => {
        return isAuthenticated() && (isAdmin() || isSuperAdmin() || isBranchManager() || isKitchen() || isDelivery() || isPOSOperator());
    }, [isAuthenticated, isAdmin, isSuperAdmin, isBranchManager, isKitchen, isDelivery, isPOSOperator]);

    return (
        <AuthContext.Provider value={{ 
            user, 
            loading, 
            token,
            login, 
            logout, 
            register, 
            isAuthenticated, 
            isAdmin, 
            isSuperAdmin, 
            isBranchManager, 
            isKitchen, 
            isDelivery, 
            isPOSOperator, 
            isAuthenticatedAndAuthorized 
        }}>
        {children}
        </AuthContext.Provider>
    );
}

export { AuthContext, AuthProvider };
export default AuthProvider;
