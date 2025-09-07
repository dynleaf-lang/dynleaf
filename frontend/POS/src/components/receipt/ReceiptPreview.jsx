import React, { useState } from 'react';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Card,
  CardBody,
  ButtonGroup,
  Alert,
  Spinner
} from 'reactstrap';
import {
  FaPrint,
  FaEye,
  FaCopy,
  FaTimes,
  FaReceipt,
  FaDownload
} from 'react-icons/fa';
import { generateHTMLReceipt, printHTMLReceipt, printThermalReceipt, generateThermalReceipt } from '../../utils/thermalPrinter';
import toast from '../../utils/notify';

const ReceiptPreview = ({ 
  isOpen, 
  toggle, 
  orderData, 
  restaurantInfo, 
  printerConfig,
  onPrintSuccess 
}) => {
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState('html'); // 'html' or 'thermal'

  const defaultRestaurantInfo = {
    name: 'Restaurant',
    brandName: undefined,
    logo: undefined,
    address: 'Address',
    phone: 'Phone',
    email: '',
    gst: ''
  };

  const restaurantData = { ...defaultRestaurantInfo, ...restaurantInfo };

  const handlePrint = async (printType = 'browser') => {
    if (!orderData) {
      toast.error('No order data available for printing');
      return;
    }

    setLoading(true);
    try {
      let result;

      if (printType === 'thermal') {
        // Generate thermal receipt
        const thermalReceipt = generateThermalReceipt(orderData, restaurantData);
        result = await printThermalReceipt(thermalReceipt, printerConfig);
      } else {
        // Generate HTML receipt for browser printing
        const htmlReceipt = generateHTMLReceipt(orderData, restaurantData);
        result = printHTMLReceipt(htmlReceipt);
      }

      if (result.success) {
        toast.success(result.message);
        if (onPrintSuccess) onPrintSuccess();
      } else {
        toast.error(result.error || 'Failed to print receipt');
      }
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Failed to print receipt: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintDuplicate = async () => {
    if (!orderData) return;

    const duplicateOrderData = {
      ...orderData,
      receiptSettings: { duplicateReceipt: true }
    };

    setLoading(true);
    try {
      const htmlReceipt = generateHTMLReceipt(duplicateOrderData, restaurantData, { duplicateReceipt: true });
      const result = printHTMLReceipt(htmlReceipt);

      if (result.success) {
        toast.success('Duplicate receipt printed');
      } else {
        toast.error('Failed to print duplicate receipt');
      }
    } catch (error) {
      console.error('Duplicate print error:', error);
      toast.error('Failed to print duplicate receipt');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceipt = () => {
    if (!orderData) return;

    try {
      const htmlReceipt = generateHTMLReceipt(orderData, restaurantData);
      const blob = new Blob([htmlReceipt], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${orderData.order.orderNumber}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Receipt downloaded');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download receipt');
    }
  };

  const getReceiptPreview = () => {
    if (!orderData) return '<div>No order data available</div>';

    if (previewMode === 'thermal') {
      // Show thermal receipt as plain text
      const thermalReceipt = generateThermalReceipt(orderData, restaurantData);
      return `<pre style="font-family: 'Courier New', monospace; font-size: 12px; white-space: pre-wrap;">${thermalReceipt.replace(/\x1B\[[0-9;]*m/g, '').replace(/\x1B[@-_]/g, '')}</pre>`;
    } else {
      // Show HTML receipt
      return generateHTMLReceipt(orderData, restaurantData);
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="lg" className="receipt-preview-modal">
      <ModalHeader toggle={toggle}>
        <FaReceipt className="me-2" />
        Receipt Preview - Order #{orderData?.order?.orderNumber}
      </ModalHeader>
      
      <ModalBody>
        {/* Preview Mode Toggle */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <ButtonGroup>
            <Button
              color={previewMode === 'html' ? 'primary' : 'outline-primary'}
              size="sm"
              onClick={() => setPreviewMode('html')}
            >
              <FaEye className="me-1" />
              HTML Preview
            </Button>
            <Button
              color={previewMode === 'thermal' ? 'primary' : 'outline-primary'}
              size="sm"
              onClick={() => setPreviewMode('thermal')}
            >
              <FaReceipt className="me-1" />
              Thermal Preview
            </Button>
          </ButtonGroup>

          <div>
            <Button
              color="info"
              size="sm"
              onClick={handleDownloadReceipt}
              className="me-2"
            >
              <FaDownload className="me-1" />
              Download
            </Button>
          </div>
        </div>

        {/* Printer Status */}
        {printerConfig && (
          <Alert color="info" fade={false} className="mb-3">
            <strong>Printer:</strong> {printerConfig.printerType === 'network' 
              ? `Network (${printerConfig.printerIP}:${printerConfig.printerPort})`
              : printerConfig.printerType === 'browser' 
                ? 'Browser Print'
                : 'USB/Bluetooth'
            }
          </Alert>
        )}

        {/* Receipt Preview */}
        <Card>
          <CardBody>
            <div 
              className="receipt-preview"
              style={{ 
                maxHeight: '500px', 
                overflowY: 'auto',
                border: '1px solid #ddd',
                padding: '15px',
                backgroundColor: '#f8f9fa'
              }}
              dangerouslySetInnerHTML={{ __html: getReceiptPreview() }}
            />
          </CardBody>
        </Card>
      </ModalBody>

      <ModalFooter>
        <div className="d-flex justify-content-between w-100">
          <div>
            <Button
              color="secondary"
              onClick={handlePrintDuplicate}
              disabled={loading}
              className="me-2"
            >
              <FaCopy className="me-1" />
              Print Duplicate
            </Button>
          </div>

          <div>
            <Button color="secondary" onClick={toggle} disabled={loading} className="me-2">
              <FaTimes className="me-1" />
              Close
            </Button>
            
            <Button
              color="info"
              onClick={() => handlePrint('browser')}
              disabled={loading}
              className="me-2"
            >
              {loading ? (
                <>
                  <Spinner size="sm" className="me-1" />
                  Printing...
                </>
              ) : (
                <>
                  <FaPrint className="me-1" />
                  Browser Print
                </>
              )}
            </Button>

            <Button
              color="success"
              onClick={() => handlePrint('thermal')}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner size="sm" className="me-1" />
                  Printing...
                </>
              ) : (
                <>
                  <FaReceipt className="me-1" />
                  Thermal Print
                </>
              )}
            </Button>
          </div>
        </div>
      </ModalFooter>
    </Modal>
  );
};

export default ReceiptPreview;
