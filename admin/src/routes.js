import Index from "views/Index.js";
import Profile from "views/examples/Profile.js";
import Maps from "views/examples/Maps.js"; 
import Tables from "views/examples/Tables.js";
import Icons from "views/examples/Icons.js";
import MenuItem from "features/menu-management/menuItem.js";
import Restaurant from "features/restaurant-management/restaurant.js";
import Branch from "features/branch-management/branch.js";
import Category from "features/category-management/category.js";
import UserManagement from "features/user-management/user.js";
import TableManagement from "features/table-management/table.js";
import TableQRCode from "features/table-management/TableQRCode.js";
import TableDetail from "features/table-management/TableDetail.js";
import TableQRBatch from "features/table-management/TableQRBatch.js";
import FloorManagement from "features/table-management/FloorManagement.js";
import TaxManagement from "features/tax-management/TaxManagement.js";
import CustomerManagement from "features/customer-management/CustomerManagement.js";
import OrderManagement from "features/order-management/OrderManagement.js";
import OrderReports from "features/order-management/OrderReports.js";
import StaffManagement from "features/staff-management/StaffManagement.js";
import InventoryManagement from "features/inventory-management/InventoryManagement.js";
import InventoryReports from "features/inventory-management/InventoryReports.jsx";
import SuppliersManagement from "features/supplier-management/SuppliersManagement.js";
import Login from "views/examples/Login.js";
import Register from "views/examples/Register.js";
import BrandingSettings from "views/settings/BrandingSettings.js";
import SettingsPage from "views/settings/SettingsPage.js";
import BranchSettings from "features/branch-management/BranchSettings.js";

var routes = [
  {
    path: "/index",
    name: "Dashboard",
    icon: "ni ni-tv-2 text-primary",
    component: <Index />,
    layout: "/admin",
  }, 
   
  {
    path: "/inventory",
    name: "Inventory",
    icon: "ni ni-bag-17 text-teal",
    component: <InventoryManagement />,
    layout: "/admin",
    roles: ["admin", "Branch_Manager"],
  },
  {
    path: "/inventory-reports",
    name: "Inventory Reports",
    icon: "ni ni-chart-bar-32 text-teal",
    component: <InventoryReports />,
    layout: "/admin",
    roles: ["Branch_Manager"],
  },
  {
    path: "/suppliers",
    name: "Suppliers",
    icon: "ni ni-delivery-fast text-blue",
    component: <SuppliersManagement />,
    layout: "/admin",
    roles: ["admin", "Branch_Manager"],
  },
  {
    path: "/users",
    name: "User Management",
    icon: "ni ni-circle-08 text-red",
    component: <UserManagement />,
    layout: "/admin",
    roles: ["Super_Admin"], // Only Super_Admin can see this route
  },
  {
    path: "/restaurants",
    name: "Restaurants",
    icon: "ni ni-building text-blue",
    component: <Restaurant />,
    layout: "/admin",
    roles: ["Super_Admin"], // Only Super_Admin can see this route
  },
  {
    path: "/branches",
    name: "All Branches",
    icon: "ni ni-shop text-orange",
    component: <Branch />,
    layout: "/admin", 
    roles: ["Super_Admin"], // Only Super_Admin can see this route
  },
  {
    path: "/branches/:restaurantId",
    name: "Restaurant Branches",
    icon: "ni ni-shop text-orange",
    component: <Branch />,
    layout: "/admin", 
    roles: ["Super_Admin"], // Only Super_Admin can see this route
    hidden: true, // Hide from sidebar
  },
  {
    path: "/categories",
    name: "Categories",
    icon: "ni ni-tag text-yellow",
    component: <Category />,
    layout: "/admin",
    roles: ["Branch_Manager", "Kitchen", "Delivery", "POS_Operator"], 
  },
  {
    path: "/menu-items",
    name: "Menu Items",
    icon: "ni ni-box-2 text-green",
    component: <MenuItem />,
    layout: "/admin",
    roles: ["Branch_Manager", "Kitchen", "Delivery", "POS_Operator"], 
  },
  {
    path: "/order-management",
    name: "Orders",
    icon: "ni ni-cart text-orange",
    component: <OrderManagement />,
    layout: "/admin",
    roles: ["Branch_Manager", "Kitchen", "Delivery", "POS_Operator"],
  },
  {
    path: "/reports",
    name: "Order Reports",
    icon: "ni ni-chart-bar-32 text-purple",
    component: <OrderReports />,
    layout: "/admin",
    roles: ["Branch_Manager"],
  },
  {
    path: "/customer-management",
    name: "Customers",
    icon: "ni ni-single-02 text-cyan",
    component: <CustomerManagement />,
    layout: "/admin",
    roles: ["Branch_Manager", "POS_Operator"], 
  },
  {
    path: "/staff-management",
    name: "Staff Management",
    icon: "ni ni-badge text-pink",
    component: <StaffManagement />,
    layout: "/admin",
    roles: ["Branch_Manager"], // Only Branch_Manager can see this route
  },
  {
    path: "/tables-management",
    name: "Dining Tables",
    icon: "ni ni-ungroup text-info",
    component: <TableManagement />,
    layout: "/admin",
    roles: ["admin", "Branch_Manager"], // Only admin, Super_Admin, or branch_manager can see this route
  },
  {
    path: "/tables-qr",
    name: "Table QR (Batch)",
    icon: "ni ni-collection text-info",
    component: <TableQRBatch />,
    layout: "/admin",
    roles: ["admin", "Branch_Manager"],
    hidden: true, // Hide from sidebar
  },
  {
    path: "/tax-management",
    name: "Tax Management",
    icon: "ni ni-money-coins text-purple",
    component: <TaxManagement />,
    layout: "/admin",
    roles: ["Super_Admin"], // Only Super_Admin can see this route
  },
  {
    path: "/tables/qr/:tableId",
    name: "Table QR Code",
    component: <TableQRCode />,
    layout: "/admin",
    hidden: true, // Hide from sidebar
    roles: ["admin", "Branch_Manager"], 
  },
   {
    path: "/settings",
    name: "Settings",
    icon: "ni ni-settings-gear-65 text-gray",
    component: <SettingsPage />,
    layout: "/admin",
    roles: ["Branch_Manager"],
  },
  {
    path: "/tables-management/:tableId",
    name: "Table Details",
    component: <TableDetail />,
    layout: "/admin",
    hidden: true, // Hide from sidebar
    roles: ["admin", "Branch_Manager"], 
  },
  
  {
    path: "/icons",
    name: "Icons",
    icon: "ni ni-planet text-blue",
    component: <Icons />,
    layout: "/admin",
    hidden: true, // Hide from sidebar
  },
  {
    path: "/maps",
    name: "Maps",
    icon: "ni ni-pin-3 text-orange",
    component: <Maps />,
    layout: "/admin",
    hidden: true, // Hide from sidebar
  },
  {
    path: "/user-profile",
    name: "User Profile",
    icon: "ni ni-single-02 text-yellow",
    component: <Profile />,
    layout: "/admin",
    hidden: true, // Hide from sidebar
  },
  {
    path: "/tables",
    name: "Tables",
    icon: "ni ni-bullet-list-67 text-red",
    component: <Tables />,
    layout: "/admin",
    hidden: true, // Hide from sidebar
  },
  // Auth routes
  {
    path: "/login",
    name: "Login",
    icon: "ni ni-key-25 text-info",
    component: <Login />,
    layout: "/auth",
    hidden: true, // Hide from sidebar
  },
  {
    path: "/register",
    name: "Register",
    icon: "ni ni-circle-08 text-pink",
    component: <Register />,
    layout: "/auth",
    hidden: true, // Hide from sidebar
  },
];
export default routes;
