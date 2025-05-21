import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { MenuProvider } from "./context/MenuContext";
import { CategoryProvider } from "./context/CategoryContext";
import { RestaurantProvider } from "./context/RestaurantContext";
import { BranchProvider } from "./context/BranchContext";
import { UserProvider } from "./context/UserContext";
import ProtectedRoute from "./components/ProtectedRoute";

import "assets/plugins/nucleo/css/nucleo.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "assets/scss/argon-dashboard-react.scss";
import "assets/css/checkbox-fix.css"; // Import the checkbox fix CSS

import AdminLayout from "layouts/Admin.js";
import AuthLayout from "layouts/Auth.js";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render( 
  <AuthProvider>
    <UserProvider>
      <RestaurantProvider>
        <BranchProvider>
          <CategoryProvider>
            <MenuProvider>
              <BrowserRouter>
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
            </MenuProvider>
          </CategoryProvider>
        </BranchProvider>
      </RestaurantProvider>
    </UserProvider>
  </AuthProvider>
);
