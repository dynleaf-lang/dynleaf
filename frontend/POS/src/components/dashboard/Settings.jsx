import React, { useState, useEffect } from 'react';
import { 
  Row, 
  Col, 
  Card, 
  CardBody, 
  CardHeader,
  Button, 
  Form,
  FormGroup,
  Label,
  Input,
  Nav,
  NavItem,
  NavLink,
  TabContent,
  TabPane,
  Alert,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Spinner
} from 'reactstrap';
import { 
  FaCog, 
  FaUser, 
  FaLock, 
  FaPrint,
  FaWifi,
  FaSave, 
  FaKey,
  FaEye,
  FaEyeSlash, 
  FaUndo,
  FaUtensils,
  FaImage
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import PrinterSettings from '../settings/PrinterSettings';
import toast from '../../utils/notify';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const { user, updateProfile, changePassword } = useAuth();
  
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [posSettings, setPosSettings] = useState({
    autoLogout: 30,
    printReceipts: true,
    soundNotifications: true,
    theme: 'light',
    language: 'en',
    currency: 'INR',
    taxRate: 10,
    printerIP: '192.168.1.100',
    printerPort: '9100'
  });

  const [menuSettings, setMenuSettings] = useState({
    showCardImages: false,
    cardImageHeight: 120,
    showItemDescription: false,
    compactView: true,
    showPreparationTime: true,
    showItemBadges: true
  });

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedPosSettings = localStorage.getItem('pos_settings');
    if (savedPosSettings) {
      setPosSettings(JSON.parse(savedPosSettings));
    }

    const savedMenuSettings = localStorage.getItem('menu_settings');
    if (savedMenuSettings) {
      setMenuSettings(JSON.parse(savedMenuSettings));
    }
  }, []);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const result = await updateProfile(profileData);
      if (result.success) {
        toast.success('Profile updated successfully');
      }
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    
    try {
      const result = await changePassword(passwordData.currentPassword, passwordData.newPassword);
      if (result.success) {
        toast.success('Password changed successfully');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setShowPasswordModal(false);
      }
    } catch (error) {
      toast.error('Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handlePosSettingsUpdate = () => {
    // Save POS settings to localStorage
    localStorage.setItem('pos_settings', JSON.stringify(posSettings));
    toast.success('POS settings saved successfully');
  };

  const handleMenuSettingsUpdate = () => {
    // Save Menu settings to localStorage
    localStorage.setItem('menu_settings', JSON.stringify(menuSettings));
    toast.success('Menu settings saved successfully');
    
    // Trigger a custom event to notify MenuSelection component
    window.dispatchEvent(new CustomEvent('menuSettingsChanged', {
      detail: menuSettings
    }));
  };

  const resetPosSettings = () => {
    setPosSettings({
      autoLogout: 30,
      printReceipts: true,
      soundNotifications: true,
      theme: 'light',
      language: 'en',
      currency: 'INR',
      taxRate: 10,
      printerIP: '192.168.1.100',
      printerPort: '9100'
    });
    toast.success('Settings reset to default');
  };

  const resetMenuSettings = () => {
    const defaultSettings = {
      showCardImages: false,
      cardImageHeight: 120,
      showItemDescription: false,
      compactView: true,
      showPreparationTime: true,
      showItemBadges: true
    };
    setMenuSettings(defaultSettings);
    localStorage.setItem('menu_settings', JSON.stringify(defaultSettings));
    
    // Trigger event to notify MenuSelection component
    window.dispatchEvent(new CustomEvent('menuSettingsChanged', {
      detail: defaultSettings
    }));
    
    toast.success('Menu settings reset to default');
  };

  const testPrinterConnection = () => {
    toast.loading('Testing printer connection...');
    
    // Simulate printer test
    setTimeout(() => {
      toast.dismiss();
      toast.success('Printer connection successful');
    }, 2000);
  };

  return (
    <div className="settings">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3>Settings</h3>
          <p className="text-muted mb-0">Manage your profile and POS preferences</p>
        </div>
      </div>

      {/* Settings Tabs */}
      <Nav tabs className="mb-4">
        <NavItem>
          <NavLink
            className={activeTab === 'profile' ? 'active' : ''}
            onClick={() => setActiveTab('profile')}
            style={{ cursor: 'pointer' }}
          >
            <FaUser className="me-2" />
            Profile
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink
            className={activeTab === 'security' ? 'active' : ''}
            onClick={() => setActiveTab('security')}
            style={{ cursor: 'pointer' }}
          >
            <FaLock className="me-2" />
            Security
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink
            className={activeTab === 'menu' ? 'active' : ''}
            onClick={() => setActiveTab('menu')}
            style={{ cursor: 'pointer' }}
          >
            <FaUtensils className="me-2" />
            Menu Display
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink
            className={activeTab === 'pos' ? 'active' : ''}
            onClick={() => setActiveTab('pos')}
            style={{ cursor: 'pointer' }}
          >
            <FaCog className="me-2" />
            POS Settings
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink
            className={activeTab === 'printer' ? 'active' : ''}
            onClick={() => setActiveTab('printer')}
            style={{ cursor: 'pointer' }}
          >
            <FaPrint className="me-2" />
            Printer
          </NavLink>
        </NavItem>
      </Nav>

      <TabContent activeTab={activeTab}>
        {/* Profile Tab */}
        <TabPane tabId="profile">
          <Card>
            <CardHeader>
              <h5>Profile Information</h5>
            </CardHeader>
            <CardBody>
              <Form onSubmit={handleProfileUpdate}>
                <Row>
                  <Col md={6}>
                    <FormGroup>
                      <Label>Full Name</Label>
                      <Input
                        type="text"
                        value={profileData.name}
                        onChange={(e) => setProfileData(prev => ({
                          ...prev,
                          name: e.target.value
                        }))}
                        required
                      />
                    </FormGroup>
                  </Col>
                  <Col md={6}>
                    <FormGroup>
                      <Label>Email Address</Label>
                      <Input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData(prev => ({
                          ...prev,
                          email: e.target.value
                        }))}
                        required
                      />
                    </FormGroup>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <FormGroup>
                      <Label>Phone Number</Label>
                      <Input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => setProfileData(prev => ({
                          ...prev,
                          phone: e.target.value
                        }))}
                      />
                    </FormGroup>
                  </Col>
                  <Col md={6}>
                    <FormGroup>
                      <Label>Role</Label>
                      <Input
                        type="text"
                        value={user?.role || ''}
                        disabled
                      />
                    </FormGroup>
                  </Col>
                </Row>
                <Button 
                  type="submit" 
                  color="primary" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Spinner size="sm" className="me-2" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <FaSave className="me-2" />
                      Update Profile
                    </>
                  )}
                </Button>
              </Form>
            </CardBody>
          </Card>
        </TabPane>

        {/* Menu Display Tab */}
        <TabPane tabId="menu">
          <Card>
            <CardHeader>
              <div className="d-flex justify-content-between align-items-center">
                <h5>Menu Display Settings</h5>
                <Button 
                  color="outline-secondary" 
                  size="sm"
                  onClick={resetMenuSettings}
                >
                  <FaUndo className="me-2" />
                  Reset to Default
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              <Form>
                <Row>
                  <Col md={6}>
                    {/* Card Images Toggle */}
                    <FormGroup>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div>
                          <Label className="mb-0">
                            <FaImage className="me-2 text-primary" />
                            Show Card Images
                          </Label>
                          <div>
                            <small className="text-muted">
                              Display product images on menu cards
                            </small>
                          </div>
                        </div>
                        <Input
                          type="switch"
                          checked={menuSettings.showCardImages}
                          onChange={(e) => setMenuSettings(prev => ({
                            ...prev,
                            showCardImages: e.target.checked
                          }))}
                          style={{ width: '50px', height: '25px' }}
                        />
                      </div>
                    </FormGroup>

                    {/* Card Image Height */}
                    {menuSettings.showCardImages && (
                      <FormGroup>
                        <Label>Card Image Height</Label>
                        <Input
                          type="range"
                          min="80"
                          max="200"
                          step="10"
                          value={menuSettings.cardImageHeight}
                          onChange={(e) => setMenuSettings(prev => ({
                            ...prev,
                            cardImageHeight: parseInt(e.target.value)
                          }))}
                        />
                        <div className="d-flex justify-content-between">
                          <small className="text-muted">80px</small>
                          <small className="text-primary font-weight-bold">
                            {menuSettings.cardImageHeight}px
                          </small>
                          <small className="text-muted">200px</small>
                        </div>
                      </FormGroup>
                    )}

                    {/* Item Description Toggle */}
                    <FormGroup>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div>
                          <Label className="mb-0">Show Item Description</Label>
                          <div>
                            <small className="text-muted">
                              Display item descriptions on cards
                            </small>
                          </div>
                        </div>
                        <Input
                          type="switch"
                          checked={menuSettings.showItemDescription}
                          onChange={(e) => setMenuSettings(prev => ({
                            ...prev,
                            showItemDescription: e.target.checked
                          }))}
                          style={{ width: '50px', height: '25px' }}
                        />
                      </div>
                    </FormGroup>
                  </Col>

                  <Col md={6}>
                    {/* Compact View Toggle */}
                    <FormGroup>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div>
                          <Label className="mb-0">Compact View</Label>
                          <div>
                            <small className="text-muted">
                              Use compact card layout to show more items
                            </small>
                          </div>
                        </div>
                        <Input
                          type="switch"
                          checked={menuSettings.compactView}
                          onChange={(e) => setMenuSettings(prev => ({
                            ...prev,
                            compactView: e.target.checked
                          }))}
                          style={{ width: '50px', height: '25px' }}
                        />
                      </div>
                    </FormGroup>

                    {/* Preparation Time Toggle */}
                    <FormGroup>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div>
                          <Label className="mb-0">Show Preparation Time</Label>
                          <div>
                            <small className="text-muted">
                              Display estimated cooking time
                            </small>
                          </div>
                        </div>
                        <Input
                          type="switch"
                          checked={menuSettings.showPreparationTime}
                          onChange={(e) => setMenuSettings(prev => ({
                            ...prev,
                            showPreparationTime: e.target.checked
                          }))}
                          style={{ width: '50px', height: '25px' }}
                        />
                      </div>
                    </FormGroup>

                    {/* Item Badges Toggle */}
                    <FormGroup>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div>
                          <Label className="mb-0">Show Item Badges</Label>
                          <div>
                            <small className="text-muted">
                              Display vegetarian, spicy, and other badges
                            </small>
                          </div>
                        </div>
                        <Input
                          type="switch"
                          checked={menuSettings.showItemBadges}
                          onChange={(e) => setMenuSettings(prev => ({
                            ...prev,
                            showItemBadges: e.target.checked
                          }))}
                          style={{ width: '50px', height: '25px' }}
                        />
                      </div>
                    </FormGroup>
                  </Col>
                </Row>

                <hr className="my-4" />

                {/* Save Button */}
                <div className="d-flex justify-content-end gap-2">
                  <Button 
                    color="primary"
                    onClick={handleMenuSettingsUpdate}
                  >
                    <FaSave className="me-2" />
                    Save Menu Settings
                  </Button>
                </div>

                {/* Preview Section */}
                <Alert color="info" className="mt-4" fade={false}>
                  <strong>Settings Preview:</strong>
                  <ul className="mb-0 mt-2">
                    <li>Card Images: {menuSettings.showCardImages ? 'Enabled' : 'Disabled'}</li>
                    {menuSettings.showCardImages && (
                      <li>Image Height: {menuSettings.cardImageHeight}px</li>
                    )}
                    <li>Item Description: {menuSettings.showItemDescription ? 'Enabled' : 'Disabled'}</li>
                    <li>Compact View: {menuSettings.compactView ? 'Enabled' : 'Disabled'}</li>
                    <li>Preparation Time: {menuSettings.showPreparationTime ? 'Enabled' : 'Disabled'}</li>
                    <li>Item Badges: {menuSettings.showItemBadges ? 'Enabled' : 'Disabled'}</li>
                  </ul>
                </Alert>
              </Form>
            </CardBody>
          </Card>
        </TabPane>

        {/* Security Tab */}
        <TabPane tabId="security">
          <Card>
            <CardHeader>
              <h5>Security Settings</h5>
            </CardHeader>
            <CardBody>
              <div className="security-options">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <h6>Change Password</h6>
                    <small className="text-muted">Update your account password</small>
                  </div>
                  <Button 
                    color="outline-primary"
                    onClick={() => setShowPasswordModal(true)}
                  >
                    <FaKey className="me-2" />
                    Change Password
                  </Button>
                </div>
                
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <h6>Auto Logout</h6>
                    <small className="text-muted">Automatically logout after inactivity</small>
                  </div>
                  <Input
                    type="select"
                    style={{ width: '150px' }}
                    value={posSettings.autoLogout}
                    onChange={(e) => setPosSettings(prev => ({
                      ...prev,
                      autoLogout: parseInt(e.target.value)
                    }))}
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={120}>2 hours</option>
                  </Input>
                </div>

                <Alert color="info" fade={false}>
                  <strong>Security Tips:</strong>
                  <ul className="mb-0 mt-2">
                    <li>Use a strong password with at least 8 characters</li>
                    <li>Include uppercase, lowercase, numbers, and symbols</li>
                    <li>Don't share your login credentials</li>
                    <li>Log out when leaving the POS terminal</li>
                  </ul>
                </Alert>
              </div>
            </CardBody>
          </Card>
        </TabPane>

        {/* POS Settings Tab */}
        <TabPane tabId="pos">
          <Card>
            <CardHeader>
              <h5>POS Configuration</h5>
            </CardHeader>
            <CardBody>
              <Form>
                <Row>
                  <Col md={6}>
                    <FormGroup>
                      <Label>Theme</Label>
                      <Input
                        type="select"
                        value={posSettings.theme}
                        onChange={(e) => setPosSettings(prev => ({
                          ...prev,
                          theme: e.target.value
                        }))}
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                      </Input>
                    </FormGroup>
                  </Col>
                  <Col md={6}>
                    <FormGroup>
                      <Label>Language</Label>
                      <Input
                        type="select"
                        value={posSettings.language}
                        onChange={(e) => setPosSettings(prev => ({
                          ...prev,
                          language: e.target.value
                        }))}
                      >
                        <option value="en">English</option>
                        <option value="hi">Hindi</option>
                      </Input>
                    </FormGroup>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <FormGroup>
                      <Label>Currency</Label>
                      <Input
                        type="select"
                        value={posSettings.currency}
                        onChange={(e) => setPosSettings(prev => ({
                          ...prev,
                          currency: e.target.value
                        }))}
                      >
                        <option value="INR">Indian Rupee (₹)</option>
                        <option value="USD">US Dollar ($)</option>
                      </Input>
                    </FormGroup>
                  </Col>
                  <Col md={6}>
                    <FormGroup>
                      <Label>Tax Rate (%)</Label>
                      <Input
                        type="number"
                        value={posSettings.taxRate}
                        onChange={(e) => setPosSettings(prev => ({
                          ...prev,
                          taxRate: parseFloat(e.target.value)
                        }))}
                        min="0"
                        max="50"
                        step="0.1"
                      />
                    </FormGroup>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <FormGroup check>
                      <Input
                        type="checkbox"
                        checked={posSettings.printReceipts}
                        onChange={(e) => setPosSettings(prev => ({
                          ...prev,
                          printReceipts: e.target.checked
                        }))}
                      />
                      <Label check>Auto-print receipts</Label>
                    </FormGroup>
                  </Col>
                  <Col md={6}>
                    <FormGroup check>
                      <Input
                        type="checkbox"
                        checked={posSettings.soundNotifications}
                        onChange={(e) => setPosSettings(prev => ({
                          ...prev,
                          soundNotifications: e.target.checked
                        }))}
                      />
                      <Label check>Sound notifications</Label>
                    </FormGroup>
                  </Col>
                </Row>
                <div className="mt-4">
                  <Button 
                    color="primary" 
                    className="me-2"
                    onClick={handlePosSettingsUpdate}
                  >
                    <FaSave className="me-2" />
                    Save Settings
                  </Button>
                  <Button 
                    color="outline-secondary"
                    onClick={resetPosSettings}
                  >
                    <FaUndo className="me-2" />
                    Reset to Default
                  </Button>
                </div>
              </Form>
            </CardBody>
          </Card>
        </TabPane>

        {/* Printer Tab */}
        <TabPane tabId="printer">
          {/* Use the dedicated PrinterSettings component which includes Payment QR options */}
          <PrinterSettings onSettingsChange={() => { /* no-op: component persists to localStorage */ }} />
        </TabPane>
      </TabContent>

      {/* Change Password Modal */}
      <Modal 
        isOpen={showPasswordModal} 
        toggle={() => setShowPasswordModal(false)}
      >
        <ModalHeader toggle={() => setShowPasswordModal(false)}>
          Change Password
        </ModalHeader>
        <Form onSubmit={handlePasswordChange}>
          <ModalBody>
            <FormGroup>
              <Label>Current Password</Label>
              <div className="input-group">
                <Input
                  type={showCurrentPassword ? "text" : "password"}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({
                    ...prev,
                    currentPassword: e.target.value
                  }))}
                  required
                />
                <Button
                  type="button"
                  color="outline-secondary"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? <FaEyeSlash /> : <FaEye />}
                </Button>
              </div>
            </FormGroup>
            <FormGroup>
              <Label>New Password</Label>
              <div className="input-group">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({
                    ...prev,
                    newPassword: e.target.value
                  }))}
                  required
                  minLength="6"
                />
                <Button
                  type="button"
                  color="outline-secondary"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                </Button>
              </div>
            </FormGroup>
            <FormGroup>
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({
                  ...prev,
                  confirmPassword: e.target.value
                }))}
                required
                minLength="6"
              />
            </FormGroup>
          </ModalBody>
          <ModalFooter>
            <Button 
              color="secondary" 
              onClick={() => setShowPasswordModal(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              color="primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Changing...
                </>
              ) : (
                'Change Password'
              )}
            </Button>
          </ModalFooter>
        </Form>
      </Modal>
    </div>
  );
};

export default Settings;
