// reactstrap components
import {
  Badge,
  Card,
  CardHeader,
  CardFooter,
  DropdownMenu,
  DropdownItem,
  UncontrolledDropdown,
  DropdownToggle,
  Media,
  Pagination,
  PaginationItem,
  PaginationLink,
  Progress,
  Table,
  Container,
  Row,
  UncontrolledTooltip,
  Modal
} from "reactstrap";
// core components
import Header from "components/Headers/Header.js";
import { useContext } from "react";
import MenuItemModal from "components/Modals/addMenuItem.js";
import { MenuContext } from "../../context/MenuContext";
import { CategoryContext } from "../../context/CategoryContext";  


import { useState } from "react";

const Tables = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [currentEditItem, setCurrentEditItem] = useState(null);
  const { menuItems, deleteMenuItem } = useContext(MenuContext);
  const { categories } = useContext(CategoryContext);
  
  // Function to handle modal close
  const handleCloseModal = () => {
    setModalOpen(false);
    setCurrentEditItem(null); // Reset the edit item when modal is closed
  };
  
  // Function to handle editing a menu item
  const handleEditMenuItem = (menuItem) => {
    setCurrentEditItem(menuItem);
    setModalOpen(true);
  };
  
  // Function to handle adding or updating a menu item
  const handleSaveMenuItem = (menuItemData) => { 
    // The actual save functionality is handled by the modal component through the context
    setModalOpen(false);
    setCurrentEditItem(null); // Reset the edit item when save is complete
  };

  return (
    <>
      <Header />
      {/* Page content */}
      <Container className="mt--7" fluid> 
          <Row>
            <div className="col">
              <Card className="shadow">
                <CardHeader className="border-0 d-flex justify-content-between">
                 <div className="d-inline-block">
                 <h3 className="mb-0">Menu Items</h3>
                 </div>
            <div className="text-right d-inline-block">
              <button className="btn btn-primary" 
              onClick={() => {
                setCurrentEditItem(null); // Ensure we're in add mode
                setModalOpen(true);
              }}>
                <i className="fas fa-plus mr-2"></i> 
                Add New Menu Item
              </button>
            </div>
                </CardHeader>
                <Table className="align-items-center table-flush" responsive>
            <thead className="thead-light">
              <tr>
                <th scope="col">Image</th>
                <th scope="col">Name</th>
                <th scope="col">Price</th>
                <th scope="col">Category</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {menuItems.length > 0 ? menuItems.map((menuItem) => (
                <tr key={menuItem._id}>
                  <td>
                    <Media className="align-items-center">
                      <a
                        className="avatar rounded-circle mr-3"
                        href="#"
                        onClick={(e) => e.preventDefault()}
                      >
                        {menuItem.imageUrl ? (
                          <img
                            alt={menuItem.name}
                            src={menuItem.imageUrl}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = require("../../assets/img/theme/sketch.jpg");
                            }}
                          />
                        ) : (
                          <img
                            alt="Default"
                            src={require("../../assets/img/theme/sketch.jpg")}
                          />
                        )}
                      </a>
                    </Media>
                  </td>
                  <td>
                    <Media className="align-items-center">
                      <Media>
                        <span className="mb-0 text-sm font-weight-bold">
                          {menuItem.name}
                        </span>
                        {menuItem.isVegetarian && (
                          <Badge color="success" pill className="ml-2">
                            Veg
                          </Badge>
                        )}
                      </Media>
                    </Media>
                  </td>
                  <td>₹{parseFloat(menuItem.price).toFixed(2)}</td>
                  <td>
                    {categories && categories.find(category => category._id === menuItem.categoryId)?.name || "Uncategorized"}
                  </td>
                  <td>
                    <Badge color={menuItem.isActive ? "success" : "warning"} className="badge-dot mr-4">
                      <i className={menuItem.isActive ? "bg-success" : "bg-warning"} />
                      {menuItem.isActive ? "Available" : "Unavailable"}
                    </Badge>
                    {menuItem.featured && (
                      <Badge color="info" pill className="ml-2">
                        Featured
                      </Badge>
                    )}
                  </td>
                  <td className="text-right">
                    <UncontrolledDropdown>
                      <DropdownToggle
                        className="btn-icon-only text-light"
                        href="#"
                        role="button"
                        size="sm"
                        color=""
                        onClick={(e) => e.preventDefault()}
                      >
                        <i className="fas fa-ellipsis-v" />
                      </DropdownToggle>
                      <DropdownMenu className="dropdown-menu-arrow" right>
                        <DropdownItem
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handleEditMenuItem(menuItem);
                          }}
                        >
                          <i className="fas fa-edit text-primary mr-2"></i> Edit
                        </DropdownItem>
                        <DropdownItem  
                          onClick={() => {
                            if (window.confirm("Are you sure you want to delete this menu item?")) {
                              deleteMenuItem(menuItem._id);
                            }
                          }}
                        >
                          <i className="fas fa-trash text-danger mr-2"></i> Delete
                        </DropdownItem>
                        <DropdownItem
                          href="#"
                          onClick={(e) => e.preventDefault()}
                        >
                          <i className="fas fa-eye text-info mr-2"></i> View Details
                        </DropdownItem>
                      </DropdownMenu>
                    </UncontrolledDropdown>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" className="text-center py-4">
                    <p className="font-italic text-muted mb-0">No menu items available</p>
                  </td>
                </tr>
              )}
            </tbody>
                </Table>
                {menuItems.length > 0 && (
                <CardFooter className="py-4">
                  <nav aria-label="...">
                    <Pagination
                      className="pagination justify-content-end mb-0"
                      listClassName="justify-content-end mb-0"
                    >
                      <PaginationItem className="disabled">
                        <PaginationLink
                          href="#pablo"
                          onClick={(e) => e.preventDefault()}
                          tabIndex="-1"
                        >
                          <i className="fas fa-angle-left" />
                          <span className="sr-only">Previous</span>
                        </PaginationLink>
                      </PaginationItem>
                      <PaginationItem className="active">
                        <PaginationLink
                          href="#pablo"
                          onClick={(e) => e.preventDefault()}
                        >
                          1
                        </PaginationLink>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationLink
                          href="#pablo"
                          onClick={(e) => e.preventDefault()}
                        >
                          2 <span className="sr-only">(current)</span>
                        </PaginationLink>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationLink
                          href="#pablo"
                          onClick={(e) => e.preventDefault()}
                        >
                          3
                        </PaginationLink>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationLink
                          href="#pablo"
                          onClick={(e) => e.preventDefault()}
                        >
                          <i className="fas fa-angle-right" />
                          <span className="sr-only">Next</span>
                        </PaginationLink>
                      </PaginationItem>
                    </Pagination>
                  </nav>
                </CardFooter>
                )}
              </Card>
            </div>
          </Row>
              
              </Container>
              
              {/* Menu Item Modal (for both Add and Edit) */}
      <MenuItemModal 
        isOpen={modalOpen}
        toggle={handleCloseModal}
        onSave={handleSaveMenuItem}
        editItem={currentEditItem}
      />
    </>
  );
};

export default Tables;
