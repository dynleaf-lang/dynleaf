import React, { useState, useContext, useEffect } from 'react';
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
  FormText,
  Alert,
  Spinner,
  CustomInput
} from 'reactstrap';
import { MenuContext } from '../../context/MenuContext';
import { RestaurantContext } from '../../context/RestaurantContext';
import { BranchContext } from '../../context/BranchContext';
import { AuthContext } from '../../context/AuthContext';   



const ImportMenuItemModal = ({ isOpen, toggle }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  
  const { importMenuItems } = useContext(MenuContext);
  const { restaurants } = useContext(RestaurantContext);
  const { branches } = useContext(BranchContext);
  const { user, isSuperAdmin } = useContext(AuthContext);
  const isUserSuperAdmin = isSuperAdmin();
  
  // Set initial restaurant and branch values for non-superadmin users
  useEffect(() => {
    if (!isUserSuperAdmin && user) {
      if (user.restaurantId) {
        setSelectedRestaurantId(user.restaurantId);
      }
      if (user.branchId) {
        setSelectedBranchId(user.branchId);
      }
    }
  }, [isUserSuperAdmin, user]);
  
  // Handle file selection
  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  // Filter branches for the selected restaurant
  const filteredBranches = selectedRestaurantId
    ? branches.filter(branch => branch.restaurantId === selectedRestaurantId)
    : branches;
  
  // Reset state when modal closes
  const handleClose = () => {
    setFile(null);
    setLoading(false);
    setResult(null);
    
    // Reset to user defaults for non-superadmin, clear for superadmin
    if (!isUserSuperAdmin && user) {
      setSelectedRestaurantId(user.restaurantId || '');
      setSelectedBranchId(user.branchId || '');
    } else {
      setSelectedRestaurantId('');
      setSelectedBranchId('');
    }
    
    setOverwriteExisting(false);
    toggle();
  };
  
  // Handle the import submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      alert('Please select a file to import');
      return;
    }
    
    setLoading(true);
    try {
      // Prepare import options
      const importOptions = {
        overwrite: overwriteExisting
      };
      
      // For Super Admin, use the selected restaurant and branch
      if (isUserSuperAdmin) {
        if (selectedRestaurantId) {
          importOptions.restaurantId = selectedRestaurantId;
          
          if (selectedBranchId) {
            importOptions.branchId = selectedBranchId;
          }
        }
      } 
      // For regular users, use their restaurant
      else if (user && user.restaurantId) {
        importOptions.restaurantId = user.restaurantId;
        
        if (user.branchId || selectedBranchId) {
          importOptions.branchId = user.branchId || selectedBranchId;
        }
      }
      
      const response = await importMenuItems(file, importOptions);
      setResult(response);
      
      if (response.success) {
        // Clear the file input on success
        setFile(null);
        
        // Close modal after 3 seconds on success
        setTimeout(() => {
          handleClose();
        }, 3000);
      }
    } catch (error) {
      console.error('Error importing menu items:', error);
      setResult({
        success: false,
        error: error.message || 'An unexpected error occurred during import'
      });
    } finally {
      setLoading(false);
    }
  };
  
  
  // Download sample import template
  const downloadSampleTemplate = () => {
    const link = document.createElement('a');
    link.href = `${process.env.PUBLIC_URL}/assets/samples/menu-items-import-template.xlsx`; 
    link.setAttribute('download', 'menu-items-import-template.xlsx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Modal isOpen={isOpen} toggle={handleClose} size="lg">
      <ModalHeader toggle={handleClose}>Import Menu Items</ModalHeader>
      <ModalBody>
        {result && (
          <Alert color={result.success ? 'success' : 'danger'} className="mb-4">
            {result.success ? (
              <>
                <i className="fas fa-check-circle mr-2"></i>
                Successfully imported {result.importedCount || '0'} menu items.
                {result.skippedCount > 0 && ` (${result.skippedCount} skipped)`}
                {result.errorCount > 0 && ` (${result.errorCount} errors)`}
              </>
            ) : (
              <>
                <i className="fas fa-exclamation-triangle mr-2"></i>
                {result.error || 'Failed to import menu items'}
              </>
            )}
          </Alert>
        )}
        
        <p>Upload an Excel (.xlsx) or CSV file with menu items to import.</p>
        
        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label for="fileInput">Select File</Label>
            <Input 
              type="file" 
              name="file" 
              id="fileInput"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              disabled={loading}
            />
            <FormText color="muted">
              Supported formats: Excel (.xlsx, .xls) or CSV
            </FormText>
          </FormGroup>
          
          {isUserSuperAdmin && (
            <FormGroup>
              <Label for="importRestaurant">Restaurant</Label>
              <Input
                type="select"
                name="restaurantId"
                id="importRestaurant"
                value={selectedRestaurantId}
                onChange={(e) => {
                  setSelectedRestaurantId(e.target.value);
                  setSelectedBranchId(''); // Reset branch when restaurant changes
                }}
                disabled={loading}
              >
                <option value="">Select Restaurant</option>
                {restaurants && restaurants.map(restaurant => (
                  <option key={restaurant._id} value={restaurant._id}>
                    {restaurant.name}
                  </option>
                ))}
              </Input>
              <FormText color="muted">
                Select the restaurant to import menu items for
              </FormText>
            </FormGroup>
          )}
          
          {isUserSuperAdmin && (
            // For non-superadmin users, show read-only restaurant info if available
            user && user.restaurantId && (
              <FormGroup>
                <Label>Restaurant</Label>
                <Input
                  type="text"
                  value={restaurants.find(r => r._id === user.restaurantId)?.name || 'Your Restaurant'}
                   
                  className="bg-light"
                />
                <input type="hidden" name="restaurantId" value={user.restaurantId} />
              </FormGroup>
            )
          )}
           
          <FormGroup>
            <Label for="importBranch">Branch</Label>
            {isUserSuperAdmin ? (
              <Input
                type="select"
                name="branchId"
                id="importBranch"
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                disabled={loading || !selectedRestaurantId}
              >
                <option value="">All Branches</option>
                {filteredBranches && filteredBranches.map(branch => (
                  <option key={branch._id} value={branch._id}>
                    {branch.name}
                  </option>
                ))}
              </Input>
            ) : user && user.branchId ? (
              <>
                <Input
                  type="text"
                  value={branches.find(b => b._id === user.branchId)?.name || 'Your Branch'}
                  disabled
                  className="bg-light"
                />
                <input type="hidden" name="branchId" value={user.branchId} />
              </>
            ) : (
              <Input
                type="select"
                name="branchId"
                id="importBranch"
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                disabled={loading}
              >
                <option value="">All Branches</option>
                {filteredBranches && filteredBranches.map(branch => (
                  <option key={branch._id} value={branch._id}>
                    {branch.name}
                  </option>
                ))}
              </Input>
            )}
            <FormText color="muted">
              {isUserSuperAdmin ? 
                'Optional: Select a specific branch or leave blank for all branches' : 
                user && user.branchId ? 
                'Menu items will be imported for your branch' :
                'Optional: Select a specific branch or leave blank for all branches'}
            </FormText>
          </FormGroup> 
          
          <FormGroup check className="mb-3">
            <CustomInput
              type="checkbox"
              id="overwriteExisting"
              label="Overwrite existing items with the same name"
              checked={overwriteExisting}
              onChange={() => setOverwriteExisting(!overwriteExisting)}
              disabled={loading}
            />
            <FormText color="muted">
              If checked, existing menu items with the same name will be updated. Otherwise, duplicates will be skipped.
            </FormText>
          </FormGroup>
        </Form>
        
        <div className="text-center mt-4">
          <Button color="link" onClick={downloadSampleTemplate} disabled={loading}>
            <i className="fas fa-download mr-1"></i> Download Sample Template
          </Button>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button color="primary" onClick={handleSubmit} disabled={!file || loading}>
          {loading ? <><Spinner size="sm" className="mr-2" /> Importing...</> : 'Import'}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default ImportMenuItemModal;