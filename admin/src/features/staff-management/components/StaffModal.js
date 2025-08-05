import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
  FormGroup,
  Label,
  Input,
  Button,
  Alert,
  FormFeedback,
  Row,
  Col,
  InputGroup,
  InputGroupAddon,
  InputGroupText
} from 'reactstrap';

const StaffModal = ({ isOpen, toggle, staff, staffType, onSave, loading }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    role: '',
    status: 'active'
  });

  const [validation, setValidation] = useState({
    name: { valid: true, message: '' },
    email: { valid: true, message: '' },
    phoneNumber: { valid: true, message: '' },
    password: { valid: true, message: '', strength: 0 },
    confirmPassword: { valid: true, message: '' },
    role: { valid: true, message: '' }
  });

  const [showPassword, setShowPassword] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Initialize form data when modal opens or staff changes
  useEffect(() => {
    if (isOpen) {
      if (staff) {
        // Editing existing staff
        setFormData({
          name: staff.name || '',
          email: staff.email || '',
          phoneNumber: staff.phoneNumber || '',
          password: '',
          confirmPassword: '',
          role: staff.role || getDefaultRole(),
          status: staff.status || 'active'
        });
      } else {
        // Creating new staff
        setFormData({
          name: '',
          email: '',
          phoneNumber: '',
          password: '',
          confirmPassword: '',
          role: getDefaultRole(),
          status: 'active'
        });
      }
      
      // Reset validation
      setValidation({
        name: { valid: true, message: '' },
        email: { valid: true, message: '' },
        phoneNumber: { valid: true, message: '' },
        password: { valid: true, message: '', strength: 0 },
        confirmPassword: { valid: true, message: '' },
        role: { valid: true, message: '' }
      });
    }
  }, [isOpen, staff, staffType]);

  const getDefaultRole = () => {
    switch (staffType) {
      case 'employees':
        return 'Staff';
      case 'waiters':
        return 'Waiter';
      case 'chefs':
        return 'Chef';
      default:
        return 'Staff';
    }
  };

  const getRoleOptions = () => {
    switch (staffType) {
      case 'employees':
        return [
          { value: 'Staff', label: 'Staff' },
          { value: 'POS_Operator', label: 'POS Operator' }
        ];
      case 'waiters':
        return [{ value: 'Waiter', label: 'Waiter' }];
      case 'chefs':
        return [{ value: 'Chef', label: 'Chef' }];
      default:
        return [
          { value: 'Staff', label: 'Staff' },
          { value: 'POS_Operator', label: 'POS Operator' },
          { value: 'Waiter', label: 'Waiter' },
          { value: 'Chef', label: 'Chef' }
        ];
    }
  };

  const getPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    return strength;
  };

  const getPasswordStrengthLabel = (strength) => {
    if (strength === 0) return { text: "Very Weak", color: "danger" };
    if (strength === 1) return { text: "Weak", color: "danger" };
    if (strength === 2) return { text: "Fair", color: "warning" };
    if (strength === 3) return { text: "Good", color: "info" };
    if (strength === 4) return { text: "Strong", color: "success" };
    if (strength === 5) return { text: "Very Strong", color: "success" };
  };

  const validateField = (name, value) => {
    let isValid = true;
    let message = '';

    switch (name) {
      case 'name':
        if (!value.trim()) {
          isValid = false;
          message = 'Name is required';
        } else if (value.trim().length < 2) {
          isValid = false;
          message = 'Name must be at least 2 characters';
        }
        break;

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!value.trim()) {
          isValid = false;
          message = 'Email is required';
        } else if (!emailRegex.test(value)) {
          isValid = false;
          message = 'Please enter a valid email address';
        }
        break;

      case 'phoneNumber':
        if (!value.trim()) {
          isValid = false;
          message = 'Phone number is required';
        } else if (value.trim().length < 10) {
          isValid = false;
          message = 'Please enter a valid phone number';
        }
        break;

      case 'password':
        if (!staff && !value.trim()) { // Only required for new staff
          isValid = false;
          message = 'Password is required';
        } else if (value && value.length < 6) {
          isValid = false;
          message = 'Password must be at least 6 characters';
        }
        break;

      case 'confirmPassword':
        if (!staff && !value.trim()) { // Only required for new staff
          isValid = false;
          message = 'Please confirm your password';
        } else if (value !== formData.password) {
          isValid = false;
          message = 'Passwords do not match';
        }
        break;

      case 'role':
        if (!value) {
          isValid = false;
          message = 'Role is required';
        }
        break;

      default:
        break;
    }

    return { valid: isValid, message };
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Validate field
    const fieldValidation = validateField(name, value);
    
    // Special handling for password strength
    if (name === 'password') {
      fieldValidation.strength = getPasswordStrength(value);
    }

    setValidation(prev => ({
      ...prev,
      [name]: fieldValidation
    }));

    // Re-validate confirm password if password changed
    if (name === 'password' && formData.confirmPassword) {
      const confirmValidation = validateField('confirmPassword', formData.confirmPassword);
      setValidation(prev => ({
        ...prev,
        confirmPassword: confirmValidation
      }));
    }
  };

  const validateForm = () => {
    const fields = ['name', 'email', 'phoneNumber', 'role'];
    if (!staff) {
      fields.push('password', 'confirmPassword');
    }

    let isFormValid = true;
    const newValidation = { ...validation };

    fields.forEach(field => {
      const fieldValidation = validateField(field, formData[field]);
      newValidation[field] = fieldValidation;
      if (!fieldValidation.valid) {
        isFormValid = false;
      }
    });

    setValidation(newValidation);
    return isFormValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setFormSubmitting(true);

    try {
      const submitData = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phoneNumber: formData.phoneNumber.trim(),
        role: formData.role,
        status: formData.status
      };

      // Only include password for new staff or if password is provided for existing staff
      if (!staff || formData.password) {
        submitData.password = formData.password;
      }

      await onSave(submitData);
    } catch (error) {
      console.error('Error saving staff:', error);
    } finally {
      setFormSubmitting(false);
    }
  };

  const getModalTitle = () => {
    if (staff) {
      return `Edit ${staff.name}`;
    }
    
    switch (staffType) {
      case 'employees':
        return 'Add New Employee';
      case 'waiters':
        return 'Add New Waiter';
      case 'chefs':
        return 'Add New Chef';
      default:
        return 'Add New Staff Member';
    }
  };

  const passwordStrength = getPasswordStrength(formData.password);
  const passwordStrengthInfo = getPasswordStrengthLabel(passwordStrength);

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="lg" backdrop="static">
      <ModalHeader toggle={toggle}>
        <i className="fas fa-user-plus mr-2"></i>
        {getModalTitle()}
      </ModalHeader>
      
      <Form onSubmit={handleSubmit}>
        <ModalBody>
          <Row>
            <Col md="6">
              <FormGroup>
                <Label for="name">
                  Full Name <span className="text-danger">*</span>
                </Label>
                <Input
                  type="text"
                  name="name"
                  id="name"
                  placeholder="Enter full name"
                  value={formData.name}
                  onChange={handleInputChange}
                  invalid={!validation.name.valid}
                  className="form-control-alternative"
                />
                <FormFeedback>{validation.name.message}</FormFeedback>
              </FormGroup>
            </Col>
            
            <Col md="6">
              <FormGroup>
                <Label for="email">
                  Email Address <span className="text-danger">*</span>
                </Label>
                <Input
                  type="email"
                  name="email"
                  id="email"
                  placeholder="Enter email address"
                  value={formData.email}
                  onChange={handleInputChange}
                  invalid={!validation.email.valid}
                  className="form-control-alternative"
                />
                <FormFeedback>{validation.email.message}</FormFeedback>
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md="6">
              <FormGroup>
                <Label for="phoneNumber">
                  Phone Number <span className="text-danger">*</span>
                </Label>
                <Input
                  type="tel"
                  name="phoneNumber"
                  id="phoneNumber"
                  placeholder="Enter phone number"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  invalid={!validation.phoneNumber.valid}
                  className="form-control-alternative"
                />
                <FormFeedback>{validation.phoneNumber.message}</FormFeedback>
              </FormGroup>
            </Col>
            
            <Col md="6">
              <FormGroup>
                <Label for="role">
                  Role <span className="text-danger">*</span>
                </Label>
                <Input
                  type="select"
                  name="role"
                  id="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  invalid={!validation.role.valid}
                  className="form-control-alternative"
                >
                  <option value="">Select Role</option>
                  {getRoleOptions().map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Input>
                <FormFeedback>{validation.role.message}</FormFeedback>
              </FormGroup>
            </Col>
          </Row>

          {/* Password fields - only show for new staff or if editing existing staff */}
          <Row>
            <Col md="6">
              <FormGroup>
                <Label for="password">
                  {staff ? 'New Password (leave blank to keep current)' : 'Password'} 
                  {!staff && <span className="text-danger">*</span>}
                </Label>
                <InputGroup className="input-group-alternative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    id="password"
                    placeholder={staff ? "Enter new password" : "Enter password"}
                    value={formData.password}
                    onChange={handleInputChange}
                    invalid={!validation.password.valid}
                  />
                  <InputGroupAddon addonType="append">
                    <InputGroupText>
                      <Button
                        color="link"
                        size="sm"
                        className="p-0"
                        onClick={() => setShowPassword(!showPassword)}
                        type="button"
                      >
                        <i className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"}></i>
                      </Button>
                    </InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
                <FormFeedback>{validation.password.message}</FormFeedback>
                {formData.password && (
                  <small className={`text-${passwordStrengthInfo.color}`}>
                    Password Strength: {passwordStrengthInfo.text}
                  </small>
                )}
              </FormGroup>
            </Col>
            
            <Col md="6">
              <FormGroup>
                <Label for="confirmPassword">
                  {staff ? 'Confirm New Password' : 'Confirm Password'}
                  {!staff && <span className="text-danger">*</span>}
                </Label>
                <Input
                  type={showPassword ? "text" : "password"}
                  name="confirmPassword"
                  id="confirmPassword"
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  invalid={!validation.confirmPassword.valid}
                  className="form-control-alternative"
                />
                <FormFeedback>{validation.confirmPassword.message}</FormFeedback>
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md="6">
              <FormGroup>
                <Label for="status">Status</Label>
                <Input
                  type="select"
                  name="status"
                  id="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="form-control-alternative"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </Input>
              </FormGroup>
            </Col>
          </Row>

          {!staff && (
            <Alert color="info" className="mt-3">
              <i className="fas fa-info-circle mr-2"></i>
              The staff member will receive an email to verify their account after creation.
            </Alert>
          )}
        </ModalBody>

        <ModalFooter>
          <Button color="secondary" onClick={toggle} disabled={formSubmitting}>
            Cancel
          </Button>
          <Button 
            color="primary" 
            type="submit" 
            disabled={formSubmitting || loading}
          >
            {formSubmitting ? (
              <>
                <span className="spinner-border spinner-border-sm mr-2"></span>
                {staff ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <i className={`fas ${staff ? 'fa-save' : 'fa-plus'} mr-2`}></i>
                {staff ? 'Update Staff' : 'Create Staff'}
              </>
            )}
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  );
};

export default StaffModal;
