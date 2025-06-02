import React, { useState, useEffect, useContext } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Form,
  FormGroup,
  Label,
  Input,
  Row,
  Col,
  Alert,
  Spinner,
  CustomInput,
  Badge
} from 'reactstrap';
import { TableContext } from '../../context/TableContext';
import { AuthContext } from '../../context/AuthContext';

const TableCreate = ({ onTableCreated }) => {
  const { createTable, tableZones, fetchTableZones, floors, fetchFloors, loading, error } = useContext(TableContext);
  const { user } = useContext(AuthContext);
  
  const [formData, setFormData] = useState({
    tableId: '',
    restaurantId: '',
    branchId: '',
    capacity: 4,
    status: 'available',
    isVIP: false,
    location: {
      floor: '',
      zone: 'Main',
      x: 50,
      y: 50
    },
    shape: 'square',
    size: {
      width: 80,
      height: 80
    }
  });
  
  const [formErrors, setFormErrors] = useState({});
  const [submitResult, setSubmitResult] = useState({
    show: false,
    type: 'success',
    message: ''
  });
  
  useEffect(() => {
    fetchTableZones();
    fetchFloors();
    
    if (user) {
      setFormData(prev => ({
        ...prev,
        restaurantId: user.restaurantId || '',
        branchId: user.branchId || ''
      }));
    }
  }, [user]);
  
  useEffect(() => {
    // Set default floor when floors are loaded
    if (floors && floors.length > 0 && !formData.location.floor) {
      setFormData(prev => ({
        ...prev,
        location: {
          ...prev.location,
          floor: floors[0]._id
        }
      }));
    }
  }, [floors]);
  
  const handleInputChange = (e) => {
    const { name, value, checked, type } = e.target;
    
    if (name === 'floor') {
      setFormData({
        ...formData,
        location: {
          ...formData.location,
          floor: value
        }
      });
    } else if (name === 'zone') {
      setFormData({
        ...formData,
        location: {
          ...formData.location,
          zone: value
        }
      });
    } else if (name === 'width' || name === 'height') {
      setFormData({
        ...formData,
        size: {
          ...formData.size,
          [name]: value
        }
      });
    } else if (name === 'isVIP') {
      setFormData({
        ...formData,
        isVIP: checked
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value
      });
    }
  };
  
  const validateForm = () => {
    const errors = {};
    if (!formData.tableId.trim()) {
      errors.tableId = 'Table ID is required';
    }
    if (!formData.branchId) {
      errors.branchId = 'Branch is required';
    }
    if (!formData.location.floor) {
      errors.floor = 'Floor is required';
    }
    if (!formData.location.zone) {
      errors.zone = 'Zone is required';
    }
    if (formData.capacity <= 0) {
      errors.capacity = 'Capacity must be greater than 0';
    }
    return errors;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    try {
      // Create the table
      const result = await createTable(formData);
      
      if (result.success) {
        setSubmitResult({
          show: true,
          type: 'success',
          message: `Table ${formData.tableId} created successfully!`
        });
        
        // Reset form
        setFormData({
          tableId: '',
          restaurantId: user.restaurantId || '',
          branchId: user.branchId || '',
          capacity: 4,
          status: 'available',
          isVIP: false,
          location: {
            floor: formData.location.floor, // Keep the selected floor
            zone: formData.location.zone,   // Keep the selected zone
            x: 50,
            y: 50
          },
          shape: 'square',
          size: {
            width: 80,
            height: 80
          }
        });
        
        // Reset errors
        setFormErrors({});
        
        // Call the callback if provided
        if (onTableCreated) {
          onTableCreated(result.table);
        }
      } else {
        setSubmitResult({
          show: true,
          type: 'danger',
          message: result.error || 'Error creating table'
        });
      }
    } catch (err) {
      setSubmitResult({
        show: true,
        type: 'danger',
        message: err.message || 'Unexpected error occurred'
      });
    }
  };

  return (
    <Card className="shadow mb-4">
      <CardHeader className="py-3">
        <h3 className="mb-0 font-weight-bold text-primary">
          <i className="fas fa-plus-circle mr-2"></i>Add New Table
        </h3>
      </CardHeader>
      <CardBody>
        {submitResult.show && (
          <Alert color={submitResult.type} toggle={() => setSubmitResult({ ...submitResult, show: false })}>
            {submitResult.message}
          </Alert>
        )}
        
        {loading ? (
          <div className="text-center py-4">
            <Spinner color="primary" />
            <p className="mt-2">Loading form data...</p>
          </div>
        ) : (
          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={6}>
                <FormGroup>
                  <Label for="tableId">Table ID/Number *</Label>
                  <Input
                    type="text"
                    name="tableId"
                    id="tableId"
                    placeholder="e.g., T-101, Table 5"
                    value={formData.tableId}
                    onChange={handleInputChange}
                    invalid={!!formErrors.tableId}
                  />
                  {formErrors.tableId && (
                    <div className="text-danger">{formErrors.tableId}</div>
                  )}
                </FormGroup>
                
                <FormGroup>
                  <Label for="floor">Floor *</Label>
                  <Input
                    type="select"
                    name="floor"
                    id="floor"
                    value={formData.location.floor}
                    onChange={handleInputChange}
                    invalid={!!formErrors.floor}
                  >
                    <option value="">Select a floor</option>
                    {floors
                      .sort((a, b) => a.level - b.level)
                      .map(floor => (
                        <option key={floor._id} value={floor._id}>
                          {floor.name}
                        </option>
                      ))
                    }
                  </Input>
                  {floors.length === 0 && (
                    <small className="text-muted">
                      No floors available. Please create a floor first in Floor Management.
                    </small>
                  )}
                  {formErrors.floor && (
                    <div className="text-danger">{formErrors.floor}</div>
                  )}
                </FormGroup>
                
                <FormGroup>
                  <Label for="zone">Zone *</Label>
                  <Input
                    type="select"
                    name="zone"
                    id="zone"
                    value={formData.location.zone}
                    onChange={handleInputChange}
                    invalid={!!formErrors.zone}
                  >
                    {tableZones.length > 0 ? (
                      tableZones.map(zone => (
                        <option key={zone} value={zone}>
                          {zone}
                        </option>
                      ))
                    ) : (
                      <option value="Main">Main</option>
                    )}
                  </Input>
                  {formErrors.zone && (
                    <div className="text-danger">{formErrors.zone}</div>
                  )}
                </FormGroup>
                
                <FormGroup>
                  <Label for="capacity">Capacity *</Label>
                  <Input
                    type="number"
                    name="capacity"
                    id="capacity"
                    value={formData.capacity}
                    onChange={handleInputChange}
                    min="1"
                    invalid={!!formErrors.capacity}
                  />
                  {formErrors.capacity && (
                    <div className="text-danger">{formErrors.capacity}</div>
                  )}
                </FormGroup>
              </Col>
              
              <Col md={6}>
                <FormGroup>
                  <Label for="status">Status</Label>
                  <Input
                    type="select"
                    name="status"
                    id="status"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="reserved">Reserved</option>
                    <option value="maintenance">Maintenance</option>
                  </Input>
                </FormGroup>
                
                <FormGroup>
                  <Label for="shape">Table Shape</Label>
                  <Input
                    type="select"
                    name="shape"
                    id="shape"
                    value={formData.shape}
                    onChange={handleInputChange}
                  >
                    <option value="square">Square</option>
                    <option value="rectangle">Rectangle</option>
                    <option value="round">Round</option>
                  </Input>
                </FormGroup>
                
                <Row>
                  <Col>
                    <FormGroup>
                      <Label for="width">Width (cm)</Label>
                      <Input
                        type="number"
                        name="width"
                        id="width"
                        value={formData.size.width}
                        onChange={handleInputChange}
                        min="40"
                      />
                    </FormGroup>
                  </Col>
                  <Col>
                    <FormGroup>
                      <Label for="height">
                        {formData.shape === 'round' ? 'Diameter (cm)' : 'Height (cm)'}
                      </Label>
                      <Input
                        type="number"
                        name="height"
                        id="height"
                        value={formData.shape === 'round' ? formData.size.width : formData.size.height}
                        onChange={handleInputChange}
                        min="40"
                        disabled={formData.shape === 'round'}
                      />
                    </FormGroup>
                  </Col>
                </Row>
                
                <FormGroup className="mt-3">
                  <CustomInput
                    type="checkbox"
                    id="isVIP"
                    name="isVIP"
                    label="VIP Table"
                    checked={formData.isVIP}
                    onChange={handleInputChange}
                  />
                  <small className="text-muted d-block mt-1">
                    VIP tables have priority for reservations and special services
                  </small>
                </FormGroup>
              </Col>
            </Row>
            
            <div className="d-flex justify-content-between align-items-center mt-4">
              <div>
                <Badge color="info" className="mr-2">Floor: {floors.find(f => f._id === formData.location.floor)?.name || 'Not selected'}</Badge>
                <Badge color="info" className="mr-2">Zone: {formData.location.zone}</Badge>
                <Badge color="info">Capacity: {formData.capacity}</Badge>
              </div>
              <Button color="primary" type="submit" disabled={loading}>
                <i className="fas fa-plus-circle mr-2"></i>
                Create Table
              </Button>
            </div>
          </Form>
        )}
      </CardBody>
    </Card>
  );
};

export default TableCreate;