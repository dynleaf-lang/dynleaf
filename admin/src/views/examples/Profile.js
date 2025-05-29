// reactstrap components
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  FormGroup,
  Form,
  Input,
  Container,
  Row,
  Col,
  Alert,
  Spinner,
  Modal,
  ModalHeader,
  ModalBody,
  Label
} from "reactstrap";
// core components
import UserHeader from "components/Headers/UserHeader.js";
import { useContext, useState, useEffect, useRef, use } from "react";
import { AuthContext } from "../../context/AuthContext";
import { UserContext } from "../../context/UserContext"; // Import UserContext
import EmailVerificationModal from "../../components/Modals/EmailVerificationModal";
import axios from "axios";



// Country list data
const countries = [
  { code: "AF", name: "Afghanistan" },
  { code: "AL", name: "Albania" },
  { code: "DZ", name: "Algeria" },
  { code: "AD", name: "Andorra" },
  { code: "AO", name: "Angola" },
  { code: "AG", name: "Antigua and Barbuda" },
  { code: "AR", name: "Argentina" },
  { code: "AM", name: "Armenia" },
  { code: "AU", name: "Australia" },
  { code: "AT", name: "Austria" },
  { code: "AZ", name: "Azerbaijan" },
  { code: "BS", name: "Bahamas" },
  { code: "BH", name: "Bahrain" },
  { code: "BD", name: "Bangladesh" },
  { code: "BB", name: "Barbados" },
  { code: "BY", name: "Belarus" },
  { code: "BE", name: "Belgium" },
  { code: "BZ", name: "Belize" },
  { code: "BJ", name: "Benin" },
  { code: "BT", name: "Bhutan" },
  { code: "BO", name: "Bolivia" },
  { code: "BA", name: "Bosnia and Herzegovina" },
  { code: "BW", name: "Botswana" },
  { code: "BR", name: "Brazil" },
  { code: "BN", name: "Brunei" },
  { code: "BG", name: "Bulgaria" },
  { code: "BF", name: "Burkina Faso" },
  { code: "BI", name: "Burundi" },
  { code: "CV", name: "Cabo Verde" },
  { code: "KH", name: "Cambodia" },
  { code: "CM", name: "Cameroon" },
  { code: "CA", name: "Canada" },
  { code: "CF", name: "Central African Republic" },
  { code: "TD", name: "Chad" },
  { code: "CL", name: "Chile" },
  { code: "CN", name: "China" },
  { code: "CO", name: "Colombia" },
  { code: "KM", name: "Comoros" },
  { code: "CD", name: "Congo, Democratic Republic of the" },
  { code: "CG", name: "Congo, Republic of the" },
  { code: "CR", name: "Costa Rica" },
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "HR", name: "Croatia" },
  { code: "CU", name: "Cuba" },
  { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czech Republic" },
  { code: "DK", name: "Denmark" },
  { code: "DJ", name: "Djibouti" },
  { code: "DM", name: "Dominica" },
  { code: "DO", name: "Dominican Republic" },
  { code: "EC", name: "Ecuador" },
  { code: "EG", name: "Egypt" },
  { code: "SV", name: "El Salvador" },
  { code: "GQ", name: "Equatorial Guinea" },
  { code: "ER", name: "Eritrea" },
  { code: "EE", name: "Estonia" },
  { code: "ET", name: "Ethiopia" },
  { code: "FJ", name: "Fiji" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "GA", name: "Gabon" },
  { code: "GM", name: "Gambia" },
  { code: "GE", name: "Georgia" },
  { code: "DE", name: "Germany" },
  { code: "GH", name: "Ghana" },
  { code: "GR", name: "Greece" },
  { code: "GD", name: "Grenada" },
  { code: "GT", name: "Guatemala" },
  { code: "GN", name: "Guinea" },
  { code: "GW", name: "Guinea-Bissau" },
  { code: "GY", name: "Guyana" },
  { code: "HT", name: "Haiti" },
  { code: "HN", name: "Honduras" },
  { code: "HU", name: "Hungary" },
  { code: "IS", name: "Iceland" },
  { code: "IN", name: "India" },
  { code: "ID", name: "Indonesia" },
  { code: "IR", name: "Iran" },
  { code: "IQ", name: "Iraq" },
  { code: "IE", name: "Ireland" },
  { code: "IL", name: "Israel" },
  { code: "IT", name: "Italy" },
  { code: "JM", name: "Jamaica" },
  { code: "JP", name: "Japan" },
  { code: "JO", name: "Jordan" },
  { code: "KZ", name: "Kazakhstan" },
  { code: "KE", name: "Kenya" },
  { code: "KI", name: "Kiribati" },
  { code: "KP", name: "Korea, North" },
  { code: "KR", name: "Korea, South" },
  { code: "KW", name: "Kuwait" },
  { code: "KG", name: "Kyrgyzstan" },
  { code: "LA", name: "Laos" },
  { code: "LV", name: "Latvia" },
  { code: "LB", name: "Lebanon" },
  { code: "LS", name: "Lesotho" },
  { code: "LR", name: "Liberia" },
  { code: "LY", name: "Libya" },
  { code: "LI", name: "Liechtenstein" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "MK", name: "Macedonia" },
  { code: "MG", name: "Madagascar" },
  { code: "MW", name: "Malawi" },
  { code: "MY", name: "Malaysia" },
  { code: "MV", name: "Maldives" },
  { code: "ML", name: "Mali" },
  { code: "MT", name: "Malta" },
  { code: "MH", name: "Marshall Islands" },
  { code: "MR", name: "Mauritania" },
  { code: "MU", name: "Mauritius" },
  { code: "MX", name: "Mexico" },
  { code: "FM", name: "Micronesia" },
  { code: "MD", name: "Moldova" },
  { code: "MC", name: "Monaco" },
  { code: "MN", name: "Mongolia" },
  { code: "ME", name: "Montenegro" },
  { code: "MA", name: "Morocco" },
  { code: "MZ", name: "Mozambique" },
  { code: "MM", name: "Myanmar" },
  { code: "NA", name: "Namibia" },
  { code: "NR", name: "Nauru" },
  { code: "NP", name: "Nepal" },
  { code: "NL", name: "Netherlands" },
  { code: "NZ", name: "New Zealand" },
  { code: "NI", name: "Nicaragua" },
  { code: "NE", name: "Niger" },
  { code: "NG", name: "Nigeria" },
  { code: "NO", name: "Norway" },
  { code: "OM", name: "Oman" },
  { code: "PK", name: "Pakistan" },
  { code: "PW", name: "Palau" },
  { code: "PS", name: "Palestine" },
  { code: "PA", name: "Panama" },
  { code: "PG", name: "Papua New Guinea" },
  { code: "PY", name: "Paraguay" },
  { code: "PE", name: "Peru" },
  { code: "PH", name: "Philippines" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "QA", name: "Qatar" },
  { code: "RO", name: "Romania" },
  { code: "RU", name: "Russia" },
  { code: "RW", name: "Rwanda" },
  { code: "KN", name: "Saint Kitts and Nevis" },
  { code: "LC", name: "Saint Lucia" },
  { code: "VC", name: "Saint Vincent and the Grenadines" },
  { code: "WS", name: "Samoa" },
  { code: "SM", name: "San Marino" },
  { code: "ST", name: "Sao Tome and Principe" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "SN", name: "Senegal" },
  { code: "RS", name: "Serbia" },
  { code: "SC", name: "Seychelles" },
  { code: "SL", name: "Sierra Leone" },
  { code: "SG", name: "Singapore" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "SB", name: "Solomon Islands" },
  { code: "SO", name: "Somalia" },
  { code: "ZA", name: "South Africa" },
  { code: "SS", name: "South Sudan" },
  { code: "ES", name: "Spain" },
  { code: "LK", name: "Sri Lanka" },
  { code: "SD", name: "Sudan" },
  { code: "SR", name: "Suriname" },
  { code: "SZ", name: "Swaziland" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "SY", name: "Syria" },
  { code: "TW", name: "Taiwan" },
  { code: "TJ", name: "Tajikistan" },
  { code: "TZ", name: "Tanzania" },
  { code: "TH", name: "Thailand" },
  { code: "TL", name: "Timor-Leste" },
  { code: "TG", name: "Togo" },
  { code: "TO", name: "Tonga" },
  { code: "TT", name: "Trinidad and Tobago" },
  { code: "TN", name: "Tunisia" },
  { code: "TR", name: "Turkey" },
  { code: "TM", name: "Turkmenistan" },
  { code: "TV", name: "Tuvalu" },
  { code: "UG", name: "Uganda" },
  { code: "UA", name: "Ukraine" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "UY", name: "Uruguay" },
  { code: "UZ", name: "Uzbekistan" },
  { code: "VU", name: "Vanuatu" },
  { code: "VA", name: "Vatican City" },
  { code: "VE", name: "Venezuela" },
  { code: "VN", name: "Vietnam" },
  { code: "YE", name: "Yemen" },
  { code: "ZM", name: "Zambia" },
  { code: "ZW", name: "Zimbabwe" }
];

// Default country value
const DEFAULT_COUNTRY = "IN";

const Profile = () => {
  // Get user from AuthContext instead of UserContext
  const { token, verifyEmail, user } = useContext(AuthContext); 
  const { isEmailVerified } = useContext(UserContext); // Get isEmailVerified from UserContext
  
  
  
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    country: DEFAULT_COUNTRY, // Set default country to India
    postalCode: "",
    aboutMe: ""
  });

  const [alert, setAlert] = useState({
    show: false,
    color: "",
    message: ""
  });

  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [restaurantName, setRestaurantName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [forgotPasswordStep, setForgotPasswordStep] = useState(1); // 1: Enter email, 2: Enter OTP, 3: Enter new password
  const [forgotPasswordData, setForgotPasswordData] = useState({
    email: "",
    otp: "",
    newPassword: "",
    confirmPassword: ""
  });
  const fileInputRef = useRef(null);
   
  console.log("User data from AuthContext:", user);
  

  // Use refs to track if we've already fetched names to prevent infinite loops
  const restaurantFetched = useRef(false);
  const branchFetched = useRef(false);
  
  // Reset fetch flags when user/IDs change
  useEffect(() => {
    if (user) {
      restaurantFetched.current = false;
      branchFetched.current = false;
    }
  }, [user?.id, user?.restaurantId, user?.branchId]);

  // Load user data into form when component mounts
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || "",
        email: user.email || "",
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        address: user.address || "",
        city: user.city || "",
        country: user.country || DEFAULT_COUNTRY, // Use India as default if no country is set
        postalCode: user.postalCode || "",
        aboutMe: user.aboutMe || ""
      });
      setProfilePhoto(user.profilePhoto || "");
    }
  }, [user]);
  
  // Fetch restaurant name once
  useEffect(() => {
    const fetchRestaurantName = async () => {
      // Only fetch if we have a user with restaurantId and haven't fetched yet
      if (user?.restaurantId && !restaurantFetched.current) {
        try {
          restaurantFetched.current = true; // Mark as fetched to prevent repeated calls
          const response = await axios.get(`/api/restaurants/${user.restaurantId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (response?.data?.name) {
            setRestaurantName(response.data.name);
          }
        } catch (error) {
          console.error("Error fetching restaurant:", error);
        }
      }
    };
    
    fetchRestaurantName();
  }, [user?.restaurantId, token]);
  
  // Fetch branch name once (separate effect to avoid dependencies between fetches)
  useEffect(() => {
    const fetchBranchName = async () => {
      // Only fetch if we have a user with branchId and haven't fetched yet
      if (user?.branchId && !branchFetched.current) {
        try {
          branchFetched.current = true; // Mark as fetched to prevent repeated calls
          const response = await axios.get(`/api/branches/${user.branchId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (response?.data?.name) {
            setBranchName(response.data.name);
          }
        } catch (error) {
          console.error("Error fetching branch:", error);
        }
      }
    };
    
    fetchBranchName();
  }, [user?.branchId, token]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Initialize fileInputRef with a direct element creation if needed
  useEffect(() => {
    // Ensure the fileInputRef is available when component mounts
    if (!fileInputRef.current) {
      console.log("Creating backup file input element");
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      input.addEventListener('change', handlePhotoChange);
      document.body.appendChild(input);
      fileInputRef.current = input;
    }
    
    // Cleanup function to remove the element if we created one
    return () => {
      if (fileInputRef.current && !fileInputRef.current.parentElement?.classList?.contains('custom-file')) {
        document.body.removeChild(fileInputRef.current);
      }
    };
  }, []);

  const handlePhotoClick = () => {
    try {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      } else {
        console.error("File input reference is not available");
        // Create and use a temporary file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';
        input.addEventListener('change', handlePhotoChange);
        document.body.appendChild(input);
        input.click();
        
        // Store for future use
        fileInputRef.current = input;
      }
    } catch (error) {
      console.error("Error opening file selector:", error);
      setAlert({
        show: true,
        color: "danger",
        message: "Unable to open file selector. Please try again or reload the page."
      });
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setAlert({
        show: true,
        color: "danger",
        message: "Please select a valid image file (JPEG, PNG, GIF, WebP)."
      });
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      setAlert({
        show: true,
        color: "danger",
        message: "Image size should be less than 5MB."
      });
      return;
    }

    // Debug logs to verify file data
    console.log("File selected:", file.name, file.type, file.size);

    // Create FormData instance
    const formData = new FormData();
    formData.append('profilePhoto', file, file.name);

    setUploadLoading(true);
    try {
      // Get the current token
      const currentToken = localStorage.getItem('token') || token;
      
      // Create axios instance with specific configuration for file upload
      const axiosInstance = axios.create({
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          // Do not set Content-Type manually for multipart/form-data
          // The browser will automatically set it with the correct boundary
        },
        // Increase timeout for larger files
        timeout: 30000
      });
      
      // Make the request
      const response = await axiosInstance.post('/api/users/profile-photo', formData);
      
      console.log("Upload response:", response.data);
      
      // Update profile photo state with the URL returned from the server
      setProfilePhoto(response.data.photoUrl);
      
      // Update user in localStorage and trigger events to update other components
      const updatedUser = { ...user, profilePhoto: response.data.photoUrl };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Emit a custom event that the navbar can listen for
      window.dispatchEvent(new CustomEvent('userDataRefreshed', { 
        detail: { user: updatedUser } 
      }));
      
      setAlert({
        show: true,
        color: "success",
        message: "Profile photo updated successfully!"
      });

      // Hide alert after 3 seconds
      setTimeout(() => {
        setAlert({ show: false, color: "", message: "" });
      }, 3000);
    } catch (error) {
      console.error("Error uploading profile photo:", error);
      
      let errorMessage = "Failed to upload profile photo.";
      
      if (error.response) {
        console.error("Server response error:", error.response.data);
        errorMessage = error.response.data.message || errorMessage;
      } else if (error.request) {
        console.error("No response received:", error.request);
        errorMessage = "No response from server. Please check your connection.";
      } else {
        console.error("Request setup error:", error.message);
        errorMessage = error.message || errorMessage;
      }
      
      setAlert({
        show: true,
        color: "danger",
        message: errorMessage
      });
    } finally {
      setUploadLoading(false);
    }
  };

  // Handle profile photo deletion
  const handleDeletePhoto = async () => {
    if (window.confirm('Are you sure you want to delete your profile photo?')) {
      setUploadLoading(true);
      try {
        // Get the current token
        const currentToken = localStorage.getItem('token') || token;
        
        const response = await axios.delete('/api/users/profile-photo', {
          headers: {
            'Authorization': `Bearer ${currentToken}`
          }
        });
        
        console.log("Delete photo response:", response.data);
        
        // Clear profile photo state
        setProfilePhoto("");
        
        // Update user in localStorage and trigger events to update other components
        const updatedUser = { ...user, profilePhoto: null };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Emit a custom event that the navbar can listen for
        window.dispatchEvent(new CustomEvent('userDataRefreshed', { 
          detail: { user: updatedUser } 
        }));
        
        setAlert({
          show: true,
          color: "success",
          message: "Profile photo deleted successfully!"
        });

        // Hide alert after 3 seconds
        setTimeout(() => {
          setAlert({ show: false, color: "", message: "" });
        }, 3000);
      } catch (error) {
        console.error("Error deleting profile photo:", error);
        
        let errorMessage = "Failed to delete profile photo.";
        
        if (error.response) {
          console.error("Server response error:", error.response.data);
          errorMessage = error.response.data.message || errorMessage;
        } else if (error.request) {
          errorMessage = "No response from server. Please check your connection.";
        } else {
          errorMessage = error.message || errorMessage;
        }
        
        setAlert({
          show: true,
          color: "danger",
          message: errorMessage
        });
      } finally {
        setUploadLoading(false);
      }
    }
  };
 
  
  // Function to determine if form fields should be readonly
  const isProfileReadOnly = () => {
    // Check if the user exists and email is not verified (using isEmailVerified from UserContext)
    return user && !isEmailVerified;
  };
  
  // New function to determine if username and email should be readonly
  const isUsernameEmailReadOnly = () => {
    // Make username and email read-only for non-Super_Admin users
    return !user || user.role !== 'Super_Admin';
  };
  
  // Add verification warning banner at the top of profile page when user is unverified
  const renderVerificationWarning = () => { 
    

    // Only show the warning if user exists and is explicitly not verified
    if (user && !isEmailVerified) {
      return (
        <Alert color="warning" className="mb-4">
          <div className="d-flex">
            <div className="flex-shrink-0">
              <i className="fas fa-lock mr-3" style={{ fontSize: "1.5rem" }}></i>
            </div>
            <div>
              <h4 className="alert-heading mb-1">Profile Updates Restricted</h4>
              <p className="mb-1">Your profile is in read-only mode because your email is not verified.</p>
              <Button
                color="warning"
                size="sm"
                onClick={handleVerifyEmail}
                className="mt-2"
              >
                <i className="fas fa-envelope mr-1"></i> Verify Email to Enable Editing
              </Button>
            </div>
          </div>
        </Alert>
      );
    }
    return null;
  };
  
  const updateProfile = async (e) => {
    e.preventDefault();
    
    // Prevent updates for unverified users
    if (isProfileReadOnly()) {
      setAlert({
        show: true,
        color: "warning",
        message: "You must verify your email before updating your profile."
      });
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.put("/api/users/profile", formData, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });

      // Update local storage with new user data
      const updatedUser = { 
        ...user, 
        ...response.data.user,
        profilePhoto: profilePhoto // Make sure profilePhoto is included
      };
      localStorage.setItem("user", JSON.stringify(updatedUser));

      // Show success message
      setAlert({
        show: true,
        color: "success",
        message: "Profile updated successfully!"
      });

      // Hide alert after 3 seconds
      setTimeout(() => {
        setAlert({ show: false, color: "", message: "" });
      }, 3000);
    } catch (error) {
      console.error("Error updating profile:", error);
      setAlert({
        show: true,
        color: "danger",
        message: error.response?.data?.message || "Failed to update profile. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle change password form submission
  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    // Validate password data
    const errors = validatePasswordData();
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.put("/api/users/change-password", {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      }, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });
      
      // Clear password fields
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      
      // Close the modal
      setShowChangePasswordModal(false);
      
      // Show success message
      setAlert({
        show: true,
        color: "success",
        message: "Password changed successfully! You will be logged out shortly."
      });
      
      // Log out the user after a short delay to show the success message
      setTimeout(() => {
        // Access the logout function from AuthContext
        try {
          if (window.logout) {
            window.logout();
          } else {
            // Clear all authentication data manually if logout function is not available
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            // Redirect to login page
            window.location.href = '/auth/login';
          }
        } catch (error) {
          console.error("Error during logout:", error);
          // Fallback to manual logout
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/auth/login';
        }
      }, 2000); // 2 seconds delay to allow the user to see the success message
      
    } catch (error) {
      console.error("Error changing password:", error);
      setAlert({
        show: true,
        color: "danger",
        message: error.response?.data?.message || "Failed to change password. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  // Initiate forgot password process
  const handleForgotPasswordRequest = async () => {
    // Validate email
    const errors = validateForgotPasswordData();
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }
    
    setLoading(true);
    try {
      // Request OTP for password reset
      await axios.post("/api/users/forgot-password", {
        email: forgotPasswordData.email
      });
      
      // Move to OTP verification step
      setForgotPasswordStep(2);
      setAlert({
        show: true,
        color: "info",
        message: "Verification code sent! Please check your email."
      });
    } catch (error) {
      console.error("Error requesting password reset:", error);
      setAlert({
        show: true,
        color: "danger",
        message: error.response?.data?.message || "Failed to send verification code. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP for password reset
  const handleVerifyResetOtp = async () => {
    // Validate OTP
    const errors = validateForgotPasswordData();
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }
    
    setLoading(true);
    try {
      // Verify OTP
      await axios.post("/api/users/verify-reset-otp", {
        email: forgotPasswordData.email,
        otp: forgotPasswordData.otp
      });
      
      // Move to new password step
      setForgotPasswordStep(3);
      setAlert({
        show: true,
        color: "info",
        message: "Code verified! Set your new password now."
      });
    } catch (error) {
      console.error("Error verifying reset OTP:", error);
      setAlert({
        show: true,
        color: "danger",
        message: error.response?.data?.message || "Invalid verification code. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  // Reset password with new password
  const handleResetPassword = async () => {
    // Validate new password
    const errors = validateForgotPasswordData();
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }
    
    setLoading(true);
    try {
      // Reset password
      await axios.post("/api/users/reset-password", {
        email: forgotPasswordData.email,
        otp: forgotPasswordData.otp,
        newPassword: forgotPasswordData.newPassword
      });
      
      // Reset form and close modal
      setForgotPasswordData({
        email: "",
        otp: "",
        newPassword: "",
        confirmPassword: ""
      });
      setForgotPasswordStep(1);
      setShowForgotPasswordModal(false);
      
      // Show success message
      setAlert({
        show: true,
        color: "success",
        message: "Password reset successful! You can now log in with your new password."
      });
    } catch (error) {
      console.error("Error resetting password:", error);
      setAlert({
        show: true,
        color: "danger",
        message: error.response?.data?.message || "Failed to reset password. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to handle going back in the forgot password flow
  const handleBackStep = () => {
    if (forgotPasswordStep > 1) {
      setForgotPasswordStep(forgotPasswordStep - 1);
    }
  };
  
  // Function to handle OTP verification
  const handleVerifyEmail = () => {
    // Set email to verify and open verification modal
    if (user && user.email) {
      setShowVerifyModal(true);
    }
  };
  
  // Handle successful verification
  const handleVerificationSuccess = () => {
    setShowVerifyModal(false);
    
    // When verification is successful, refresh the user data in both contexts
    if (user && user.id) {
      refreshUserData(user.id);
    } else if (user && user._id) {
      refreshUserData(user._id);
    }
  };

  // Function to completely refresh user data after verification
  const refreshUserData = async (userId) => {
    try {
      // Fetch fresh user data from the API
      const response = await axios.get('/api/users/profile', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      const freshUserData = response.data.user || response.data;
      
      console.log('Refreshed user data from server:', freshUserData);
      
      // Update local storage with the fresh user data from server
      localStorage.setItem('user', JSON.stringify(freshUserData));
      
      // Dispatch event to notify all components about the user data refresh
      window.dispatchEvent(new CustomEvent('userDataRefreshed', { 
        detail: { user: freshUserData } 
      }));
      
      // Force page reload to ensure all components are updated
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Error refreshing user data:', error);
      setAlert({
        show: true,
        color: "danger",
        message: "Failed to refresh user data. Please try again."
      });
    }
  };
  
  // Handle forgot password form input changes
  const handleForgotPasswordInputChange = (e) => {
    const { name, value } = e.target;
    setForgotPasswordData({
      ...forgotPasswordData,
      [name]: value
    });
  };
  
  // Handle password form input changes
  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordData({
      ...passwordData,
      [name]: value
    });
  };
  
  // Validate password data
  const validatePasswordData = () => {
    const errors = {};
    
    // Validate current password
    if (!passwordData.currentPassword) {
      errors.currentPassword = "Current password is required";
    }
    
    // Validate new password
    if (!passwordData.newPassword) {
      errors.newPassword = "New password is required";
    } else if (passwordData.newPassword.length < 8) {
      errors.newPassword = "Password must be at least 8 characters";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(passwordData.newPassword)) {
      errors.newPassword = "Password must include uppercase, lowercase, number and special character";
    }
    
    // Validate confirm password
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }
    
    return errors;
  };
  
  // Validate forgot password data based on current step
  const validateForgotPasswordData = () => {
    const errors = {};
    
    if (forgotPasswordStep === 1) {
      // Validate email
      if (!forgotPasswordData.email) {
        errors.email = "Email is required";
      } else if (!/\S+@\S+\.\S+/.test(forgotPasswordData.email)) {
        errors.email = "Invalid email format";
      }
    } else if (forgotPasswordStep === 2) {
      // Validate OTP
      if (!forgotPasswordData.otp) {
        errors.otp = "Verification code is required";
      } else if (forgotPasswordData.otp.length !== 6 || !/^\d+$/.test(forgotPasswordData.otp)) {
        errors.otp = "Verification code must be 6 digits";
      }
    } else if (forgotPasswordStep === 3) {
      // Validate new password
      if (!forgotPasswordData.newPassword) {
        errors.newPassword = "New password is required";
      } else if (forgotPasswordData.newPassword.length < 8) {
        errors.newPassword = "Password must be at least 8 characters";
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(forgotPasswordData.newPassword)) {
        errors.newPassword = "Password must include uppercase, lowercase, number and special character";
      }
      
      // Validate confirm password
      if (forgotPasswordData.newPassword !== forgotPasswordData.confirmPassword) {
        errors.confirmPassword = "Passwords do not match";
      }
    }
    
    return errors;
  };
  
  // Render the forgot password modal based on current step
  const renderForgotPasswordModal = () => {
    return (
      <Modal isOpen={showForgotPasswordModal} toggle={() => setShowForgotPasswordModal(false)} size="md">
        <ModalHeader toggle={() => setShowForgotPasswordModal(false)} className="bg-gradient-warning text-white">
          <div>
            <h4 className="mb-0 text-white font-weight-bold">
              <i className="fas fa-key mr-2"></i>
              {forgotPasswordStep === 1 && "Forgot Password"}
              {forgotPasswordStep === 2 && "Verify Code"}
              {forgotPasswordStep === 3 && "Reset Password"}
            </h4>
            <p className="text-white-50 mb-0 small">
              {forgotPasswordStep === 1 && "Enter your email to reset your password"}
              {forgotPasswordStep === 2 && "Enter the verification code sent to your email"}
              {forgotPasswordStep === 3 && "Create a new password"}
            </p>
          </div>
        </ModalHeader>
        <ModalBody className="pt-4 pb-3">
          {alert.show && (
            <Alert color={alert.color} toggle={() => setAlert({ ...alert, show: false })}>
              {alert.message}
            </Alert>
          )}

          {/* Step 1: Enter Email */}
          {forgotPasswordStep === 1 && (
            <Form>
              <div className="text-center mb-4">
                <div className="icon icon-shape icon-shape-warning rounded-circle mb-3 shadow">
                  <i className="fas fa-unlock-alt fa-2x"></i>
                </div>
                <h4>Forgot Your Password?</h4>
                <p className="text-muted">
                  Enter your email address and we'll send you a verification code to reset your password.
                </p>
              </div>

              <FormGroup>
                <Label className="form-control-label" htmlFor="forgotEmail">Email Address</Label>
                <Input
                  className="form-control-alternative"
                  type="email"
                  name="email"
                  id="forgotEmail"
                  placeholder="Enter your email"
                  value={forgotPasswordData.email}
                  onChange={handleForgotPasswordInputChange}
                  invalid={!!passwordErrors.email}
                />
                {passwordErrors.email && <div className="text-danger mt-1 small">{passwordErrors.email}</div>}
              </FormGroup>

              <div className="text-center mt-4">
                <Button color="secondary" className="mr-2" onClick={() => setShowForgotPasswordModal(false)}>
                  <i className="fas fa-times mr-1"></i> Cancel
                </Button>
                <Button 
                  color="warning" 
                  onClick={handleForgotPasswordRequest}
                  disabled={loading}
                >
                  {loading ? (
                    <><span className="spinner-border spinner-border-sm mr-1"></span> Sending...</>
                  ) : (
                    <><i className="fas fa-paper-plane mr-1"></i> Send Verification Code</>
                  )}
                </Button>
              </div>
            </Form>
          )}

          {/* Step 2: Enter OTP */}
          {forgotPasswordStep === 2 && (
            <Form>
              <div className="text-center mb-4">
                <div className="icon icon-shape icon-shape-warning rounded-circle mb-3 shadow">
                  <i className="fas fa-shield-alt fa-2x"></i>
                </div>
                <h4>Enter Verification Code</h4>
                <p className="text-muted">
                  We've sent a verification code to <strong>{forgotPasswordData.email}</strong>
                </p>
              </div>

              <FormGroup>
                <Label className="form-control-label" htmlFor="forgotOtp">Verification Code</Label>
                <Input
                  className="form-control-alternative form-control-lg text-center"
                  type="text"
                  name="otp"
                  id="forgotOtp"
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  style={{ fontSize: '24px', letterSpacing: '0.5rem' }}
                  value={forgotPasswordData.otp}
                  onChange={handleForgotPasswordInputChange}
                  invalid={!!passwordErrors.otp}
                />
                {passwordErrors.otp && <div className="text-danger mt-1 small">{passwordErrors.otp}</div>}
              </FormGroup>

              <div className="text-center mt-4">
                <Button color="secondary" className="mr-2" onClick={handleBackStep}>
                  <i className="fas fa-arrow-left mr-1"></i> Back
                </Button>
                <Button 
                  color="warning" 
                  onClick={handleVerifyResetOtp}
                  disabled={loading}
                >
                  {loading ? (
                    <><span className="spinner-border spinner-border-sm mr-1"></span> Verifying...</>
                  ) : (
                    <><i className="fas fa-check-circle mr-1"></i> Verify Code</>
                  )}
                </Button>
              </div>

              <div className="text-center mt-4">
                <Button 
                  color="link" 
                  size="sm"
                  onClick={handleForgotPasswordRequest}
                >
                  <i className="fas fa-paper-plane mr-1"></i> Resend verification code
                </Button>
              </div>
            </Form>
          )}

          {/* Step 3: New Password */}
          {forgotPasswordStep === 3 && (
            <Form>
              <div className="text-center mb-4">
                <div className="icon icon-shape icon-shape-warning rounded-circle mb-3 shadow">
                  <i className="fas fa-key fa-2x"></i>
                </div>
                <h4>Create New Password</h4>
                <p className="text-muted">
                  Enter your new password below
                </p>
              </div>

              <FormGroup>
                <Label className="form-control-label" htmlFor="forgotNewPassword">New Password</Label>
                <Input
                  className="form-control-alternative"
                  type="password"
                  name="newPassword"
                  id="forgotNewPassword"
                  placeholder="Enter new password"
                  value={forgotPasswordData.newPassword}
                  onChange={handleForgotPasswordInputChange}
                  invalid={!!passwordErrors.newPassword}
                />
                {passwordErrors.newPassword && <div className="text-danger mt-1 small">{passwordErrors.newPassword}</div>}
                <small className="form-text text-muted">
                  Password must be at least 8 characters long, contain uppercase and lowercase letters, numbers, and special characters.
                </small>
              </FormGroup>

              <FormGroup>
                <Label className="form-control-label" htmlFor="forgotConfirmPassword">Confirm New Password</Label>
                <Input
                  className="form-control-alternative"
                  type="password"
                  name="confirmPassword"
                  id="forgotConfirmPassword"
                  placeholder="Confirm new password"
                  value={forgotPasswordData.confirmPassword}
                  onChange={handleForgotPasswordInputChange}
                  invalid={!!passwordErrors.confirmPassword}
                />
                {passwordErrors.confirmPassword && <div className="text-danger mt-1 small">{passwordErrors.confirmPassword}</div>}
              </FormGroup>

              <div className="text-center mt-4">
                <Button color="secondary" className="mr-2" onClick={handleBackStep}>
                  <i className="fas fa-arrow-left mr-1"></i> Back
                </Button>
                <Button 
                  color="warning" 
                  onClick={handleResetPassword}
                  disabled={loading}
                >
                  {loading ? (
                    <><span className="spinner-border spinner-border-sm mr-1"></span> Resetting...</>
                  ) : (
                    <><i className="fas fa-check-double mr-1"></i> Reset Password</>
                  )}
                </Button>
              </div>
            </Form>
          )}
        </ModalBody>
      </Modal>
    );
  };

  return (
    <>
      <UserHeader />
      <Container className="mt--7" fluid>
        <Row>
          <Col className="order-xl-1" xl="8">
            <Card className="bg-secondary shadow">
              <CardHeader className="bg-gradient-warning">
                <h3 className="mb-0 text-white">My Profile</h3>
              </CardHeader>
              <CardBody>
                {alert.show && (
                  <Alert color={alert.color} toggle={() => setAlert({ ...alert, show: false })}>
                    {alert.message}
                  </Alert>
                )}

                {renderVerificationWarning()}

                <Form onSubmit={updateProfile}>
                  <h6 className="heading-small text-muted mb-4">
                    <i className="fas fa-user-circle mr-2"></i>Account Information
                  </h6>
                  <div className="pl-lg-4">
                    <Row>
                      <Col lg="6">
                        <FormGroup>
                          <Label className="form-control-label" htmlFor="username">Username</Label>
                          <Input
                            className="form-control-alternative"
                            type="text"
                            name="username"
                            id="username"
                            placeholder="Enter your username"
                            value={formData.username}
                            onChange={handleInputChange}
                            readOnly={isProfileReadOnly() || isUsernameEmailReadOnly()}
                          />
                        </FormGroup>
                      </Col>
                      <Col lg="6">
                        <FormGroup>
                          <Label className="form-control-label" htmlFor="email">Email</Label>
                          <Input
                            className="form-control-alternative"
                            type="email"
                            name="email"
                            id="email"
                            placeholder="Enter your email"
                            value={formData.email}
                            onChange={handleInputChange}
                            readOnly={isProfileReadOnly() || isUsernameEmailReadOnly()}
                          />
                        </FormGroup>
                      </Col>
                    </Row>
                    <Row>
                      <Col lg="6">
                        <FormGroup>
                          <Label className="form-control-label" htmlFor="firstName">First Name</Label>
                          <Input
                            className="form-control-alternative"
                            type="text"
                            name="firstName"
                            id="firstName"
                            placeholder="Enter your first name"
                            value={formData.firstName}
                            onChange={handleInputChange}
                            readOnly={isProfileReadOnly()}
                          />
                        </FormGroup>
                      </Col>
                      <Col lg="6">
                        <FormGroup>
                          <Label className="form-control-label" htmlFor="lastName">Last Name</Label>
                          <Input
                            className="form-control-alternative"
                            type="text"
                            name="lastName"
                            id="lastName"
                            placeholder="Enter your last name"
                            value={formData.lastName}
                            onChange={handleInputChange}
                            readOnly={isProfileReadOnly()}
                          />
                        </FormGroup>
                      </Col>
                    </Row>
                     
                    <Row>
                    <Col lg="6">
                        <FormGroup>
                          <Label className="form-control-label" htmlFor="address">Address</Label>
                          <Input
                            className="form-control-alternative"
                            type="text"
                            name="address"
                            id="address"
                            placeholder="Enter your address"
                            value={formData.address}
                            onChange={handleInputChange}
                            readOnly={isProfileReadOnly()}
                          />
                        </FormGroup>
                      </Col>
                      <Col lg="6">
                        <FormGroup>
                          <Label className="form-control-label" htmlFor="city">City</Label>
                          <Input
                            className="form-control-alternative"
                            type="text"
                            name="city"
                            id="city"
                            placeholder="Enter your city"
                            value={formData.city}
                            onChange={handleInputChange}
                            readOnly={isProfileReadOnly()}
                          />
                        </FormGroup>
                      </Col>
                     
                    </Row>
                    <Row>
                    <Col lg="6">
                        <FormGroup>
                          <Label className="form-control-label" htmlFor="country">Country</Label>
                          <Input
                            className="form-control-alternative"
                            type="select"
                            name="country"
                            id="country"
                            value={formData.country}
                            onChange={handleInputChange}
                            disabled={isProfileReadOnly()}
                          >
                            {countries.map((country) => (
                              <option key={country.code} value={country.code}>
                                {country.name}
                              </option>
                            ))}
                          </Input>
                        </FormGroup>
                      </Col>
                      <Col lg="6">
                        <FormGroup>
                          <Label className="form-control-label" htmlFor="postalCode">Postal Code</Label>
                          <Input
                            className="form-control-alternative"
                            type="text"
                            name="postalCode"
                            id="postalCode"
                            placeholder="Enter your postal code"
                            value={formData.postalCode}
                            onChange={handleInputChange}
                            readOnly={isProfileReadOnly()}
                          />
                        </FormGroup>
                      </Col> 
                    </Row>
                    <Row>
                    <Col lg="12">
                        <FormGroup>
                          <Label className="form-control-label" htmlFor="aboutMe">About Me</Label>
                          <Input
                            className="form-control-alternative"
                            type="textarea"
                            name="aboutMe"
                            id="aboutMe"
                            placeholder="Tell us about yourself"
                            value={formData.aboutMe}
                            onChange={handleInputChange}
                            readOnly={isProfileReadOnly()}
                          />
                        </FormGroup>
                      </Col>
                    </Row>

                    <div className="text-center">
                      <Button color="warning" type="submit" disabled={loading}>
                        {loading ? (
                          <><span className="spinner-border spinner-border-sm mr-1"></span> Updating...</>
                        ) : (
                          <><i className="fas fa-save mr-1"></i> Save Changes</>
                        )}
                      </Button>
                    </div>
                  </div>

                  <hr className="my-4" />

                  <h6 className="heading-small text-muted mb-4">
                    <i className="fas fa-lock mr-2"></i>Security
                  </h6>
                  <div className="pl-lg-4">
                    <Row>
                      <Col lg="6">
                        <Button
                          color="info"
                          block
                          onClick={() => setShowChangePasswordModal(true)}
                        >
                          <i className="fas fa-key mr-2"></i> Change Password
                        </Button>
                      </Col>
                    </Row>
                  </div>
                </Form>
              </CardBody>
            </Card>
          </Col>
          <Col className="order-xl-2" xl="4">
            <Card className="bg-secondary shadow">
              <CardHeader className="bg-gradient-info">
                <h3 className="mb-0 text-white">Profile Photo</h3>
              </CardHeader>
              <CardBody className="text-center">
                <div className="mb-4">
                  {uploadLoading ? (
                    <Spinner color="warning" />
                  ) : (
                    <div className="position-relative">
                      <img 
                        src={user && profilePhoto
                          ? profilePhoto 
                          : require("../../assets/img/theme/team-4-800x800.jpg")}
                        alt="Profile"
                        className="rounded-circle"
                        style={{ width: "150px", height: "150px", objectFit: "cover" }}
                      />
                      {/* Edit and Delete Icons */}
                      {!isProfileReadOnly() && (
                        <div 
                          className="position-absolute d-flex" 
                          style={{ 
                            bottom: "0", 
                            right: "0", 
                            transform: "translate(20%, 20%)",
                            zIndex: "10"
                          }}
                        >
                          <Button 
                            color="primary" 
                            className="btn-icon-only rounded-circle shadow mr-1"
                            size="sm"
                            onClick={handlePhotoClick}
                            title="Upload new photo"
                          >
                            <i className="fa-pencil fas"></i>
                          </Button>
                          <Button 
                            color="danger" 
                            className="btn-icon-only rounded-circle shadow"
                            size="sm"
                            onClick={handleDeletePhoto}
                            disabled={!profilePhoto}
                            title="Delete photo"
                          >
                            <i className="fas fa-trash"></i>
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="text-center">
                  <h3>
                    {user ? `${user.firstName || ''} ${user.lastName || ''}` : 'User Name'}
                  </h3>
                  <div className="h5 font-weight-300">
                    <i className="ni location_pin mr-2" />
                    {user && (user.city || user.country) ? `${user.city || ''}, ${
                      countries.find(c => c.code === user.country)?.name || user.country || ''
                    }` : 'Location Not Set'}
                  </div>
                  <div className="h5 mt-4">
                    <i className="ni business_briefcase-24 mr-2" />
                    {user && user.role ? user.role.replace(/_/g, ' ') : 'User'} {branchName ? `- ${branchName}` : ''}
                  </div>
                  <div>
                    <i className="ni education_hat mr-2" />
                    {restaurantName || 'Restaurant Not Set'}
                  </div>
                  <hr className="my-4" />
                  <p>
                    {user && user.aboutMe ? user.aboutMe : 'No bio information provided yet.'}
                  </p>
                </div>
              </CardBody>
            </Card>
             
          </Col>
        </Row>
      </Container>

      {renderForgotPasswordModal()}
      
      {/* Use the new EmailVerificationModal component */}
      <EmailVerificationModal 
        isOpen={showVerifyModal}
        toggle={() => setShowVerifyModal(false)}
        onVerified={handleVerificationSuccess}
      />

      {/* Change Password Modal */}
      <Modal isOpen={showChangePasswordModal} toggle={() => setShowChangePasswordModal(false)} size="md">
        <ModalHeader toggle={() => setShowChangePasswordModal(false)} className="bg-gradient-info text-white">
          <div>
            <h4 className="mb-0 text-white font-weight-bold">
              <i className="fas fa-key mr-2"></i>
              Change Password
            </h4>
            <p className="text-white-50 mb-0 small">
              Update your account password
            </p>
          </div>
        </ModalHeader>
        <ModalBody className="pt-4 pb-3">
          {alert.show && (
            <Alert color={alert.color} toggle={() => setAlert({ ...alert, show: false })}>
              {alert.message}
            </Alert>
          )}

          <Form onSubmit={handleChangePassword}>
            <FormGroup>
              <Label className="form-control-label" htmlFor="currentPassword">Current Password</Label>
              <Input
                className="form-control-alternative"
                type="password"
                name="currentPassword"
                id="currentPassword"
                placeholder="Enter your current password"
                value={passwordData.currentPassword}
                onChange={handlePasswordInputChange}
                invalid={!!passwordErrors.currentPassword}
                required
              />
              {passwordErrors.currentPassword && <div className="text-danger mt-1 small">{passwordErrors.currentPassword}</div>}
            </FormGroup>

            <FormGroup>
              <Label className="form-control-label" htmlFor="newPassword">New Password</Label>
              <Input
                className="form-control-alternative"
                type="password"
                name="newPassword"
                id="newPassword"
                placeholder="Enter your new password"
                value={passwordData.newPassword}
                onChange={handlePasswordInputChange}
                invalid={!!passwordErrors.newPassword}
                required
              />
              {passwordErrors.newPassword && <div className="text-danger mt-1 small">{passwordErrors.newPassword}</div>}
              <small className="form-text text-muted">
                Password must be at least 8 characters long, contain uppercase and lowercase letters, numbers, and special characters.
              </small>
            </FormGroup>

            <FormGroup>
              <Label className="form-control-label" htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                className="form-control-alternative"
                type="password"
                name="confirmPassword"
                id="confirmPassword"
                placeholder="Confirm your new password"
                value={passwordData.confirmPassword}
                onChange={handlePasswordInputChange}
                invalid={!!passwordErrors.confirmPassword}
                required
              />
              {passwordErrors.confirmPassword && <div className="text-danger mt-1 small">{passwordErrors.confirmPassword}</div>}
            </FormGroup>

            <div className="text-center mt-4">
              <Button color="secondary" className="mr-2" onClick={() => setShowChangePasswordModal(false)}>
                <i className="fas fa-times mr-1"></i> Cancel
              </Button>
              <Button 
                type="submit"
                color="info" 
                disabled={loading}
              >
                {loading ? (
                  <><span className="spinner-border spinner-border-sm mr-1"></span> Updating...</>
                ) : (
                  <><i className="fas fa-check mr-1"></i> Update Password</>
                )}
              </Button>
            </div>
          </Form>
        </ModalBody>
      </Modal>
    </>
  );
};

export default Profile;
