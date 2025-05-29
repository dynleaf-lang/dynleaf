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
    const baseUrl = window.location.origin;
    return `${baseUrl}/menu?tableId=${table._id}&tableName=${encodeURIComponent(table.TableName)}`;
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
    
    const printCSS = `
      <style>
        @media print {
          body * {
            visibility: hidden;
          }
          #print-container, #print-container * {
            visibility: visible;
          }
          #print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
          }
          .no-print {
            display: none !important;
          }
          th, td {
            padding: 8px;
            border: 1px solid #ddd;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
          }
          .qr-code-container {
            text-align: center;
            margin: 20px 0;
          }
          .qr-code-container canvas {
            width: 200px !important;
            height: 200px !important;
          }
          .table-info {
            margin-bottom: 20px;
          }
          h1, h2, h3 {
            margin-top: 10px;
            margin-bottom: 15px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .badge {
            padding: 5px 10px;
            border-radius: 4px;
            font-weight: bold;
          }
          .badge-success {
            background-color: #2dce89;
            color: white;
          }
          .badge-warning {
            background-color: #fb6340;
            color: white;
          }
          .badge-danger {
            background-color: #f5365c;
            color: white;
          }
          .badge-secondary {
            background-color: #6c757d;
            color: white;
          }
          .badge-info {
            background-color: #11cdef;
            color: white;
          }
          .restaurant-logo {
            max-width: 150px;
            margin-bottom: 10px;
          }
          .restaurant-header {
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            margin-bottom: 20px;
          }
          .detail-card {
            border: 1px solid #eee;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
          }
          .detail-header {
            background: #f8f9fe;
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 15px;
            font-weight: bold;
          }
          .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
          }
          .info-item {
            display: flex;
            flex-direction: column;
          }
          .info-label {
            font-size: 0.9rem;
            font-weight: bold;
            color: #8898aa;
          }
          .info-value {
            font-size: 1rem;
            margin-top: 5px;
          }
          .detail-section {
            margin-bottom: 25px;
          }
          footer {
            margin-top: 30px;
            text-align: center;
            font-size: 12px;
            color: #8898aa;
            border-top: 1px solid #eee;
            padding-top: 15px;
          }
        }
      </style>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Table Details - ${table?.TableName || 'Table'}</title>
          ${printCSS}
        </head>
        <body>
          <div id="print-container">
            ${printContent.innerHTML}
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for images and fonts to load
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 1000);
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
                        {/* Left Column - Table Information */}
                        <Col md="6">
                          <div className="detail-section">
                            <div className="detail-header">
                              <i className="fas fa-info-circle mr-2"></i> Basic Information
                            </div>
                            <div className="p-3">
                              <Row className="mb-3">
                                <Col xs="5" className="text-muted">Table Name:</Col>
                                <Col xs="7" className="font-weight-bold">{table.TableName}</Col>
                              </Row>
                              
                              <Row className="mb-3">
                                <Col xs="5" className="text-muted">Table ID:</Col>
                                <Col xs="7">
                                  <Badge color="primary" pill className="px-3">{table.tableId}</Badge>
                                </Col>
                              </Row>
                              
                              <Row className="mb-3">
                                <Col xs="5" className="text-muted">Capacity:</Col>
                                <Col xs="7">
                                  <i className="fas fa-user mr-1"></i> {table.capacity} persons
                                </Col>
                              </Row>
                              
                              <Row className="mb-3">
                                <Col xs="5" className="text-muted">Type:</Col>
                                <Col xs="7">
                                  {table.isVIP ? (
                                    <Badge color="warning" pill className="px-3">
                                      <i className="fas fa-crown mr-1"></i> VIP Table
                                    </Badge>
                                  ) : (
                                    <span>Regular Table</span>
                                  )}
                                </Col>
                              </Row>
                            </div>
                          </div>

                          <div className="detail-section">
                            <div className="detail-header">
                              <i className="fas fa-map-marker-alt mr-2"></i> Location Details
                            </div>
                            <div className="p-3">
                              <Row className="mb-3">
                                <Col xs="5" className="text-muted">Zone:</Col>
                                <Col xs="7">
                                  <Badge color="info" pill className="px-3">
                                    {table.location?.zone || 'Main'}
                                  </Badge>
                                </Col>
                              </Row>
                              
                              <Row className="mb-3">
                                <Col xs="5" className="text-muted">Shape:</Col>
                                <Col xs="7" style={{ textTransform: 'capitalize' }}>
                                  <i className={`fas fa-${table.shape === 'round' ? 'circle' : table.shape === 'rectangle' ? 'rectangle-wide' : 'square'} mr-1`}></i>
                                  {table.shape || 'Square'}
                                </Col>
                              </Row>
                              
                              <Row className="mb-3">
                                <Col xs="5" className="text-muted">Position:</Col>
                                <Col xs="7">
                                  X: {table.location?.x || 0}, Y: {table.location?.y || 0}
                                </Col>
                              </Row>
                            </div>
                          </div>
                          
                          {table.notes && (
                            <div className="detail-section">
                              <div className="detail-header">
                                <i className="fas fa-sticky-note mr-2"></i> Notes
                              </div>
                              <div className="p-3">
                                <p className="mb-0">{table.notes}</p>
                              </div>
                            </div>
                          )}
                        </Col>
                        
                        {/* Right Column - Status and QR Code */}
                        <Col md="6">
                          <div className="detail-section">
                            <div className="detail-header">
                              <i className="fas fa-chart-pie mr-2"></i> Current Status
                            </div>
                            <div className="p-3 text-center">
                              <div className="mb-4">
                                <div className="mb-3">Current Status:</div>
                                <div style={{ transform: 'scale(1.2)' }}>
                                  {getStatusBadge(table.status || (table.isOccupied ? 'occupied' : 'available'))}
                                </div>
                              </div>
                              
                              {table.currentOrder && (
                                <div className="mt-3 mb-4">
                                  <Badge color="danger" pill className="px-3 py-2">
                                    <i className="fas fa-utensils mr-1"></i> Active Order: #{table.currentOrder.orderNumber || 'N/A'}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="detail-section">
                            <div className="detail-header">
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
                              <small className="text-muted d-block">
                                URL: {getQRCodeValue()}
                              </small>
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