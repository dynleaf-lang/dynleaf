import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  CardBody, 
  Form, 
  FormGroup, 
  Label, 
  Input, 
  Button, 
  Alert,
  Spinner
} from 'reactstrap';
import { FaUser, FaLock, FaCashRegister, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const { login, loading, error, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      navigate('/dashboard');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <div className="login-page">
      <Container fluid className="h-100">
        <Row className="h-100 align-items-center justify-content-center">
          <Col md={6} lg={4}>
            <Card className="login-card shadow-lg">
              <CardBody className="p-5">
                <div className="text-center mb-4">
                  <div className="login-icon mb-3">
                    <FaCashRegister size={60} className="text-white" />
                  </div>
                  <h2 className="login-title">POS System</h2>
                  <p className="text-muted">Sign in to your account</p>
                </div>

                {error && (
                  <Alert color="danger" className="mb-4" fade={false}>
                    <small>{error}</small>
                  </Alert>
                )}

                <Form onSubmit={handleSubmit}>
                  <FormGroup className="mb-3">
                    <Label for="email" className="form-label">
                      <FaUser className="me-2" />
                      Email Address
                    </Label>
                    <Input
                      type="email"
                      id="email"
                      name="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={handleChange}
                      onKeyPress={handleKeyPress}
                      invalid={!!errors.email}
                      className="form-control-lg"
                      autoComplete="email"
                      autoFocus
                    />
                    {errors.email && (
                      <div className="invalid-feedback">
                        {errors.email}
                      </div>
                    )}
                  </FormGroup>

                  <FormGroup className="mb-4">
                    <Label for="password" className="form-label">
                      <FaLock className="me-2" />
                      Password
                    </Label>
                    <div className="password-input-wrapper">
                      <Input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        name="password"
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={handleChange}
                        onKeyPress={handleKeyPress}
                        invalid={!!errors.password}
                        className="form-control-lg"
                        autoComplete="current-password"
                      />
                      <Button
                        type="button"
                        color="link"
                        className="password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </Button>
                    </div>
                    {errors.password && (
                      <div className="invalid-feedback">
                        {errors.password}
                      </div>
                    )}
                  </FormGroup>

                  <Button
                    type="submit"
                    color="primary"
                    size="lg"
                    block
                    disabled={loading}
                    className="login-button"
                  >
                    {loading ? (
                      <>
                        <Spinner size="sm" className="me-2" />
                        Signing In...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </Form>

                <div className="text-center mt-4">
                  <small className="text-muted">
                    POS System v1.0 - Restaurant Management
                  </small>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Login;
