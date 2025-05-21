import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

// Configure axios with base URL from environment variables
axios.defaults.baseURL = process.env.API_BASE_URL || 'http://localhost:5001';

// Setup axios interceptor for authentication
axios.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle 401/403 errors globally
axios.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // Only clear auth data for unauthorized responses that aren't caused by branch/restaurant permission issues
        if (error.response && (error.response.status === 401)) {
            console.error('Authentication error:', error.response.data);
            // Clear token and user data on unauthorized responses
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        } 
        // For 403 errors, we should NOT automatically log the user out
        // They might just be forbidden from accessing a specific resource
        else if (error.response && error.response.status === 403) {
            console.error('Permission error:', error.response.data);
            // Log the error but don't clear auth data
        }
        return Promise.reject(error);
    }
);

const AuthContext = createContext();

// Inactivity timeout in milliseconds (30 minutes)
const INACTIVITY_TIMEOUT = 30 * 60 * 1000;

const AuthProvider = ({ children }) => {
    // Initialize user state from localStorage to prevent losing state on refresh
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser) : null;
    });
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(() => localStorage.getItem('token'));
    const inactivityTimerRef = useRef(null);
    
    // Function to reset the inactivity timer
    const resetInactivityTimer = useCallback(() => {
        // Clear the existing timer if any
        if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current);
        }
        
        // Only set a new timer if the user is logged in
        if (token) {
            inactivityTimerRef.current = setTimeout(() => {
                console.log('User inactive for 30 minutes. Logging out...');
                // Use the logout function instead of directly manipulating localStorage
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setToken(null);
                setUser(null);
                // Redirect to login page
                window.location.href = '/auth/login';
            }, INACTIVITY_TIMEOUT);
        }
    }, [token]);
    
    // Setup event listeners for user activity
    useEffect(() => {
        // Array of events to listen for
        const activityEvents = [
            'mousedown', 'mousemove', 'keypress',
            'scroll', 'touchstart', 'click', 'keydown'
        ];
        
        // Event handler to reset the timer
        const handleUserActivity = () => {
            resetInactivityTimer();
        };
        
        // Add event listeners
        activityEvents.forEach(event => {
            document.addEventListener(event, handleUserActivity);
        });
        
        // Initialize the timer
        resetInactivityTimer();
        
        // Cleanup function
        return () => {
            // Remove event listeners
            activityEvents.forEach(event => {
                document.removeEventListener(event, handleUserActivity);
            });
            
            // Clear the timer
            if (inactivityTimerRef.current) {
                clearTimeout(inactivityTimerRef.current);
            }
        };
    }, [resetInactivityTimer]);
    
    // Effect to fetch user data from API if we have a token but no user data
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const storedToken = localStorage.getItem('token');
                const storedUser = localStorage.getItem('user');
                
                // No token = not logged in
                if (!storedToken) {
                    setLoading(false);
                    return;
                }
                
                // Set token state if it exists in localStorage but not in state
                if (storedToken && !token) {
                    setToken(storedToken);
                }
                
                // If we have both token and user data in localStorage, set them in state
                if (storedToken && storedUser) {
                    try {
                        const parsedUser = JSON.parse(storedUser);
                        
                        // Ensure the critical fields are present for non-Super_Admin users
                        if (parsedUser && parsedUser.role !== 'Super_Admin' && 
                            (parsedUser.restaurantId === undefined || parsedUser.restaurantId === null)) {
                            // Try to get updated user info from server since we're missing critical data
                            console.log('Missing restaurantId for non-Super_Admin user, fetching fresh data from server');
                            const response = await axios.get('/api/users/profile', {
                                headers: { 
                                    Authorization: `Bearer ${storedToken}`
                                }
                            });
                            const freshUserData = response.data.user || response.data;
                            localStorage.setItem('user', JSON.stringify(freshUserData));
                            setUser(freshUserData);
                        } else {
                            // User data has all the necessary fields
                            if (!user) {
                                setUser(parsedUser);
                            }
                        }
                    } catch (parseError) {
                        console.error('Error parsing stored user data:', parseError);
                        // Invalid JSON in localStorage, fetch fresh data
                        const response = await axios.get('/api/users/profile', {
                            headers: { 
                                Authorization: `Bearer ${storedToken}`
                            }
                        });
                        const userData = response.data.user || response.data;
                        localStorage.setItem('user', JSON.stringify(userData));
                        setUser(userData);
                    }
                    
                    setLoading(false);
                    return;
                }
                
                // If we have a token but no user data, fetch from API
                if (storedToken && !storedUser) {
                    const response = await axios.get('/api/users/profile', {
                        headers: { 
                            Authorization: `Bearer ${storedToken}`
                        }
                    });
                    const userData = response.data.user || response.data;
                    localStorage.setItem('user', JSON.stringify(userData));
                    setUser(userData);
                }
            } catch (error) {
                console.error('Error in auth check:', error);
                // Only clear token and user if it's an auth error (401)
                // For 403, we keep the user logged in as it's a permissions issue not an auth issue
                if (error.response && error.response.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    setToken(null);
                    setUser(null);
                }
            } finally {
                setLoading(false);
            }
        };
        
        fetchUser();
    }, []);
    
    // This effect ensures token and user are always in sync between state and localStorage
    useEffect(() => {
        // If token exists in state but not in localStorage, save it
        if (token && !localStorage.getItem('token')) {
            localStorage.setItem('token', token);
        }
        
        // If user exists in state but not in localStorage, save it
        if (user && !localStorage.getItem('user')) {
            localStorage.setItem('user', JSON.stringify(user));
        }
        
        // Reset inactivity timer when either token or user changes
        if (token && user) {
            resetInactivityTimer();
        }
    }, [token, user, resetInactivityTimer]);

    const login = async (credentials, navigate) => {
        try {
            const { email, password, rememberMe } = credentials;
            const response = await axios.post('/api/users/login', { email, password });
            const newToken = response.data.token;
            
            // Make sure userData includes all required fields
            const userData = {
                ...response.data.user,
                id: response.data.user.id,
                restaurantId: response.data.user.restaurantId || null,
                branchId: response.data.user.branchId || null
            };
            
            console.log('User login data:', {
                id: userData.id,
                role: userData.role,
                restaurantId: userData.restaurantId,
                branchId: userData.branchId
            });
            
            // For non-Super Admin users, verify they have required restaurant ID
            if (userData.role !== 'Super_Admin' && !userData.restaurantId) {
                console.error('Non-Super_Admin user with no restaurant assignment');
                
                // Return error but still set the token/user (they can still login
                // but will see a notification about missing restaurant assignment)
                localStorage.setItem('token', newToken);
                localStorage.setItem('user', JSON.stringify(userData));
                setToken(newToken);
                setUser(userData);
                
                if (navigate) {
                    navigate('/admin/index');
                }
                
                return { 
                    success: true, 
                    warning: 'Your account does not have a restaurant assigned. Some features may be limited.'
                };
            }
            
            // Store the token and user data in localStorage
            localStorage.setItem('token', newToken);
            localStorage.setItem('user', JSON.stringify(userData));
            
            // If rememberMe is true, store the email in localStorage
            if (rememberMe) {
                localStorage.setItem('rememberedEmail', email);
            } else {
                // If user unchecks "Remember Me", remove any previously saved email
                localStorage.removeItem('rememberedEmail');
            }
            
            setToken(newToken);
            setUser(userData);
            
            // Start the inactivity timer when logging in
            resetInactivityTimer();
            
            if (navigate) {
                navigate('/admin/index'); // Redirect to dashboard after login
            }
            return { success: true };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error };
        }
    };  

    const logout = async (navigate) => {
        try {
            // Clear the inactivity timer
            if (inactivityTimerRef.current) {
                clearTimeout(inactivityTimerRef.current);
                inactivityTimerRef.current = null;
            }
            
            // Remove both token and user data from localStorage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
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
                localStorage.setItem('user', JSON.stringify(response.data.user));
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
        // More robust check that prioritizes localStorage for persistent authentication
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        
        // First check localStorage (this is what persists across refreshes)
        if (storedToken && storedUser) {
            return true;
        }
        
        // Fallback to memory state if localStorage check fails
        return (user !== null && token !== null);
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
