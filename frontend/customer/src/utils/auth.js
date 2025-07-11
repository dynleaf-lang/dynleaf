// Simplified auth service using dummy token for offline mode
const authService = {
  // Get a dummy guest token without making API calls
  getGuestToken: async () => {
    // Check local storage for existing guest token
    const storedToken = localStorage.getItem('guestToken');
    if (storedToken) {
      return storedToken;
    }
    
    try {
      // Generate a dummy token (no API call needed)
      const dummyToken = `dummy_guest_token_${Math.random().toString(36).substring(2, 15)}`;
      
      // Save the token to local storage
      localStorage.setItem('guestToken', dummyToken);
      // Created dummy guest token for offline mode
      return dummyToken;
    } catch (error) {
      console.error('Failed to create dummy guest token:', error);
      throw new Error('Unable to create guest token. Please try again.');
    }
  },
  
  // Refresh guest token if needed
  refreshGuestToken: async () => {
    authService.clearGuestToken();
    return await authService.getGuestToken();
  },
  
  // Clear guest authentication
  clearGuestToken: () => {
    localStorage.removeItem('guestToken');
  }
};

export default authService;