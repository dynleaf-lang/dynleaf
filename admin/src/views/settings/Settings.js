import React, { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  Container,
  Row,
  Col,
  FormGroup,
  Label,
  Input,
  CustomInput,
  Button,
  Alert,
  Spinner,
  Badge
} from "reactstrap";
import { useSettings } from "../../context/SettingsContext";
import { useAuth } from "../../context/AuthContext";
import Header from "components/Headers/Header.js";

const Settings = () => {
  const { 
    availableFeatures, 
    featureSettings, 
    updateFeatureSetting, 
    loading, 
    error 
  } = useSettings();
  
  const { user } = useAuth();
  const [successMessage, setSuccessMessage] = useState("");
  const [updatingFeature, setUpdatingFeature] = useState(null);

  // Toggle feature status
  const handleFeatureToggle = async (featureId, enabled) => {
    setUpdatingFeature(featureId);
    try {
      await updateFeatureSetting(featureId, enabled);
      setSuccessMessage(`${featureId.replace('_', ' ')} has been ${enabled ? 'enabled' : 'disabled'}`);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
    } catch (err) {
      console.error(`Error toggling feature ${featureId}:`, err);
    } finally {
      setUpdatingFeature(null);
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
                  <div className="col">
                    <h3 className="mb-0">Feature Settings</h3>
                    {user?.role === "Branch_Manager" && (
                      <p className="text-muted mb-0">
                        Configure features for {user?.branchName || "your branch"}
                      </p>
                    )}
                    {user?.role === "Super_Admin" && (
                      <p className="text-muted mb-0">
                        Configure system-wide default features
                      </p>
                    )}
                  </div>
                </Row>
              </CardHeader>
              <CardBody>
                {loading && !updatingFeature && (
                  <div className="text-center my-3">
                    <Spinner color="primary" />
                    <p className="mt-2">Loading settings...</p>
                  </div>
                )}

                {error && (
                  <Alert color="warning">
                    <i className="fas fa-exclamation-triangle mr-2"></i>
                    {error}
                  </Alert>
                )}

                {successMessage && (
                  <Alert color="success" className="mb-4">
                    <i className="fas fa-check-circle mr-2"></i>
                    {successMessage}
                  </Alert>
                )}

                {!loading && availableFeatures.length === 0 && (
                  <Alert color="info">
                    Your role doesn't have permission to modify feature settings
                  </Alert>
                )}

                <Row>
                  {availableFeatures.map((feature) => (
                    <Col md="6" xl="4" key={feature.id}>
                      <Card className="mb-4 shadow-sm">
                        <CardBody>
                          <div className="d-flex align-items-center mb-3">
                            <div 
                              className="icon icon-shape rounded-circle mr-3"
                              style={{
                                backgroundColor: featureSettings[feature.id] ? '#5e72e4' : '#f5f5f5',
                                width: '48px',
                                height: '48px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <i className={`${feature.icon} ${featureSettings[feature.id] ? 'text-white' : 'text-muted'}`}></i>
                            </div>
                            <div>
                              <h4 className="mb-1">{feature.name}</h4>
                              <Badge color={featureSettings[feature.id] ? "success" : "secondary"}>
                                {featureSettings[feature.id] ? "Enabled" : "Disabled"}
                              </Badge>
                            </div>
                          </div>
                          
                          <p className="text-muted small mb-3">
                            {feature.description}
                          </p>

                          <FormGroup className="d-flex justify-content-between align-items-center mb-0">
                            <Label for={`feature-${feature.id}`} className="mb-0">
                              {updatingFeature === feature.id ? (
                                <Spinner size="sm" color="primary" />
                              ) : (
                                "Status"
                              )}
                            </Label>
                            <div className="custom-control custom-switch">
                              <input
                                type="checkbox"
                                className="custom-control-input"
                                id={`feature-${feature.id}`}
                                checked={featureSettings[feature.id] === true}
                                onChange={(e) => handleFeatureToggle(feature.id, e.target.checked)}
                                disabled={updatingFeature === feature.id || loading}
                              />
                              <label 
                                className="custom-control-label" 
                                htmlFor={`feature-${feature.id}`}
                              ></label>
                            </div>
                          </FormGroup>
                        </CardBody>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default Settings;