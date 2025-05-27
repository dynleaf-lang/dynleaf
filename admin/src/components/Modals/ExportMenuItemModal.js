import React, { useState, useContext } from 'react';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Form,
  FormGroup,
  Label,
  Input,
  Spinner,
  Row,
  Col,
  CustomInput
} from 'reactstrap';
import { MenuContext } from '../../context/MenuContext';
import { RestaurantContext } from '../../context/RestaurantContext';
import { BranchContext } from '../../context/BranchContext';
import { CategoryContext } from '../../context/CategoryContext';
import { AuthContext } from '../../context/AuthContext';

const ExportMenuItemModal = ({ isOpen, toggle }) => {
  const [loading, setLoading] = useState(false);
  const [format, setFormat] = useState('excel');
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [includeInactive, setIncludeInactive] = useState(true);
  
  const { exportMenuItems } = useContext(MenuContext);
  const { restaurants } = useContext(RestaurantContext);
  const { branches } = useContext(BranchContext);
  const { categories } = useContext(CategoryContext);
  const { user, isSuperAdmin } = useContext(AuthContext);
  const isUserSuperAdmin = isSuperAdmin();
  
  // Filter branches for the selected restaurant
  const filteredBranches = selectedRestaurantId
    ? branches.filter(branch => branch.restaurantId === selectedRestaurantId)
    : branches;
    
  // Filter categories for the selected restaurant
  const filteredCategories = selectedRestaurantId
    ? categories.filter(category => category.restaurantId === selectedRestaurantId)
    : categories;

  // Reset state when modal closes
  const handleClose = () => {
    setLoading(false);
    setFormat('excel');
    setSelectedRestaurantId('');
    setSelectedBranchId('');
    setSelectedCategoryId('');
    setIncludeInactive(true);
    toggle();
  };
  
  // Handle the export submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setLoading(true);
    try {
      // Prepare export filters
      const filters = {};
      
      // For Super Admin, use the selected restaurant
      if (isUserSuperAdmin) {
        if (selectedRestaurantId) {
          filters.restaurantId = selectedRestaurantId;
        }
      } 
      // For regular users, use their restaurant
      else if (user && user.restaurantId) {
        filters.restaurantId = user.restaurantId;
      }
      
      // Add branch filter if selected
      if (selectedBranchId) {
        filters.branchId = selectedBranchId;
      }
      
      // Add category filter if selected
      if (selectedCategoryId) {
        filters.categoryId = selectedCategoryId;
      }
      
      // Add active status filter
      if (!includeInactive) {
        filters.isActive = true;
      }
      
      const result = await exportMenuItems(filters, format);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to export menu items');
      }
      
      // Close modal on success
      handleClose();
    } catch (error) {
      console.error('Error exporting menu items:', error);
      
      // Create a more descriptive error message
      let errorMessage = 'Failed to export menu items: ';
      
      if (error.response?.data) {
        // If it's a response error with data
        errorMessage += typeof error.response.data === 'string' 
          ? error.response.data 
          : (error.response.data.message || JSON.stringify(error.response.data));
      } else if (error.message) {
        // If there's an error message
        errorMessage += error.message;
      } else {
        // Fallback
        errorMessage += 'Unknown server error';
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={handleClose}>
      <ModalHeader toggle={handleClose}>Export Menu Items</ModalHeader>
      <ModalBody>
        <p>Configure export options and click Export to download your menu items.</p>
        
        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md="6">
              <FormGroup>
                <Label for="exportFormat">Export Format</Label>
                <Input
                  type="select"
                  name="format"
                  id="exportFormat"
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  disabled={loading}
                >
                  <option value="excel">Excel (.xlsx)</option>
                  <option value="csv">CSV</option>
                </Input>
              </FormGroup>
            </Col>

            <Col md="6">
              <FormGroup>
                <Label for="exportCategory">Category</Label>
                <Input
                  type="select"
                  name="categoryId"
                  id="exportCategory"
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  disabled={loading || (isUserSuperAdmin && !selectedRestaurantId)}
                >
                  <option value="">All Categories</option>
                  {filteredCategories && filteredCategories.map(category => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </Input>
              </FormGroup>
            </Col>
            
            {isUserSuperAdmin && (
              <Col md="6">
                <FormGroup>
                  <Label for="exportRestaurant">Restaurant</Label>
                  <Input
                    type="select"
                    name="restaurantId"
                    id="exportRestaurant"
                    value={selectedRestaurantId}
                    onChange={(e) => {
                      setSelectedRestaurantId(e.target.value);
                      setSelectedBranchId('');
                      setSelectedCategoryId('');
                    }}
                    disabled={loading}
                  >
                    <option value="">All Restaurants</option>
                    {restaurants && restaurants.map(restaurant => (
                      <option key={restaurant._id} value={restaurant._id}>
                        {restaurant.name}
                      </option>
                    ))}
                  </Input>
                </FormGroup>
              </Col>
            )}
          </Row>
          
          <Row>
          {isUserSuperAdmin && (
            <Col md="6">
              <FormGroup>
                <Label for="exportBranch">Branch</Label>
                <Input
                  type="select"
                  name="branchId"
                  id="exportBranch"
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  disabled={loading || (isUserSuperAdmin && !selectedRestaurantId)}
                >
                  <option value="">All Branches</option>
                  {filteredBranches && filteredBranches.map(branch => (
                    <option key={branch._id} value={branch._id}>
                      {branch.name}
                    </option>
                  ))}
                </Input>
              </FormGroup>
            </Col>
          )} 
          </Row>
          
          <FormGroup check className="mb-3">
            <CustomInput
              type="checkbox"
              id="includeInactive"
              label="Include inactive menu items"
              checked={includeInactive}
              onChange={() => setIncludeInactive(!includeInactive)}
              disabled={loading}
            />
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button color="primary" onClick={handleSubmit} disabled={loading}>
          {loading ? <><Spinner size="sm" className="mr-2" /> Exporting...</> : 'Export'}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default ExportMenuItemModal;