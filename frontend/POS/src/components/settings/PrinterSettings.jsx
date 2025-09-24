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
  Spinner,
  Nav,
  NavItem,
  NavLink,
  TabContent,
  TabPane,
  FormFeedback,
  UncontrolledTooltip
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
  FaFlask,
  FaSave,
  FaInfoCircle,
  FaLink,
  FaUnlink
} from 'react-icons/fa';
import { PRINTER_CONFIGS, printThermalReceipt, generateThermalReceipt } from '../../utils/thermalPrinter';
import toast from '../../utils/notify';
import { useAuth } from '../../context/AuthContext';
import settingsService from '../../services/settingsService';

const PrinterSettings = ({ onSettingsChange }) => {
  const { user } = useAuth();
  const [printerConfig, setPrinterConfig] = useState(() => {
    // Load from localStorage or use default
    const saved = localStorage.getItem('pos_printer_config');
    return saved ? JSON.parse(saved) : PRINTER_CONFIGS.BROWSER_FALLBACK;
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('unknown');
  const [activeTab, setActiveTab] = useState('printer');
  const [validation, setValidation] = useState({});
  const [usbDeviceInfo, setUsbDeviceInfo] = useState(null);
  const [btDeviceInfo, setBtDeviceInfo] = useState(null);
  // Validation patterns
  const ipRegex = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
  const upiRegex = /^[A-Za-z0-9._-]{2,}@{1}[A-Za-z]{2,}$/;
  const hexIdRegex = /^0x[0-9a-fA-F]{4}$/;
  const macRegex = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;

  const validateConfig = (cfg) => {
    const v = {};
    if (cfg.printerType === 'network') {
      if (!cfg.printerIP || !ipRegex.test(cfg.printerIP.trim())) v.printerIP = 'Invalid IP';
      if (!cfg.printerPort || cfg.printerPort < 1 || cfg.printerPort > 65535) v.printerPort = 'Invalid port';
      if (cfg.destinations) {
        if (cfg.destinations.kitchen?.ip && !ipRegex.test(cfg.destinations.kitchen.ip)) v.kitchenIP = 'Invalid kitchen IP';
        if (cfg.destinations.cashier?.ip && !ipRegex.test(cfg.destinations.cashier.ip)) v.cashierIP = 'Invalid cashier IP';
      }
    }
    if (cfg.printerType === 'usb') {
      if (cfg.vendorId && !hexIdRegex.test(String(cfg.vendorId))) v.vendorId = 'Use hex e.g. 0x04b8';
      if (cfg.productId && !hexIdRegex.test(String(cfg.productId))) v.productId = 'Use hex e.g. 0x0202';
    }
    if (cfg.printerType === 'bluetooth') {
      if (cfg.deviceAddress && !macRegex.test(cfg.deviceAddress)) v.deviceAddress = 'Invalid MAC format';
    }
    if (cfg.paymentUPIVPA) {
      if (!upiRegex.test(cfg.paymentUPIVPA.trim())) v.paymentUPIVPA = 'Invalid UPI VPA';
    }
    setValidation(v);
    return v;
  };

  useEffect(() => { validateConfig(printerConfig); }, [printerConfig]);
  const hasErrors = Object.keys(validation).length > 0;

  // Load printer settings from database when component mounts
  useEffect(() => {
    if (user?.branchId) {
      loadPrinterSettings();
    }
  }, [user?.branchId]);

  const loadPrinterSettings = async () => {
    if (!user?.branchId) return;
    
    setLoading(true);
    try {
      const dbConfig = await settingsService.getPrinterSettings(user.branchId);
      
      // Merge database config with current printer config (preserving non-payment settings)
      setPrinterConfig(prev => ({
        ...prev,
        paymentUPIVPA: dbConfig.paymentUPIVPA || '',
        paymentUPIName: dbConfig.paymentUPIName || '',
        showQRCode: dbConfig.showQRCode !== false,
        showFooterMessage: dbConfig.showFooterMessage !== false,
      }));
      
      console.log('Printer settings loaded from database:', dbConfig);
    } catch (error) {
      console.error('Failed to load printer settings from database:', error);
      // Fallback to localStorage - this is fine
      toast.info('Using local printer settings');
    } finally {
      setLoading(false);
    }
  };

  // WebUSB pairing
  const handleUSBPair = async () => {
    if (!('usb' in navigator)) { toast.error('WebUSB not supported in this browser'); return; }
    try {
      const device = await navigator.usb.requestDevice({ filters: [] });
      if (device) {
        const ven = '0x' + device.vendorId.toString(16).padStart(4,'0');
        const prod = '0x' + device.productId.toString(16).padStart(4,'0');
        handleConfigChange('vendorId', ven);
        handleConfigChange('productId', prod);
        setUsbDeviceInfo({ productName: device.productName, manufacturerName: device.manufacturerName, serialNumber: device.serialNumber, ven, prod });
        toast.success('USB device selected');
      }
    } catch (e) {
      if (e && e.name !== 'NotFoundError') toast.error('USB pairing failed: ' + e.message);
    }
  };
  const clearUSB = () => setUsbDeviceInfo(null);

  // Web Bluetooth pairing
  const handleBluetoothPair = async () => {
    if (!('bluetooth' in navigator)) { toast.error('Web Bluetooth not supported'); return; }
    try {
      const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true });
      if (device) {
        setBtDeviceInfo({ name: device.name, id: device.id });
        handleConfigChange('deviceName', device.name || 'BT Printer');
        toast.success('Bluetooth device selected');
      }
    } catch (e) {
      if (e && e.name !== 'NotFoundError') toast.error('Bluetooth pairing failed: ' + e.message);
    }
  };
  const clearBluetooth = () => setBtDeviceInfo(null);

  useEffect(() => {
    // Save to localStorage whenever config changes
    localStorage.setItem('pos_printer_config', JSON.stringify(printerConfig));
    if (onSettingsChange) {
      onSettingsChange(printerConfig);
    }
    
    // Auto-save payment settings to database when they change
    if (user?.branchId && !loading) {
      const paymentSettings = {
        paymentUPIVPA: printerConfig.paymentUPIVPA || '',
        paymentUPIName: printerConfig.paymentUPIName || '',
        showQRCode: printerConfig.showQRCode !== false,
        showFooterMessage: printerConfig.showFooterMessage !== false,
      };
      
      // Debounce auto-save to avoid too many API calls
      const timeoutId = setTimeout(async () => {
        try {
          await settingsService.savePrinterSettings(user.branchId, paymentSettings);
          console.log('Payment settings auto-saved to database');
        } catch (error) {
          console.error('Failed to auto-save payment settings:', error);
        }
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [printerConfig, onSettingsChange, user?.branchId, loading]);

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
      case 'bluetooth':
        newConfig = { ...PRINTER_CONFIGS.BLUETOOTH_THERMAL };
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

  const handleSaveSettings = async () => {
    if (hasErrors) {
      toast.error('Please fix validation errors before saving');
      return;
    }

    setSaving(true);
    try {
      // Save to localStorage for immediate use
      localStorage.setItem('pos_printer_config', JSON.stringify(printerConfig));
      
      // Save payment settings to database if user has branchId
      if (user?.branchId) {
        await settingsService.savePrinterSettings(user.branchId, {
          paymentUPIVPA: printerConfig.paymentUPIVPA || '',
          paymentUPIName: printerConfig.paymentUPIName || '',
          showQRCode: printerConfig.showQRCode !== false,
          showFooterMessage: printerConfig.showFooterMessage !== false,
        });
        toast.success('Printer settings saved to database');
      } else {
        toast.success('Printer settings saved locally');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings to database, but saved locally');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <FaPrint className="me-2" />
            <span>Printer & Payment Settings</span>
          </div>
          <Alert color={getStatusColor()} className="mb-0 py-1 px-2" fade={false}>
            {getStatusIcon()} <span className="ms-1">{getStatusText()}</span>
          </Alert>
        </div>
        <Nav pills className="mt-3">
          <NavItem>
            <NavLink
              className={activeTab === 'printer' ? 'active' : ''}
              onClick={() => setActiveTab('printer')}
              style={{ cursor: 'pointer' }}
            >Printer</NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              className={activeTab === 'payment' ? 'active' : ''}
              onClick={() => setActiveTab('payment')}
              style={{ cursor: 'pointer' }}
            >Payment</NavLink>
          </NavItem>
        </Nav>
      </CardHeader>
      <CardBody>
        <TabContent activeTab={activeTab}>
          <TabPane tabId="printer">
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
                >
                  <FaUsb size={20} className="mb-1" />
                  <small>USB</small>
                </Button>
                <Button
                  color={printerConfig.printerType === 'bluetooth' ? 'primary' : 'outline-primary'}
                  onClick={() => handlePrinterTypeChange('bluetooth')}
                  className="d-flex flex-column align-items-center py-3"
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
                    <Label>Printer IP Address <FaInfoCircle id="tipPrinterIP" className="text-muted" size={12} /></Label>
                    <Input
                      type="text"
                      value={printerConfig.printerIP || ''}
                      onChange={(e) => handleConfigChange('printerIP', e.target.value)}
                      placeholder="192.168.1.100"
                      invalid={!!validation.printerIP}
                    />
                    {validation.printerIP && <FormFeedback>{validation.printerIP}</FormFeedback>}
                    <UncontrolledTooltip target="tipPrinterIP">LAN IPv4 of thermal printer (port 9100 typical)</UncontrolledTooltip>
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
                      invalid={!!validation.printerPort}
                    />
                    {validation.printerPort && <FormFeedback>{validation.printerPort}</FormFeedback>}
                  </FormGroup>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <FormGroup>
                    <Label>Send Mode</Label>
                    <Input
                      type="select"
                      value={printerConfig.networkMode || 'preview'}
                      onChange={(e) => handleConfigChange('networkMode', e.target.value)}
                    >
                      <option value="preview">Preview (Browser)</option>
                      <option value="direct">Direct (Simulated)</option>
                    </Input>
                  </FormGroup>
                </Col>
              </Row>

              <h6 className="mt-3">Destination Routing</h6>
              <Row>
                <Col md={6}>
                  <FormGroup>
                    <Label>Kitchen Printer IP</Label>
                    <Input
                      type="text"
                      value={printerConfig.destinations?.kitchen?.ip || ''}
                      onChange={(e)=> setPrinterConfig(prev => ({...prev, destinations:{...prev.destinations, kitchen:{...(prev.destinations?.kitchen||{}), ip:e.target.value}}}))}
                      placeholder="192.168.1.110"
                      invalid={!!validation.kitchenIP}
                    />
                    {validation.kitchenIP && <FormFeedback>{validation.kitchenIP}</FormFeedback>}
                  </FormGroup>
                </Col>
                <Col md={3}>
                  <FormGroup>
                    <Label>Port</Label>
                    <Input
                      type="number"
                      value={printerConfig.destinations?.kitchen?.port || 9100}
                      onChange={(e)=> setPrinterConfig(prev => ({...prev, destinations:{...prev.destinations, kitchen:{...(prev.destinations?.kitchen||{}), port: parseInt(e.target.value)||9100}}}))}
                    />
                  </FormGroup>
                </Col>
                <Col md={3} className="d-flex align-items-end">
                  <FormGroup check className="mb-3">
                    <Input
                      type="checkbox"
                      checked={printerConfig.destinations?.kitchen?.enabled !== false}
                      onChange={(e)=> setPrinterConfig(prev => ({...prev, destinations:{...prev.destinations, kitchen:{...(prev.destinations?.kitchen||{}), enabled: e.target.checked}}}))}
                    />
                    <Label check className="ms-1">Enable</Label>
                  </FormGroup>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <FormGroup>
                    <Label>Cashier Printer IP</Label>
                    <Input
                      type="text"
                      value={printerConfig.destinations?.cashier?.ip || ''}
                      onChange={(e)=> setPrinterConfig(prev => ({...prev, destinations:{...prev.destinations, cashier:{...(prev.destinations?.cashier||{}), ip:e.target.value}}}))}
                      placeholder="192.168.1.100"
                      invalid={!!validation.cashierIP}
                    />
                    {validation.cashierIP && <FormFeedback>{validation.cashierIP}</FormFeedback>}
                  </FormGroup>
                </Col>
                <Col md={3}>
                  <FormGroup>
                    <Label>Port</Label>
                    <Input
                      type="number"
                      value={printerConfig.destinations?.cashier?.port || 9100}
                      onChange={(e)=> setPrinterConfig(prev => ({...prev, destinations:{...prev.destinations, cashier:{...(prev.destinations?.cashier||{}), port: parseInt(e.target.value)||9100}}}))}
                    />
                  </FormGroup>
                </Col>
                <Col md={3} className="d-flex align-items-end">
                  <FormGroup check className="mb-3">
                    <Input
                      type="checkbox"
                      checked={printerConfig.destinations?.cashier?.enabled !== false}
                      onChange={(e)=> setPrinterConfig(prev => ({...prev, destinations:{...prev.destinations, cashier:{...(prev.destinations?.cashier||{}), enabled: e.target.checked}}}))}
                    />
                    <Label check className="ms-1">Enable</Label>
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
            <>
              <Alert color="warning" fade={false}>
                <strong>USB Printing (Experimental):</strong> Pair with your device via WebUSB (Chromium / localhost or HTTPS).
              </Alert>
              <Row>
                <Col md={4}>
                  <FormGroup>
                    <Label>Vendor ID (hex)</Label>
                    <Input type="text" value={printerConfig.vendorId || ''}
                      onChange={e=>handleConfigChange('vendorId', e.target.value)} placeholder="0x04b8" invalid={!!validation.vendorId} />
                    {validation.vendorId && <FormFeedback>{validation.vendorId}</FormFeedback>}
                  </FormGroup>
                </Col>
                <Col md={4}>
                  <FormGroup>
                    <Label>Product ID (hex)</Label>
                    <Input type="text" value={printerConfig.productId || ''}
                      onChange={e=>handleConfigChange('productId', e.target.value)} placeholder="0x0202" invalid={!!validation.productId} />
                    {validation.productId && <FormFeedback>{validation.productId}</FormFeedback>}
                  </FormGroup>
                </Col>
                <Col md={4}>
                  <FormGroup>
                    <Label>Interface</Label>
                    <Input type="number" value={printerConfig.interface || 0}
                      onChange={e=>handleConfigChange('interface', parseInt(e.target.value)||0)} />
                  </FormGroup>
                </Col>
              </Row>
              <div className="d-flex align-items-center gap-2 mb-3">
                <Button color="secondary" size="sm" onClick={handleUSBPair}><FaLink className="me-1" />Pair USB</Button>
                {usbDeviceInfo && <Button color="outline-danger" size="sm" onClick={clearUSB}><FaUnlink className="me-1" />Clear</Button>}
                {usbDeviceInfo && <small className="text-muted">{usbDeviceInfo.productName || 'USB'} paired</small>}
              </div>
            </>
          )}

          {/* Bluetooth Printer Settings */}
          {printerConfig.printerType === 'bluetooth' && (
            <>
              <Alert color="info" fade={false}>
                <strong>Bluetooth Printing (Experimental):</strong> Requires Web Bluetooth (Chromium / localhost or HTTPS).
              </Alert>
              <Row>
                <Col md={6}>
                  <FormGroup>
                    <Label>Device Name</Label>
                    <Input type="text" value={printerConfig.deviceName || ''} onChange={e=>handleConfigChange('deviceName', e.target.value)} placeholder="BT-Printer" />
                  </FormGroup>
                </Col>
                <Col md={6}>
                  <FormGroup>
                    <Label>MAC / Address</Label>
                    <Input type="text" value={printerConfig.deviceAddress || ''} onChange={e=>handleConfigChange('deviceAddress', e.target.value)} placeholder="00:11:22:33:44:55" invalid={!!validation.deviceAddress} />
                    {validation.deviceAddress && <FormFeedback>{validation.deviceAddress}</FormFeedback>}
                  </FormGroup>
                </Col>
              </Row>
              <div className="d-flex align-items-center gap-2 mb-3">
                <Button color="secondary" size="sm" onClick={handleBluetoothPair}><FaLink className="me-1" />Pair Bluetooth</Button>
                {btDeviceInfo && <Button color="outline-danger" size="sm" onClick={clearBluetooth}><FaUnlink className="me-1" />Clear</Button>}
                {btDeviceInfo && <small className="text-muted">{btDeviceInfo.name || 'BT'} paired</small>}
              </div>
            </>
          )}

          {/* Browser Printer Settings */}
          {printerConfig.printerType === 'browser' && (
            <Alert color="info" fade={false}>
              <strong>Browser Printing:</strong> Uses system dialog for any connected printer.
            </Alert>
          )}

          {/* Test Connection Button */}
          <div className="d-flex justify-content-between align-items-center mt-4">
            <div>
              <small className="text-muted">
                Changes are auto-saved. You can also click Save to confirm.
              </small>
            </div>
            <div className="d-flex gap-2">
              <Button
                color="secondary"
                onClick={handleSaveSettings}
                disabled={testing || hasErrors || saving}
                className="me-2"
              >
                {saving ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <FaSave className="me-2" />
                    {hasErrors ? 'Fix Errors to Save' : 'Save Printer Settings'}
                  </>
                )}
              </Button>
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
                    <FaFlask className="me-2" />
                    Test Printer
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Additional Settings */}
          <hr className="my-4" />
          <h6>Receipt Settings</h6>

          <Row className="mt-2">
            <Col md={6}>
              <FormGroup>
                <Label>KOT Printer Destination</Label>
                <Input
                  type="select"
                  value={printerConfig.kotDestination || 'kitchen'}
                  onChange={(e)=> handleConfigChange('kotDestination', e.target.value)}
                >
                  <option value="kitchen">Kitchen Printer</option>
                  <option value="cashier">Cashier / Front Desk</option>
                </Input>
                <small className="text-muted">Select which printer receives Kitchen Order Tickets.</small>
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup check className="mt-4">
                <Input
                  type="checkbox"
                  id="kotDuplicate"
                  checked={printerConfig.kotDuplicate || false}
                  onChange={(e)=> handleConfigChange('kotDuplicate', e.target.checked)}
                />
                <Label check for="kotDuplicate">Print duplicate KOT</Label><br/>
                <small className="text-muted">Enable to print a second KOT marked DUPLICATE (e.g., for expeditor).</small>
              </FormGroup>
            </Col>
          </Row>
          
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
                  Include QR / Payment QR
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
          </TabPane>
          <TabPane tabId="payment">
            <Form>
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h6 className="mb-0">Payment QR / UPI Settings</h6>
                {loading && (
                  <div className="d-flex align-items-center text-muted">
                    <Spinner size="sm" className="me-2" />
                    Loading settings...
                  </div>
                )}
              </div>
              {user?.branchId && (
                <Alert color="info" className="small mb-3">
                  <FaInfoCircle className="me-2" />
                  Payment settings are synced with the database for this branch.
                </Alert>
              )}
              <Row className="mt-2">
                <Col md={6}>
                  <FormGroup>
                    <Label>Merchant UPI ID (VPA)</Label>
                    <Input type="text" placeholder="merchant@bank" value={printerConfig.paymentUPIVPA || ''}
                      onChange={e=>handleConfigChange('paymentUPIVPA', e.target.value)} invalid={!!validation.paymentUPIVPA} />
                    {validation.paymentUPIVPA && <FormFeedback>{validation.paymentUPIVPA}</FormFeedback>}
                  </FormGroup>
                </Col>
                <Col md={6}>
                  <FormGroup>
                    <Label>Merchant Name (optional)</Label>
                    <Input type="text" placeholder="Display name on UPI" value={printerConfig.paymentUPIName || ''}
                      onChange={e=>handleConfigChange('paymentUPIName', e.target.value)} />
                  </FormGroup>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <FormGroup check>
                    <Input type="checkbox" id="showQRCode2" checked={printerConfig.showQRCode !== false}
                      onChange={e=>handleConfigChange('showQRCode', e.target.checked)} />
                    <Label check for="showQRCode2">Include Payment QR on receipts</Label>
                  </FormGroup>
                </Col>
                <Col md={6}>
                  <FormGroup check>
                    <Input type="checkbox" id="showFooterMessage2" checked={printerConfig.showFooterMessage !== false}
                      onChange={e=>handleConfigChange('showFooterMessage', e.target.checked)} />
                    <Label check for="showFooterMessage2">Show thank you message</Label>
                  </FormGroup>
                </Col>
              </Row>
            </Form>
          </TabPane>
        </TabContent>
      </CardBody>
    </Card>
  );
};

export default PrinterSettings;
