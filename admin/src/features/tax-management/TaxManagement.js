import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Container,
  Row,
  Col,
  Table,
  Button,
  Form,
  FormGroup,
  Label,
  Input,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Spinner,
  Alert
} from 'reactstrap';
import { useTax } from '../../context/TaxContext';
import countryList from 'react-select-country-list';
import Header from '../../components/Headers/Header'; 

const TaxManagement = () => {
  const [modal, setModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentTax, setCurrentTax] = useState(null);
  const [formData, setFormData] = useState({
    country: '',
    name: '',
    percentage: 0,
    isCompound: false,
    description: '',
    active: true
  });
  const [formErrors, setFormErrors] = useState({});
  const [countries] = useState(countryList().getData());
  const [successMessage, setSuccessMessage] = useState('');

  const { 
    taxes, 
    loading, 
    error, 
    getAllTaxes, 
    createTax, 
    updateTax, 
    deleteTax 
  } = useTax();

  // Fetch taxes only on initial mount
  useEffect(() => {
    console.log('Fetching taxes on component mount');
    getAllTaxes();
    // Don't include getAllTaxes in dependency array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toggle modal
  const toggle = () => {
    setModal(!modal);
    if (!modal) {
      // Reset form when opening modal
      resetForm();
    }
  };

  // Reset form state
  const resetForm = () => {
    setFormData({
      country: '',
      name: '',
      percentage: 0,
      isCompound: false,
      description: '',
      active: true
    });
    setFormErrors({});
    setEditMode(false);
    setCurrentTax(null);
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
    
    // Clear error for this field if exists
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: ''
      });
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    
    if (!formData.country) {
      errors.country = 'Country is required';
    }
    
    if (!formData.name) {
      errors.name = 'Tax name is required';
    }
    
    if (isNaN(formData.percentage) || formData.percentage < 0) {
      errors.percentage = 'Percentage must be a positive number';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      if (editMode) {
        await updateTax(currentTax.country, formData);
        setSuccessMessage(`Tax settings for ${formData.country} updated successfully`);
      } else {
        await createTax(formData);
        setSuccessMessage(`Tax settings for ${formData.country} created successfully`);
      }
      
      toggle(); // Close modal
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      console.error('Error saving tax:', err);
    }
  };

  // Open edit modal for a tax
  const handleEdit = (tax) => {
    setCurrentTax(tax);
    setFormData({
      country: tax.country,
      name: tax.name,
      percentage: tax.percentage,
      isCompound: tax.isCompound,
      description: tax.description || '',
      active: tax.active
    });
    setEditMode(true);
    setModal(true);
  };

  // Handle tax deletion
  const handleDelete = async (countryCode) => {
    if (window.confirm(`Are you sure you want to delete tax settings for ${countryCode}?`)) {
      try {
        await deleteTax(countryCode);
        setSuccessMessage(`Tax settings for ${countryCode} deleted successfully`);
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      } catch (err) {
        console.error(`Error deleting tax for ${countryCode}:`, err);
      }
    }
  };

  return (
    <>
      <Header />
      <Container className="mt--7" fluid>
      <Row>
        <Col>
          <Card className="shadow">
            <CardHeader className="border-0">
              <Row className="align-items-center">
                <Col xs="8">
                  <h3 className="mb-0">Tax Management</h3>
                </Col>
                <Col className="text-right" xs="4">
                  <Button
                    color="primary"
                    onClick={toggle}
                    disabled={loading}
                  >
                    Add New Tax
                  </Button>
                </Col>
              </Row>
            </CardHeader>
            <CardBody>
              {successMessage && (
                <Alert color="success" className="mb-4">
                  {successMessage}
                </Alert>
              )}
              
              {error && (
                <Alert color="danger" className="mb-4">
                  {error}
                </Alert>
              )}
              
              {loading ? (
                <div className="text-center py-4">
                  <Spinner color="primary" />
                </div>
              ) : taxes.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted">No tax settings found. Click "Add New Tax" to create one.</p>
                </div>
              ) : (
                <Table className="align-items-center table-flush" responsive>
                  <thead className="thead-light">
                    <tr>
                      <th scope="col">Country</th>
                      <th scope="col">Tax Name</th>
                      <th scope="col">Percentage</th>
                      <th scope="col">Compound</th>
                      <th scope="col">Status</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taxes.map((tax) => (
                      <tr key={tax.country}>
                        <td>
                          {countries.find(c => c.value === tax.country)?.label || tax.country}
                        </td>
                        <td>{tax.name}</td>
                        <td>{tax.percentage}%</td>
                        <td>{tax.isCompound ? 'Yes' : 'No'}</td>
                        <td>
                          <span className={`badge badge-${tax.active ? 'success' : 'danger'}`}>
                            {tax.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <Button
                            color="info"
                            size="sm"
                            className="mr-2"
                            onClick={() => handleEdit(tax)}
                          >
                            Edit
                          </Button>
                          <Button
                            color="danger"
                            size="sm"
                            onClick={() => handleDelete(tax.country)}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
      
      {/* Add/Edit Tax Modal */}
      <Modal isOpen={modal} toggle={toggle}>
        <ModalHeader toggle={toggle}>
          {editMode ? 'Edit Tax Settings' : 'Add New Tax Settings'}
        </ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Label for="country">Country</Label>
              <Input
                type="select"
                name="country"
                id="country"
                value={formData.country}
                onChange={handleChange}
                disabled={editMode}
                invalid={!!formErrors.country}
              >
                <option value="">Select Country</option>
                {countries.map((country) => (
                  <option key={country.value} value={country.value}>
                    {country.label}
                  </option>
                ))}
              </Input>
              {formErrors.country && <div className="text-danger">{formErrors.country}</div>}
            </FormGroup>
            
            <FormGroup>
              <Label for="name">Tax Name</Label>
              <Input
                type="text"
                name="name"
                id="name"
                placeholder="e.g., VAT, GST, Sales Tax"
                value={formData.name}
                onChange={handleChange}
                invalid={!!formErrors.name}
              />
              {formErrors.name && <div className="text-danger">{formErrors.name}</div>}
            </FormGroup>
            
            <FormGroup>
              <Label for="percentage">Percentage (%)</Label>
              <Input
                type="number"
                name="percentage"
                id="percentage"
                placeholder="Tax percentage"
                value={formData.percentage}
                onChange={handleChange}
                min="0"
                step="0.01"
                invalid={!!formErrors.percentage}
              />
              {formErrors.percentage && <div className="text-danger">{formErrors.percentage}</div>}
            </FormGroup>
            
            <FormGroup check className="mb-3">
              <Label check>
                <Input
                  type="checkbox"
                  name="isCompound"
                  checked={formData.isCompound}
                  onChange={handleChange}
                />{' '}
                Is Compound Tax
                <small className="form-text text-muted">
                  Compound taxes are calculated on top of other taxes. Most countries use simple tax.
                </small>
              </Label>
            </FormGroup>
            
            <FormGroup>
              <Label for="description">Description</Label>
              <Input
                type="textarea"
                name="description"
                id="description"
                placeholder="Optional description"
                value={formData.description}
                onChange={handleChange}
              />
            </FormGroup>
            
            <FormGroup check className="mb-3">
              <Label check>
                <Input
                  type="checkbox"
                  name="active"
                  checked={formData.active}
                  onChange={handleChange}
                />{' '}
                Active
              </Label>
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggle}>
            Cancel
          </Button>
          <Button color="primary" onClick={handleSubmit} disabled={loading}>
            {loading ? <Spinner size="sm" /> : editMode ? 'Update' : 'Save'}
          </Button>
        </ModalFooter>
      </Modal>
    </Container>
    </>
   
  );
};

export default TaxManagement;