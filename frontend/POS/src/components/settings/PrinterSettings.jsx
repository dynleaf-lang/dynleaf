import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Form,
  FormGroup,
  Label,
  Input,
  Button,
  Alert,
  ButtonGroup,
  Row,
  Col,
  Spinner
} from 'reactstrap';
import {
  FaPrint,
  FaNetworkWired,
  FaUsb,
  FaBluetooth,
  FaDesktop,
  FaCheck,
  FaTimes,
  FaCog,
  FaTestTube
} from 'react-icons/fa';
import { PRINTER_CONFIGS, printThermalReceipt, generateThermalReceipt } from '../../utils/thermalPrinter';
import toast from 'react-hot-toast';

const PrinterSettings = ({ onSettingsChange }) => {
  const [printerConfig, setPrinterConfig] = useState(() => {
    // Load from localStorage or use default
    const saved = localStorage.getItem('pos_printer_config');
    return saved ? JSON.parse(saved) : PRINTER_CONFIGS.BROWSER_FALLBACK;
  });
  
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('unknown');

  useEffect(() => {
    // Save to localStorage whenever config changes
    localStorage.setItem('pos_printer_config', JSON.stringify(printerConfig));
    if (onSettingsChange) {
      onSettingsChange(printerConfig);
    }
  }, [printerConfig, onSettingsChange]);

  const handlePrinterTypeChange = (type) => {
    let newConfig;
    switch (type) {
      case 'network':
        newConfig = { ...PRINTER_CONFIGS.NETWORK_THERMAL };
        break;
      case 'usb':
        newConfig = { ...PRINTER_CONFIGS.USB_THERMAL };
        break;
      case 'browser':
        newConfig = { ...PRINTER_CONFIGS.BROWSER_FALLBACK };
        break;
      default:
        newConfig = { ...PRINTER_CONFIGS.BROWSER_FALLBACK };
    }
    setPrinterConfig(newConfig);
    setConnectionStatus('unknown');
  };

  const handleConfigChange = (field, value) => {
    setPrinterConfig(prev => ({
      ...prev,
      [field]: value
    }));
    setConnectionStatus('unknown');
  };

  const testPrinterConnection = async () => {
    setTesting(true);
    setConnectionStatus('testing');

    try {
      // Generate a test receipt
      const testOrderData = {
        order: {
          orderNumber: 'TEST-001',
          createdAt: new Date().toISOString(),
          items: [
            {
              name: 'Test Item',
              quantity: 1,
              price: 10,
              customizations: []
            }
          ],
          subtotal: 10,
          tax: 1,
          totalAmount: 11,
          paymentStatus: 'paid',
          specialInstructions: 'This is a test receipt'
        },
        paymentDetails: {
          method: 'cash',
          amountReceived: 15,
          change: 4
        },
        customerInfo: {
          name: 'Test Customer',
          orderType: 'dine-in'
        },
        tableInfo: {
          name: 'Test Table'
        }
      };

      const restaurantInfo = {
        name: 'Test Restaurant',
        address: 'Test Address',
        phone: 'Test Phone',
        email: 'test@example.com'
      };

      if (printerConfig.printerType === 'network') {
        // Test network connection
        const thermalReceipt = generateThermalReceipt(testOrderData, restaurantInfo);
        const result = await printThermalReceipt(thermalReceipt, printerConfig);
        
        if (result.success) {
          setConnectionStatus('connected');
          toast.success('Printer test successful!');
        } else {
          setConnectionStatus('error');
          toast.error('Printer test failed: ' + result.error);
        }
      } else if (printerConfig.printerType === 'browser') {
        // Test browser printing
        setConnectionStatus('connected');
        toast.success('Browser printing is available');
      } else {
        setConnectionStatus('error');
        toast.error('USB/Bluetooth printing not implemented yet');
      }
    } catch (error) {
      console.error('Printer test error:', error);
      setConnectionStatus('error');
      toast.error('Printer test failed: ' + error.message);
    } finally {
      setTesting(false);
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'success';
      case 'error': return 'danger';
      case 'testing': return 'warning';
      default: return 'secondary';
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected': return <FaCheck />;
      case 'error': return <FaTimes />;
      case 'testing': return <Spinner size="sm" />;
      default: return <FaCog />;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'error': return 'Connection Failed';
      case 'testing': return 'Testing...';
      default: return 'Not Tested';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <FaPrint className="me-2" />
            Thermal Printer Settings
          </div>
          <Alert color={getStatusColor()} className="mb-0 py-1 px-2" fade={false}>
            {getStatusIcon()} <span className="ms-1">{getStatusText()}</span>
          </Alert>
        </div>
      </CardHeader>
      
      <CardBody>
        <Form>
          {/* Printer Type Selection */}
          <FormGroup>
            <Label>Printer Type</Label>
            <div>
              <ButtonGroup className="w-100">
                <Button
                  color={printerConfig.printerType === 'network' ? 'primary' : 'outline-primary'}
                  onClick={() => handlePrinterTypeChange('network')}
                  className="d-flex flex-column align-items-center py-3"
                >
                  <FaNetworkWired size={20} className="mb-1" />
                  <small>Network</small>
                </Button>
                <Button
                  color={printerConfig.printerType === 'usb' ? 'primary' : 'outline-primary'}
                  onClick={() => handlePrinterTypeChange('usb')}
                  className="d-flex flex-column align-items-center py-3"
                  disabled
                >
                  <FaUsb size={20} className="mb-1" />
                  <small>USB</small>
                </Button>
                <Button
                  color={printerConfig.printerType === 'bluetooth' ? 'primary' : 'outline-primary'}
                  onClick={() => handlePrinterTypeChange('bluetooth')}
                  className="d-flex flex-column align-items-center py-3"
                  disabled
                >
                  <FaBluetooth size={20} className="mb-1" />
                  <small>Bluetooth</small>
                </Button>
                <Button
                  color={printerConfig.printerType === 'browser' ? 'primary' : 'outline-primary'}
                  onClick={() => handlePrinterTypeChange('browser')}
                  className="d-flex flex-column align-items-center py-3"
                >
                  <FaDesktop size={20} className="mb-1" />
                  <small>Browser</small>
                </Button>
              </ButtonGroup>
            </div>
          </FormGroup>

          {/* Network Printer Settings */}
          {printerConfig.printerType === 'network' && (
            <>
              <Row>
                <Col md={8}>
                  <FormGroup>
                    <Label>Printer IP Address</Label>
                    <Input
                      type="text"
                      value={printerConfig.printerIP || ''}
                      onChange={(e) => handleConfigChange('printerIP', e.target.value)}
                      placeholder="192.168.1.100"
                    />
                  </FormGroup>
                </Col>
                <Col md={4}>
                  <FormGroup>
                    <Label>Port</Label>
                    <Input
                      type="number"
                      value={printerConfig.printerPort || ''}
                      onChange={(e) => handleConfigChange('printerPort', parseInt(e.target.value))}
                      placeholder="9100"
                    />
                  </FormGroup>
                </Col>
              </Row>
              
              <FormGroup>
                <Label>Encoding</Label>
                <Input
                  type="select"
                  value={printerConfig.encoding || 'utf-8'}
                  onChange={(e) => handleConfigChange('encoding', e.target.value)}
                >
                  <option value="utf-8">UTF-8</option>
                  <option value="ascii">ASCII</option>
                  <option value="iso-8859-1">ISO-8859-1</option>
                </Input>
              </FormGroup>
            </>
          )}

          {/* USB Printer Settings */}
          {printerConfig.printerType === 'usb' && (
            <Alert color="warning" fade={false}>
              <strong>USB Printing:</strong> USB printer support requires additional drivers and is not yet implemented. 
              Please use Network or Browser printing for now.
            </Alert>
          )}

          {/* Browser Printer Settings */}
          {printerConfig.printerType === 'browser' && (
            <Alert color="info" fade={false}>
              <strong>Browser Printing:</strong> Receipts will be printed using the browser's print dialog. 
              This works with any printer connected to your computer.
            </Alert>
          )}

          {/* Test Connection Button */}
          <div className="d-flex justify-content-between align-items-center mt-4">
            <div>
              <small className="text-muted">
                Test your printer configuration to ensure receipts print correctly.
              </small>
            </div>
            <Button
              color="primary"
              onClick={testPrinterConnection}
              disabled={testing}
            >
              {testing ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Testing...
                </>
              ) : (
                <>
                  <FaTestTube className="me-2" />
                  Test Printer
                </>
              )}
            </Button>
          </div>

          {/* Additional Settings */}
          <hr className="my-4" />
          
          <h6>Receipt Settings</h6>
          
          <Row>
            <Col md={6}>
              <FormGroup check>
                <Input
                  type="checkbox"
                  id="autoOpenDrawer"
                  checked={printerConfig.autoOpenDrawer || false}
                  onChange={(e) => handleConfigChange('autoOpenDrawer', e.target.checked)}
                />
                <Label check for="autoOpenDrawer">
                  Auto-open cash drawer
                </Label>
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup check>
                <Input
                  type="checkbox"
                  id="autoCutPaper"
                  checked={printerConfig.autoCutPaper !== false}
                  onChange={(e) => handleConfigChange('autoCutPaper', e.target.checked)}
                />
                <Label check for="autoCutPaper">
                  Auto-cut paper
                </Label>
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <FormGroup check>
                <Input
                  type="checkbox"
                  id="showQRCode"
                  checked={printerConfig.showQRCode !== false}
                  onChange={(e) => handleConfigChange('showQRCode', e.target.checked)}
                />
                <Label check for="showQRCode">
                  Include QR code for feedback
                </Label>
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup check>
                <Input
                  type="checkbox"
                  id="showFooterMessage"
                  checked={printerConfig.showFooterMessage !== false}
                  onChange={(e) => handleConfigChange('showFooterMessage', e.target.checked)}
                />
                <Label check for="showFooterMessage">
                  Show thank you message
                </Label>
              </FormGroup>
            </Col>
          </Row>
        </Form>
      </CardBody>
    </Card>
  );
};

export default PrinterSettings;
