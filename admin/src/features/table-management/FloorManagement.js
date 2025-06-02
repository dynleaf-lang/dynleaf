import React, { useState, useEffect, useContext } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Row,
  Col,
  FormGroup,
  Label,
  Input,
  Table,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Spinner,
  Alert
} from 'reactstrap';
import { TableContext } from '../../context/TableContext';

const FloorManagement = () => {
  const { 
    floors = [], // Add default empty array to prevent undefined
    loading, 
    error,
    fetchFloors,
    createFloor,
    updateFloor,
    deleteFloor
  } = useContext(TableContext);
  
  const [modal, setModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [currentFloor, setCurrentFloor] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    level: 0,
    description: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [deleteId, setDeleteId] = useState(null);
  const [actionResult, setActionResult] = useState({
    show: false,
    type: 'success',
    message: ''
  });
  
  useEffect(() => {
    fetchFloors();
  }, []);
  
  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Floor name is required';
    if (formData.level === '' || isNaN(formData.level)) errors.level = 'Valid floor level is required';
    return errors;
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
  
  const toggleModal = () => {
    setModal(!modal);
    if (!modal) {
      // Opening the modal
      setFormErrors({});
      setActionResult({ show: false, type: 'success', message: '' });
    }
  };
  
  const toggleDeleteModal = () => {
    setDeleteModal(!deleteModal);
  };
  
  const handleAddFloor = () => {
    setCurrentFloor(null);
    setFormData({
      name: '',
      level: 0,
      description: ''
    });
    toggleModal();
  };
  
  const handleEditFloor = (floor) => {
    setCurrentFloor(floor);
    setFormData({
      name: floor.name,
      level: floor.level,
      description: floor.description || ''
    });
    toggleModal();
  };
  
  const handleDeleteConfirmation = (floorId) => {
    setDeleteId(floorId);
    toggleDeleteModal();
  };
  
  const handleSubmit = async () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    try {
      let result;
      if (currentFloor) {
        result = await updateFloor(currentFloor._id, formData);
      } else {
        result = await createFloor(formData);
      }
      
      if (result.success) {
        setActionResult({
          show: true,
          type: 'success',
          message: currentFloor 
            ? `Floor '${formData.name}' updated successfully` 
            : `Floor '${formData.name}' created successfully`
        });
        toggleModal();
        fetchFloors();
      } else {
        setActionResult({
          show: true,
          type: 'danger',
          message: result.error || 'An error occurred'
        });
      }
    } catch (err) {
      setActionResult({
        show: true,
        type: 'danger',
        message: err.message || 'An unexpected error occurred'
      });
    }
  };
  
  const handleDelete = async () => {
    try {
      const result = await deleteFloor(deleteId);
      if (result.success) {
        setActionResult({
          show: true,
          type: 'success',
          message: 'Floor deleted successfully'
        });
        toggleDeleteModal();
        fetchFloors();
      } else {
        setActionResult({
          show: true,
          type: 'danger',
          message: result.error || 'Failed to delete floor'
        });
      }
    } catch (err) {
      setActionResult({
        show: true,
        type: 'danger',
        message: err.message || 'An unexpected error occurred'
      });
    }
  };

  return (
    <Card className="shadow mb-4">
      <CardHeader className="py-3 d-flex justify-content-between align-items-center">
        <h3 className="mb-0 font-weight-bold text-primary">
          <i className="fas fa-building mr-2"></i>Floor Management
        </h3>
        <Button color="primary" onClick={handleAddFloor}>
          <i className="fas fa-plus mr-2"></i>Add New Floor
        </Button>
      </CardHeader>
      <CardBody>
        {actionResult.show && (
          <Alert color={actionResult.type} toggle={() => setActionResult({ ...actionResult, show: false })}>
            {actionResult.message}
          </Alert>
        )}
        
        {loading ? (
          <div className="text-center py-5">
            <Spinner color="primary" />
            <p className="mt-2">Loading floors...</p>
          </div>
        ) : error ? (
          <Alert color="danger">{error}</Alert>
        ) : floors.length === 0 ? (
          <div className="text-center py-5">
            <i className="fas fa-building fa-3x text-muted mb-3"></i>
            <p className="lead">No floors have been created yet.</p>
            <p>Click 'Add New Floor' to create your first floor.</p>
          </div>
        ) : (
          <Table responsive hover className="align-items-center">
            <thead className="thead-light">
              <tr>
                <th>Name</th>
                <th>Level</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {floors
                .sort((a, b) => a.level - b.level)
                .map(floor => (
                  <tr key={floor._id}>
                    <td className="font-weight-bold">{floor.name}</td>
                    <td>{floor.level}</td>
                    <td>{floor.description || '-'}</td>
                    <td>
                      <Button
                        color="info"
                        size="sm"
                        className="mr-2"
                        onClick={() => handleEditFloor(floor)}
                      >
                        <i className="fas fa-edit"></i> Edit
                      </Button>
                      <Button
                        color="danger"
                        size="sm"
                        onClick={() => handleDeleteConfirmation(floor._id)}
                      >
                        <i className="fas fa-trash"></i> Delete
                      </Button>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </Table>
        )}
      </CardBody>
      
      {/* Add/Edit Floor Modal */}
      <Modal isOpen={modal} toggle={toggleModal}>
        <ModalHeader toggle={toggleModal}>
          {currentFloor ? 'Edit Floor' : 'Add New Floor'}
        </ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label for="name">Floor Name *</Label>
            <Input
              type="text"
              name="name"
              id="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., Ground Floor, First Floor"
              invalid={!!formErrors.name}
            />
            {formErrors.name && (
              <div className="text-danger">{formErrors.name}</div>
            )}
          </FormGroup>
          <FormGroup>
            <Label for="level">Floor Level *</Label>
            <Input
              type="number"
              name="level"
              id="level"
              value={formData.level}
              onChange={handleInputChange}
              placeholder="e.g., 0 for ground floor, 1 for first floor"
              invalid={!!formErrors.level}
            />
            <small className="form-text text-muted">
              Use 0 for ground floor, 1 for first floor, -1 for basement, etc.
            </small>
            {formErrors.level && (
              <div className="text-danger">{formErrors.level}</div>
            )}
          </FormGroup>
          <FormGroup>
            <Label for="description">Description</Label>
            <Input
              type="textarea"
              name="description"
              id="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Optional floor description"
              rows="3"
            />
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggleModal}>
            Cancel
          </Button>
          <Button color="primary" onClick={handleSubmit}>
            {currentFloor ? 'Save Changes' : 'Add Floor'}
          </Button>
        </ModalFooter>
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteModal} toggle={toggleDeleteModal}>
        <ModalHeader toggle={toggleDeleteModal}>Confirm Delete</ModalHeader>
        <ModalBody>
          Are you sure you want to delete this floor? This action cannot be undone.
          <p className="mt-2 text-warning">
            <i className="fas fa-exclamation-triangle mr-2"></i>
            Warning: Deleting a floor will not delete the tables assigned to it. Those tables will need to be reassigned to other floors.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggleDeleteModal}>
            Cancel
          </Button>
          <Button color="danger" onClick={handleDelete}>
            Delete Floor
          </Button>
        </ModalFooter>
      </Modal>
    </Card>
  );
};

export default FloorManagement;