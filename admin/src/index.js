import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";

import "assets/plugins/nucleo/css/nucleo.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "assets/scss/argon-dashboard-react.scss";
import "assets/css/checkbox-fix.css"; // Import the checkbox fix CSS

import AdminLayout from "layouts/Admin.js";
import AuthLayout from "layouts/Auth.js";

import { AuthProvider } from "./context/AuthContext";
import { MenuProvider } from "./context/MenuContext";
import { CategoryProvider } from "./context/CategoryContext";
import { RestaurantProvider } from "./context/RestaurantContext";
import { BranchProvider } from "./context/BranchContext";
import { UserProvider } from "./context/UserContext";
import { TableProvider } from "./context/TableContext";
import ProtectedRoute from "./components/ProtectedRoute";

// This component synchronizes verification status across the app
const VerificationStatusSynchronizer = () => {
  useEffect(() => {
    // Execute once on app load
    const synchronizeVerificationStatus = () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          
          // If the user is verified, ensure it's reflected in localStorage
          if (userData.isEmailVerified === true) {
            console.log('User is verified, ensuring correct state in localStorage');
            
            // Make sure all verification flags are cleared
            userData.isEmailVerified = true;
            localStorage.setItem('user', JSON.stringify(userData));
          }
        }
      } catch (err) {
        console.error('Error synchronizing verification status:', err);
      }
    };
    
    synchronizeVerificationStatus();
  }, []);
  
  return null; // This component doesn't render anything
};

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <AuthProvider>
    <UserProvider>
      <RestaurantProvider>
        <BranchProvider>
          <CategoryProvider>
            <MenuProvider>
              <TableProvider>
                <BrowserRouter>
                  <VerificationStatusSynchronizer />
                  <Routes>
                    <Route path="/admin/*" element={
                      <ProtectedRoute>
                        <AdminLayout />
                      </ProtectedRoute>
                    } />
                    <Route path="/auth/*" element={<AuthLayout />} />
                    <Route path="/" element={<Navigate to="/auth/login" replace />} /> {/* Redirect to login page by default */}
                    <Route path="*" element={<Navigate to="/auth/login" replace />} /> {/* Catch all other routes */}
                  </Routes>
                </BrowserRouter>
              </TableProvider>
            </MenuProvider>
          </CategoryProvider>
        </BranchProvider>
      </RestaurantProvider>
    </UserProvider>
  </AuthProvider>
);
