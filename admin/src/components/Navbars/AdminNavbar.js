import { Link } from "react-router-dom";
// reactstrap components
import {
  DropdownMenu,
  DropdownItem,
  UncontrolledDropdown,
  DropdownToggle,
  Form,
  FormGroup,
  InputGroupAddon,
  InputGroupText,
  Input,
  InputGroup,
  Navbar,
  Nav,
  Container,
  Media,
} from "reactstrap";

import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../../context/AuthContext";
import { RestaurantContext } from "../../context/RestaurantContext";
import { BranchContext } from "../../context/BranchContext";
import { useNavigate } from "react-router-dom"; 
import NotificationBell from "../Notifications/NotificationBell";



const AdminNavbar = (props) => {
  const { logout, user } = useContext(AuthContext);
  const { restaurants } = useContext(RestaurantContext);
  const { branches } = useContext(BranchContext);
  const [restaurantName, setRestaurantName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const navigate = useNavigate(); 
  
 
  // Find restaurant and branch names when component mounts or dependencies change
  useEffect(() => {
    if (user && user.restaurantId && restaurants && restaurants.length > 0) {
      const restaurant = restaurants.find(r => r._id === user.restaurantId);
      setRestaurantName(restaurant ? restaurant.name : "");
    }
    
    if (user && user.branchId && branches && branches.length > 0) {
      const branch = branches.find(b => b._id === user.branchId);
      setBranchName(branch ? branch.name : "");
    }
    
    // Set the profile photo whenever user changes
    if (user && user.profilePhoto) {
      setProfilePhoto(user.profilePhoto);
    }
  }, [user, restaurants, branches]);

  // Listen for profile photo updates from localStorage
  useEffect(() => {
    // Check for profile photo updates
    const checkProfileUpdates = () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser.profilePhoto && parsedUser.profilePhoto !== profilePhoto) {
            setProfilePhoto(parsedUser.profilePhoto);
          }
        } catch (err) {
          console.error('Error parsing user from localStorage:', err);
        }
      }
    };

    // Check for updates initially
    checkProfileUpdates();

    // Listen for user data refresh events 
    const handleUserDataRefreshed = (event) => {
      if (event.detail && event.detail.user && event.detail.user.profilePhoto) {
        setProfilePhoto(event.detail.user.profilePhoto);
      }
    };

    window.addEventListener('userDataRefreshed', handleUserDataRefreshed);
    
    return () => {
      window.removeEventListener('userDataRefreshed', handleUserDataRefreshed);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/auth/login");
  };

  return (
    <>
      <Navbar className="navbar-top navbar-dark" expand="md" id="navbar-main">
        <Container fluid>
          <Link
            className="h4 mb-0 text-white text-uppercase d-none d-lg-inline-block"
            to="/"
          >
            {props.brandText}
          </Link>
          <Form className="navbar-search navbar-search-dark form-inline mr-3 d-none d-md-flex ml-lg-auto">
            <FormGroup className="mb-0">
              <InputGroup className="input-group-alternative">
                <InputGroupAddon addonType="prepend">
                  <InputGroupText>
                    <i className="fas fa-search" />
                  </InputGroupText>
                </InputGroupAddon>
                <Input placeholder="Search" type="text" />
              </InputGroup>
            </FormGroup>
          </Form>
          <div className="d-none d-md-flex align-items-center ml-2">
            <NotificationBell />
          </div>
          <Nav className="align-items-center d-none d-md-flex" navbar>
            <UncontrolledDropdown nav>
              <DropdownToggle className="pr-0" nav>
                <Media className="align-items-center">
                  <span className="avatar avatar-sm rounded-circle">
                    <img
                      alt="..."
                      src={profilePhoto || (user && user.profilePhoto) 
                        ? profilePhoto || user.profilePhoto 
                        : require("../../assets/img/theme/team-4-800x800.jpg")}
                    />
                  </span>
                  <Media className="ml-2 d-none d-lg-block">
                    <span className="mb-0 text-sm font-weight-bold">
                   Hello {user ? user.name || user.email : 'User'}
                    </span>
                  </Media>
                </Media>
              </DropdownToggle>
              <DropdownMenu className="dropdown-menu-arrow" right>
                <DropdownItem className="noti-title" header tag="div">
                  <h6 className="text-overflow m-0">
                   
                    {restaurantName && branchName && (
                      <span> {restaurantName} - ({branchName})</span>
                    )}
                  </h6>
                </DropdownItem>
                <DropdownItem to="/admin/user-profile" tag={Link}>
                  <i className="ni ni-single-02" />
                  <span>My profile</span>
                </DropdownItem>
                <DropdownItem to="/admin/settings" tag={Link}>
                  <i className="ni ni-settings-gear-65" />
                  <span>Settings</span>
                </DropdownItem>
                <DropdownItem to="/admin/user-profile" tag={Link}>
                  <i className="ni ni-calendar-grid-58" />
                  <span>Activity</span>
                </DropdownItem>
                <DropdownItem to="/admin/user-profile" tag={Link}>
                  <i className="ni ni-support-16" />
                  <span>Support</span>
                </DropdownItem>
                <DropdownItem divider />
                <DropdownItem onClick={handleLogout}>
                  <i className="ni ni-user-run" />
                  <span>Logout</span>
                </DropdownItem>
              </DropdownMenu>
            </UncontrolledDropdown>
          </Nav>
        </Container>
      </Navbar>
    </>
  );
};

export default AdminNavbar;
