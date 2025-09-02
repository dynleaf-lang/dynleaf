import React, { useEffect, useContext, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Button,
  Container,
  Row,
  Col,
  Alert,
  Spinner,
  Badge,
} from "reactstrap";
import { TableContext } from "../../context/TableContext";
import { AuthContext } from "../../context/AuthContext";
import { BranchContext } from "../../context/BranchContext";
import { RestaurantContext } from "../../context/RestaurantContext";
import Header from "components/Headers/Header.js";
import logoImg from "../../assets/img/brand/OrderEase-logo.png";

const TableDetail = () => {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const { tables, loading, error, fetchTableById } = useContext(TableContext);
  const { user } = useContext(AuthContext);
  const { fetchBranchById } = useContext(BranchContext);
  const { fetchRestaurantById } = useContext(RestaurantContext);
  const [table, setTable] = useState(null);
  const [branch, setBranch] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [localError, setLocalError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const printContainerRef = useRef(null);
  const qrRef = useRef();
  const dataFetchedRef = useRef(false);

  // Fetch the table data
  useEffect(() => {
    // Use this ref to prevent multiple fetches and break the render loop
    if (dataFetchedRef.current) return;

    const getTable = async () => {
      try {
        console.log("Fetching table with ID:", tableId);
        
        if (!tableId) {
          setLocalError("Table ID is missing");
          setIsLoading(false);
          return;
        }
        
        // First try to find the table in already loaded tables
        const existingTable = tables.find(t => t._id === tableId);
        if (existingTable) {
          console.log("Found table in existing data:", existingTable);
          setTable(existingTable);
          
          // Fetch branch and restaurant details
          if (existingTable.branchId) {
            try {
              const branchData = await fetchBranchById(existingTable.branchId);
              setBranch(branchData);
              
              if (branchData?.restaurantId) {
                const restaurantData = await fetchRestaurantById(branchData.restaurantId);
                setRestaurant(restaurantData);
              }
            } catch (err) {
              console.error("Error fetching related data:", err);
            }
          }
          
          setIsLoading(false);
          dataFetchedRef.current = true;
          return;
        }
        
        // If not found in existing data, fetch it directly
        console.log("Table not found in existing data, fetching from API");
        const tableData = await fetchTableById(tableId);
        console.log("Received table data:", tableData);
        
        if (!tableData) {
          setLocalError("Table not found");
          setIsLoading(false);
          return;
        }
        
        setTable(tableData);
        
        // Fetch branch and restaurant details
        if (tableData.branchId) {
          try {
            const branchData = await fetchBranchById(tableData.branchId);
            setBranch(branchData);
            
            if (branchData?.restaurantId) {
              const restaurantData = await fetchRestaurantById(branchData.restaurantId);
              setRestaurant(restaurantData);
            }
          } catch (err) {
            console.error("Error fetching related data:", err);
          }
        }
        
        setIsLoading(false);
        dataFetchedRef.current = true;
      } catch (err) {
        console.error("Error fetching table:", err);
        setLocalError(err.message || "Failed to fetch table information");
        setIsLoading(false);
      }
    };

    getTable();
    
    // Cleanup function to reset the ref if component unmounts
    return () => {
      dataFetchedRef.current = false;
    };
  }, [tableId, tables]); // Only depend on tableId and tables, not the function references

  // Generate QR code value based on table data
  const getQRCodeValue = useCallback(() => {
    if (!table) return "";
    
    // Create a URL or unique identifier for the table
    const baseUrl = process.env.CUSTOMER_BASE_URL || 'http://localhost:5173'; // Default to local dev URL if not set
    return `${baseUrl}/menu?tableId=${table._id}&restaurantId=${table.restaurantId}&branchId=${table.branchId}`;
  }, [table]);

  // Download QR code as PNG
  const downloadQRCode = () => {
    if (!qrRef.current) return;
    
    const canvas = qrRef.current.querySelector("canvas");
    if (!canvas) {
      console.error("Canvas not found in QR code reference");
      return;
    }
    
    try {
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `Table_QR_${table.TableName.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Error downloading QR code:", err);
      alert("Failed to download QR code: " + err.message);
    }
  };

  // Print the table details
  const handlePrint = () => {
    const printContent = printContainerRef.current;
    if (!printContent) return;

    // Clone the printable node so we can tweak it for printing without affecting the UI
    const cloned = printContent.cloneNode(true);

    // Ensure the QR code prints correctly: replace canvas with an <img> using the canvas data URL
    try {
      const liveCanvas = qrRef.current?.querySelector('canvas');
      const cloneCanvas = cloned.querySelector('.qr-code-container canvas');
      const targetCanvas = liveCanvas || cloneCanvas;
      if (targetCanvas) {
        const dataUrl = targetCanvas.toDataURL('image/png');
        const img = document.createElement('img');
        img.src = dataUrl;
        img.alt = 'Table QR Code';
        img.style.width = '220px';
        img.style.height = '220px';
        if (cloneCanvas && cloneCanvas.parentNode) {
          cloneCanvas.parentNode.replaceChild(img, cloneCanvas);
        }
      }
    } catch (e) {
      // If anything goes wrong, just proceed – the rest will still print
      console.warn('QR canvas conversion failed:', e);
    }

    // Open a lightweight print window
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const printDoc = printWindow.document;

    // Basic skeleton
    printDoc.open();
    printDoc.write(`<!doctype html><html><head><meta charset="utf-8"/><title>Table Details - ${table?.TableName || 'Table'}</title></head><body></body></html>`);
    printDoc.close();

    // Bring over existing stylesheets (Bootstrap/Argon/etc.) so layout matches the app
    const head = printDoc.head || printDoc.getElementsByTagName('head')[0];
    Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).forEach((node) => {
      try {
        head.appendChild(node.cloneNode(true));
      } catch (_) {
        /* ignore */
      }
    });

    // Add some print-focused tweaks
    const styleEl = printDoc.createElement('style');
    styleEl.type = 'text/css';
    styleEl.appendChild(printDoc.createTextNode(`
      @page { margin: 16mm; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Liberation Sans', sans-serif; color: #32325d; }
      .no-print { display: none !important; }
      #print-container { padding: 12px; }
      .qr-code-container { text-align: center; margin: 20px 0; }
      .restaurant-logo { max-width: 150px; margin-bottom: 10px; }
      .detail-header { background: #f8f9fe; padding: 10px; border-radius: 5px; margin-bottom: 15px; font-weight: 600; }
      footer { margin-top: 30px; text-align: center; font-size: 12px; color: #8898aa; border-top: 1px solid #eee; padding-top: 15px; }
      /* Keep only the print container visible when printing */
      @media print {
        body * { visibility: hidden; }
        #print-container, #print-container * { visibility: visible; }
        #print-container { position: absolute; left: 0; top: 0; width: 100%; }
      }
    `));
    head.appendChild(styleEl);

    // Inject the cloned content
    const container = printDoc.createElement('div');
    container.id = 'print-container';
    container.innerHTML = cloned.innerHTML;
    printDoc.body.appendChild(container);

    // Wait for resources (images/fonts) to load, then print
    const resourcesReady = () => new Promise((resolve) => {
      const imgs = Array.from(printDoc.images || []);
      if (imgs.length === 0) return resolve();
      let loaded = 0;
      const done = () => (++loaded >= imgs.length) && resolve();
      imgs.forEach((img) => {
        if (img.complete) return done();
        img.addEventListener('load', done);
        img.addEventListener('error', done);
      });
      // Fallback timeout
      setTimeout(resolve, 1000);
    });

    resourcesReady().then(() => {
      printWindow.focus();
      printWindow.print();
      // Give the print dialog a moment before closing (prevents some browsers from blocking)
      setTimeout(() => printWindow.close(), 300);
    });
  };

  // Get status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'occupied':
        return <Badge color="danger">Occupied</Badge>;
      case 'reserved':
        return <Badge color="warning">Reserved</Badge>;
      case 'maintenance':
        return <Badge color="secondary">Maintenance</Badge>;
      case 'available':
      default:
        return <Badge color="success">Available</Badge>;
    }
  };

  if (loading || isLoading) {
    return (
      <>
        <Header />
        <Container className="mt--7">
          <Row className="justify-content-center">
            <Col lg="10">
              <div className="text-center py-5">
                <Spinner color="primary" />
                <p className="mt-3">Loading table information...</p>
              </div>
            </Col>
          </Row>
        </Container>
      </>
    );
  }

  if (error || localError) {
    return (
      <>
        <Header />
        <Container className="mt--7">
          <Row className="justify-content-center">
            <Col lg="10">
              <Alert color="danger">
                <h4 className="alert-heading">Error</h4>
                <p>{error || localError || "Table not found"}</p>
                <hr />
                <p className="mb-0">Please try again or contact support if the issue persists.</p>
                <div>
                  <small>
                    <strong>Debug info:</strong> TableID: {tableId}, User: {user?.email}, Branch: {user?.branchId}
                  </small>
                </div>
              </Alert>
              <Button color="primary" onClick={() => navigate("/admin/tables-management")}>
                Back to Tables
              </Button>
            </Col>
          </Row>
        </Container>
      </>
    );
  }

  return (
    <>
      <Header />
      <Container className="mt--7">
        <Row className="justify-content-center">
          <Col lg="10">
            <Card className="shadow">
              <CardHeader className="bg-gradient-info text-white">
                <div className="d-flex justify-content-between align-items-center">
                  <h3 className="mb-0 text-white">
                    <i className="fas fa-info-circle mr-2"></i> 
                    Table Details: {table?.TableName || "Loading..."}
                  </h3>
                  <div>
                    <Button color="light" size="sm" className="mr-2" onClick={handlePrint}>
                      <i className="fas fa-print mr-1"></i> Print
                    </Button>
                    <Button color="light" size="sm" onClick={() => navigate("/admin/tables-management")}>
                      <i className="fas fa-arrow-left mr-1"></i> Back
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardBody>
                {table ? (
                  <div>
                    {/* This container will be used for printing */}
                    <div ref={printContainerRef}>
                      {/* Restaurant/Branch Header Section */}
                      <div className="restaurant-header text-center mb-4">
                        <img 
                          src={logoImg} 
                          alt="Restaurant Logo" 
                          className="restaurant-logo"
                          style={{ maxWidth: '150px', marginBottom: '10px' }}
                        />
                        <h2 className="mb-0">{restaurant?.name || 'Restaurant'}</h2>
                        {branch && (
                          <p className="text-muted">
                            {branch.name} Branch | 
                            {branch.address && <span> {branch.address}</span>}
                            {branch.phone && <span> | {branch.phone}</span>}
                          </p>
                        )}
                        <p className="text-muted">
                          <small>Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</small>
                        </p>
                      </div>

                      <Row>
                        
                        
                        {/* Right Column - Status and QR Code */}
                        <Col md="12">
                          
                          
                          <div className="detail-section">
                            <div className="detail-header text-center">
                              <i className="fas fa-qrcode mr-2"></i> QR Code
                            </div>
                            <div className="p-3 text-center">
                              <p>Scan to access the menu for this table:</p>
                              <div className="qr-code-container mb-3" ref={qrRef}>
                                <QRCodeCanvas 
                                  value={getQRCodeValue()} 
                                  size={220}
                                  bgColor={"#ffffff"}
                                  fgColor={"#000000"}
                                  level={"H"}
                                  includeMargin={true}
                                />
                              </div>
                              {/* <small className="text-muted d-block">
                                URL: {getQRCodeValue()}
                              </small> */}
                            </div>
                          </div>
                        </Col>
                      </Row>
                      
                      <footer className="mt-4">
                        <p>Generated by OrderEase Management System</p>
                        <p>{new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
                      </footer>
                    </div>
                    
                    <Row className="mt-4 no-print">
                      <Col className="text-center">
                        <Button 
                          color="success" 
                          onClick={downloadQRCode}
                          className="mr-3"
                        >
                          <i className="fas fa-download mr-2"></i> Download QR Code
                        </Button>
                        <Button 
                          color="info" 
                          onClick={handlePrint}
                        >
                          <i className="fas fa-print mr-2"></i> Print Details
                        </Button>
                      </Col>
                    </Row>
                  </div>
                ) : (
                  <div className="text-center py-5">
                    <Spinner color="primary" />
                    <p className="mt-3">Loading table information...</p>
                  </div>
                )}
              </CardBody>
              <CardFooter>
                <small className="text-muted">
                  <i className="fas fa-info-circle mr-1"></i>
                  You can print this page or download the QR code for use at the table.
                </small>
              </CardFooter>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default TableDetail;