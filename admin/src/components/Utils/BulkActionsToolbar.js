import React, { useState, useContext } from 'react';
import {
  Button,
  ButtonGroup,
  UncontrolledDropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
  Spinner
} from 'reactstrap';
import { MenuContext } from '../../context/MenuContext';

const BulkActionsToolbar = ({ 
  selectedItems, 
  clearSelection, 
  refreshData,
  toggleImportModal,
  toggleExportModal
}) => {
  const [actionInProgress, setActionInProgress] = useState(false);
  const { bulkUpdateMenuItems, bulkDeleteMenuItems } = useContext(MenuContext);
  
  // Bulk update status (active/inactive) of selected items
  const handleBulkStatusUpdate = async (isActive) => {
    if (!selectedItems.length) return;
    
    setActionInProgress(true);
    try {
      const result = await bulkUpdateMenuItems(selectedItems, { isActive });
      if (result.success) {
        clearSelection();
        refreshData();
      } else {
        alert(`Failed to update status: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating items:', error);
      alert('An error occurred while updating items');
    } finally {
      setActionInProgress(false);
    }
  };
  
  // Bulk mark items as featured/unfeatured
  const handleBulkFeaturedUpdate = async (featured) => {
    if (!selectedItems.length) return;
    
    setActionInProgress(true);
    try {
      const result = await bulkUpdateMenuItems(selectedItems, { featured });
      if (result.success) {
        clearSelection();
        refreshData();
      } else {
        alert(`Failed to update featured status: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating featured status:', error);
      alert('An error occurred while updating featured status');
    } finally {
      setActionInProgress(false);
    }
  };
  
  // Bulk delete selected items
  const handleBulkDelete = async () => {
    if (!selectedItems.length) return;
    
    if (!window.confirm(`Are you sure you want to delete ${selectedItems.length} selected item(s)?`)) {
      return;
    }
    
    setActionInProgress(true);
    try {
      const result = await bulkDeleteMenuItems(selectedItems);
      if (result.success) {
        clearSelection();
        refreshData();
      } else {
        alert(`Failed to delete items: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting items:', error);
      alert('An error occurred while deleting items');
    } finally {
      setActionInProgress(false);
    }
  };

  return (
    <div className="d-flex align-items-center mb-3">
      <span className="mr-2">
        {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
      </span>
      
      <ButtonGroup className="mr-2">
        <UncontrolledDropdown>
          <DropdownToggle caret color="primary" size="sm" disabled={actionInProgress || selectedItems.length === 0}>
            Bulk Actions {actionInProgress && <Spinner size="sm" className="ml-1" />}
          </DropdownToggle>
          <DropdownMenu>
            <DropdownItem header>Status Updates</DropdownItem>
            <DropdownItem onClick={() => handleBulkStatusUpdate(true)}>
              <i className="fas fa-check-circle text-success mr-2"></i> Mark as Available
            </DropdownItem>
            <DropdownItem onClick={() => handleBulkStatusUpdate(false)}>
              <i className="fas fa-times-circle text-warning mr-2"></i> Mark as Unavailable
            </DropdownItem>
            <DropdownItem divider />
            <DropdownItem header>Feature Status</DropdownItem>
            <DropdownItem onClick={() => handleBulkFeaturedUpdate(true)}>
              <i className="fas fa-star text-info mr-2"></i> Add to Featured
            </DropdownItem>
            <DropdownItem onClick={() => handleBulkFeaturedUpdate(false)}>
              <i className="fas fa-star-half-alt text-muted mr-2"></i> Remove from Featured
            </DropdownItem>
          </DropdownMenu>
        </UncontrolledDropdown>
      </ButtonGroup>
      
      <Button color="danger" size="sm" className="mr-2" 
        disabled={actionInProgress || selectedItems.length === 0}
        onClick={handleBulkDelete}>
        <i className="fas fa-trash mr-1"></i> Delete
      </Button>
      
      <Button color="secondary" size="sm" onClick={clearSelection} 
        disabled={actionInProgress || selectedItems.length === 0}>
        Cancel
      </Button>
      
      <div className="ml-auto">
        <Button color="success" size="sm" className="mr-2" onClick={toggleImportModal}>
          <i className="fas fa-file-import mr-1"></i> Import
        </Button>
        <Button color="info" size="sm" onClick={toggleExportModal}>
          <i className="fas fa-file-export mr-1"></i> Export
        </Button>
      </div>
    </div>
  );
};

export default BulkActionsToolbar;