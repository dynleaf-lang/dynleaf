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
import FloorManagement from "features/table-management/FloorManagement.js";
import TaxManagement from "features/tax-management/TaxManagement.js";
import CustomerManagement from "features/customer-management/CustomerManagement.js";
import OrderManagement from "features/order-management/OrderManagement.js";
import Login from "views/examples/Login.js";
import Register from "views/examples/Register.js";

var routes = [
  {
    path: "/index",
    name: "Dashboard",
    icon: "ni ni-tv-2 text-primary",
    component: <Index />,
    layout: "/admin",
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
    roles: ["Branch_Manager", "Kitchen", "Delivery", "POS_Operator", "Super_Admin"], 
  },
  {
    path: "/menu-items",
    name: "Menu Items",
    icon: "ni ni-box-2 text-green",
    component: <MenuItem />,
    layout: "/admin",
    roles: ["Branch_Manager", "Kitchen", "Delivery", "POS_Operator", "Super_Admin"], 
  },
  {
    path: "/order-management",
    name: "Orders",
    icon: "ni ni-cart text-orange",
    component: <OrderManagement />,
    layout: "/admin",
    roles: ["Branch_Manager", "Kitchen", "Delivery", "POS_Operator", "Super_Admin"],
  },
  {
    path: "/customer-management",
    name: "Customers",
    icon: "ni ni-single-02 text-cyan",
    component: <CustomerManagement />,
    layout: "/admin",
    roles: ["Branch_Manager", "POS_Operator", "Super_Admin"], 
  },
  {
    path: "/tables-management",
    name: "Dining Tables",
    icon: "ni ni-ungroup text-info",
    component: <TableManagement />,
    layout: "/admin",
    roles: ["admin", "Super_Admin", "Branch_Manager"], // Only admin, Super_Admin, or branch_manager can see this route
  },
  {
    path: "/tax-management",
    name: "Tax Management",
    icon: "ni ni-money-coins text-purple",
    component: <TaxManagement />,
    layout: "/admin",
    roles: ["Super_Admin", "Branch_Manager"], // Only Super_Admin or branch_manager can see this route
  },
  {
    path: "/tables/qr/:tableId",
    name: "Table QR Code",
    component: <TableQRCode />,
    layout: "/admin",
    hidden: true, // Hide from sidebar
    roles: ["admin", "Super_Admin", "Branch_Manager"], 
  },
  {
    path: "/tables-management/:tableId",
    name: "Table Details",
    component: <TableDetail />,
    layout: "/admin",
    hidden: true, // Hide from sidebar
    roles: ["admin", "Super_Admin", "Branch_Manager"], 
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
