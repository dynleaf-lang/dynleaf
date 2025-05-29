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
        // Handle account suspension - check for specific error code or message
        if (error.response && error.response.status === 401 && 
            error.response.data && error.response.data.reason === 'account_suspended') {
            // Dispatch a custom event for account suspension
            const suspendedEvent = new CustomEvent('accountSuspended', {
                detail: { message: error.response.data.message || 'Your account has been suspended by admin' }
            });
            window.dispatchEvent(suspendedEvent);
            return Promise.reject(error);
        }
        // Only clear auth data for unauthorized responses that aren't caused by branch/restaurant permission issues
        else if (error.response && (error.response.status === 401)) {
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
// Account status check interval (every 5 minutes)
const ACCOUNT_STATUS_CHECK_INTERVAL = 5 * 60 * 1000;

const AuthProvider = ({ children }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser) : null;
    });
    const [token, setToken] = useState(() => localStorage.getItem('token'));
    const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
    const [requiresVerification, setRequiresVerification] = useState(false);
    const [emailToVerify, setEmailToVerify] = useState('');
    const [isAccountSuspended, setIsAccountSuspended] = useState(false);
    const [suspensionMessage, setSuspensionMessage] = useState('');
    const inactivityTimerRef = useRef(null);
    const accountCheckTimerRef = useRef(null);
    
    // Listen for account suspension events
    useEffect(() => {
        const handleAccountSuspended = (event) => {
            console.log('Account suspended event received:', event.detail);
            setIsAccountSuspended(true);
            setSuspensionMessage(event.detail.message || 'Your account has been suspended by admin');
        };

        window.addEventListener('accountSuspended', handleAccountSuspended);
        
        return () => {
            window.removeEventListener('accountSuspended', handleAccountSuspended);
        };
    }, []);

    // Configure axios defaults
    useEffect(() => {
        // Set the Authorization header for all axios requests
        const token = localStorage.getItem('token');
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            delete axios.defaults.headers.common['Authorization'];
        }
    }, [token]);
    
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
                setIsAuthenticated(false);
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
                
                // Set token for upcoming requests
                axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
                
                // If we have both token and user data in localStorage, set them in state
                if (storedToken && storedUser) {
                    try {
                        const parsedUser = JSON.parse(storedUser);
                        
                        // Ensure the critical fields are present for all users
                        if (parsedUser && (
                            parsedUser.role !== 'Super_Admin' && 
                            (!parsedUser.restaurantId || !parsedUser.branchId)
                        )) {
                            // Try to get updated user info from server since we're missing critical data
                            console.log('Missing restaurant or branch ID, fetching fresh data from server');
                            const response = await axios.get('/api/users/profile', {
                                headers: { 
                                    Authorization: `Bearer ${storedToken}`
                                }
                            });
                            
                            // Ensure the user data has all required properties
                            const freshUserData = {
                                ...response.data.user || response.data,
                                restaurantId: response.data.user?.restaurantId || response.data?.restaurantId || null,
                                branchId: response.data.user?.branchId || response.data?.branchId || null
                            };
                            
                            console.log('Fresh user data from server:', {
                                id: freshUserData.id,
                                role: freshUserData.role,
                                restaurantId: freshUserData.restaurantId,
                                branchId: freshUserData.branchId
                            });
                            
                            localStorage.setItem('user', JSON.stringify(freshUserData));
                            setUser(freshUserData);
                        } else {
                            // User data has all the necessary fields
                            if (!user) {
                                console.log('Setting user from localStorage:', {
                                    id: parsedUser.id,
                                    role: parsedUser.role,
                                    restaurantId: parsedUser.restaurantId,
                                    branchId: parsedUser.branchId
                                });
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
                        const userData = {
                            ...response.data.user || response.data,
                            restaurantId: response.data.user?.restaurantId || response.data?.restaurantId || null,
                            branchId: response.data.user?.branchId || response.data?.branchId || null
                        };
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
                    const userData = {
                        ...response.data.user || response.data,
                        restaurantId: response.data.user?.restaurantId || response.data?.restaurantId || null,
                        branchId: response.data.user?.branchId || response.data?.branchId || null
                    };
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
            
            // Initial login to get token
            const loginResponse = await axios.post('/api/users/login', { email, password });
            const newToken = loginResponse.data.token;
            
            // Set token for upcoming requests
            axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
            
            // Fetch fresh user profile data to ensure we have the latest verification status
            const profileResponse = await axios.get('/api/users/profile', {
                headers: { 
                    Authorization: `Bearer ${newToken}`
                }
            });
            
            // Construct user data from profile response
            const userData = {
                ...profileResponse.data.user || profileResponse.data,
                id: profileResponse.data.user?.id || profileResponse.data?.id,
                restaurantId: profileResponse.data.user?.restaurantId || profileResponse.data?.restaurantId || null,
                branchId: profileResponse.data.user?.branchId || profileResponse.data?.branchId || null,
                isEmailVerified: profileResponse.data.user?.isEmailVerified || profileResponse.data?.isEmailVerified || false
            };
            
            console.log('Fresh user profile data after login:', {
                id: userData.id,
                role: userData.role,
                restaurantId: userData.restaurantId,
                branchId: userData.branchId,
                isEmailVerified: userData.isEmailVerified
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
            setIsAuthenticated(true);
            
            // Check if user email is verified
            if (!userData.isEmailVerified) {
                // Set verification state to trigger verification modal
                setRequiresVerification(true);
                setEmailToVerify(email);
                console.log('User email needs verification:', email);
            } else {
                // Ensure verification modals won't show for verified users
                setRequiresVerification(false);
                setEmailToVerify('');
                console.log('User email already verified:', email);
            }
            
            // Start the inactivity timer when logging in
            resetInactivityTimer();
            
            if (navigate) {
                navigate('/admin/index'); // Redirect to dashboard after login
            }
            return { 
                success: true,
                requiresVerification: !userData.isEmailVerified
            };
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
            
            // Reset suspension state
            setIsAccountSuspended(false);
            setSuspensionMessage('');
            
            // Remove both token and user data from localStorage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setToken(null);
            setUser(null);
            setIsAuthenticated(false);
            if (navigate) {
                navigate('/auth/login'); // Redirect to login after logout
            }
            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            return { success: false, error };
        }
    };

    const confirmAccountSuspension = async (navigate) => {
        setIsAccountSuspended(false);
        setSuspensionMessage('');
        return await logout(navigate);
    };

    const register = async (userData, navigate) => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.post('/api/users/register', userData);
            
            // Check if verification is required
            if (response.data.requiresVerification) {
                // Store information needed for verification
                setRequiresVerification(true);
                setEmailToVerify(userData.email);
                
                // Still save the token and user data so they can complete verification
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.user));
                setToken(response.data.token);
                setUser(response.data.user);
                setIsAuthenticated(true);
                
                // Show success message about verification
                alert('Registration successful! Please check your email for a verification code.');
                
                // Navigate to dashboard or verification page as needed
                if (navigate) {
                    navigate('/admin/index');
                }
                
                return {
                    success: true,
                    requiresVerification: true,
                    message: 'Registration successful! Please check your email for a verification code.'
                };
            } else {
                // Standard registration without verification
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.user));
                setToken(response.data.token);
                setUser(response.data.user);
                setIsAuthenticated(true);
                
                if (navigate) {
                    navigate('/admin/index');
                }
                
                return {
                    success: true,
                    message: 'Registration successful!'
                };
            }
        } catch (error) {
            console.error('Registration error:', error);
            setError(error.response?.data?.message || 'Registration failed');
            return {
                success: false,
                message: error.response?.data?.message || 'Registration failed'
            };
        } finally {
            setLoading(false);
        }
    };

    const verifyEmail = async (email, navigate) => {
        try {
            setLoading(true);
            setError(null);
            
            // Send verification email
            await axios.post('/api/users/verify-email', { email });
            
            setEmailToVerify(email);
            setRequiresVerification(true);
            
            return { success: true };
        } catch (error) {
            console.error('Error sending verification email:', error);
            setError('Failed to send verification email. Please try again later.');
            return { success: false, error: error };
        } finally {
            setLoading(false);
        }
    };

    const confirmVerification = async (otp) => {
        try {
            setLoading(true);
            setError(null);
            
            const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
            
            // Confirm the email verification
            const response = await axios.post(`${apiUrl}/api/users/confirm-verification`, { otp });
             
            // Get fresh user data from the server to ensure verification status is accurate
            const profileResponse = await axios.get('/api/users/profile', {
                headers: { 
                    Authorization: `Bearer ${token}`
                }
            });
            
            // Use the server response data for the updated user
            const freshUserData = profileResponse.data.user || profileResponse.data;
            
            // Update user in state and localStorage with the fresh data from server
            localStorage.setItem('user', JSON.stringify(freshUserData));
            setUser(freshUserData);
            
            // Reset verification states to prevent further popups
            setRequiresVerification(false);
            setEmailToVerify('');
            
            console.log('Email verification successful - user data updated from server');
            
            return { success: true };
        } catch (error) {
            console.error('Verification error:', error);
            return { 
                success: false, 
                error: error
            };
        } finally {
            setLoading(false);
        }
    };

    const resendVerificationEmail = async (email) => {
        try {
            setLoading(true);
            setError(null);
            
            const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
            
            // Send verification email
            await axios.post(`${apiUrl}/api/users/resend-otp`, { email });
            
            return { success: true };
        } catch (error) {
            console.error('Error resending verification email:', error);
            return { 
                success: false, 
                error: error
            };
        } finally {
            setLoading(false);
        }
    };

    // Add a function to force refresh the user verification status from API
    const forceRefreshVerificationStatus = async () => {
        try {
            // Only attempt if we have token and user
            if (!token || !user) return false;
            
            console.log('Force refreshing user verification status');
            const response = await axios.get('/api/users/profile', {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const freshUserData = response.data.user || response.data;
            
            console.log('Server response for user verification status:', 
                       { isEmailVerified: freshUserData.isEmailVerified });
                
            // Update user with fresh data from server
            setUser(freshUserData);
            
            // Update localStorage with fresh server data
            localStorage.setItem('user', JSON.stringify(freshUserData));
            
            // Update verification flags based on server response
            if (freshUserData.isEmailVerified) {
                setRequiresVerification(false);
                setEmailToVerify('');
            } else if (freshUserData.email) {
                setEmailToVerify(freshUserData.email);
            }
            
            return freshUserData.isEmailVerified;
        } catch (error) {
            console.error('Error refreshing verification status:', error);
            return false;
        }
    };
    
    // Add an effect to check verification status on load
    useEffect(() => {
        // Only check if we have a user who might need verification
        if (user && token) {
            forceRefreshVerificationStatus();
        }
    }, [token, user?.id]);

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
        return isAuthenticated && (isAdmin() || isSuperAdmin() || isBranchManager() || isKitchen() || isDelivery() || isPOSOperator());
    }, [isAuthenticated, isAdmin, isSuperAdmin, isBranchManager, isKitchen, isDelivery, isPOSOperator]);

    // Listen for user data refresh events from UserContext
    useEffect(() => {
        const handleUserDataRefreshed = (event) => {
            if (event.detail && event.detail.user) {
                const refreshedUserData = event.detail.user;
                console.log('User data refreshed event received:', refreshedUserData);
                
                // Update user data in state
                setUser(refreshedUserData);
                
                // If the user is now verified, clear verification flags
                if (refreshedUserData.isEmailVerified) {
                    setRequiresVerification(false);
                    setEmailToVerify('');
                }
            }
        };

        window.addEventListener('userDataRefreshed', handleUserDataRefreshed);
        
        return () => {
            window.removeEventListener('userDataRefreshed', handleUserDataRefreshed);
        };
    }, []);

    // Periodic account status check
    useEffect(() => {
        // Function to check if user account is still active
        const checkAccountStatus = async () => {
            try {
                const storedToken = localStorage.getItem('token');
                const storedUser = localStorage.getItem('user');
                
                // Only check if user is logged in
                if (storedToken && storedUser) {
                    console.log('Performing periodic account status check');
                    await axios.get('/api/users/account-status', {
                        headers: { 
                            Authorization: `Bearer ${storedToken}`
                        }
                    });
                    // If request succeeds, account is still active
                }
            } catch (error) {
                console.log('Account status check error:', error.response?.data);
                // If error response indicates account suspension, trigger the suspension event
                if (error.response && error.response.status === 401 && 
                    error.response.data && error.response.data.reason === 'account_suspended') {
                    const suspendedEvent = new CustomEvent('accountSuspended', {
                        detail: { message: error.response.data.message || 'Your account has been suspended by admin' }
                    });
                    window.dispatchEvent(suspendedEvent);
                }
            }
        };

        // Start the account check timer
        if (token && user) {
            // Perform initial check
            checkAccountStatus();
            
            // Set up periodic checks
            accountCheckTimerRef.current = setInterval(checkAccountStatus, ACCOUNT_STATUS_CHECK_INTERVAL);
        }

        // Cleanup function
        return () => {
            if (accountCheckTimerRef.current) {
                clearInterval(accountCheckTimerRef.current);
            }
        };
    }, [token, user]);

    return (
        <AuthContext.Provider value={{ 
            user, 
            loading, 
            token,
            login, 
            logout, 
            register, 
            verifyEmail,
            confirmVerification,
            resendVerificationEmail,
            isAuthenticated, 
            isAdmin, 
            isSuperAdmin, 
            isBranchManager, 
            isKitchen, 
            isDelivery, 
            isPOSOperator, 
            isAuthenticatedAndAuthorized,
            requiresVerification,
            emailToVerify,
            isAccountSuspended,
            suspensionMessage,
            confirmAccountSuspension
        }}>
        {children}
        </AuthContext.Provider>
    );
}

export { AuthContext, AuthProvider };
export default AuthProvider;
