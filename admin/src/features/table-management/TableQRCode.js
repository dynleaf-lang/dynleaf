import React, { useEffect, useContext, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Container,
  Row,
  Col,
  Alert,
  Spinner
} from "reactstrap";
import { TableContext } from "../../context/TableContext";
import Header from "components/Headers/Header.js";

const TableQRCode = () => {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const { tables, loading, error, fetchTableById } = useContext(TableContext);
  const [table, setTable] = useState(null);
  const [localError, setLocalError] = useState(null);
  const qrRef = useRef();

  // Fetch the table data
  useEffect(() => {
    const getTable = async () => {
      try {
        console.log("Fetching table with ID:", tableId);
        if (!tableId) {
          setLocalError("Table ID is missing");
          return;
        }
        
        const tableData = await fetchTableById(tableId);
        console.log("Received table data:", tableData);
        
        if (!tableData) {
          setLocalError("Table not found");
          return;
        }
        
        setTable(tableData);
      } catch (err) {
        console.error("Error fetching table:", err);
        setLocalError(err.message || "Failed to fetch table information");
      }
    };

    getTable();
  }, [tableId, fetchTableById]);

  // Generate QR code value based on table data
  const getQRCodeValue = () => {
    if (!table) return "";
    
    // Create a URL or unique identifier for the table
    // This could be a URL to your customer-facing application or a unique identifier
    const baseUrl = window.location.origin.replace('admin.', ''); // Remove 'admin.' subdomain if it exists
    return `${baseUrl}/menu?tableId=${table._id}&tableName=${table.TableName}`;
  };

  // Download QR code as PNG
  const downloadQRCode = () => {
    if (!qrRef.current) return;
    
    const canvas = qrRef.current.querySelector("canvas");
    if (!canvas) {
      console.error("Canvas not found in QR code reference");
      return;
    }
    
    try {
      // Create a temporary link element
      const link = document.createElement("a");
      
      // Convert canvas to data URL and set as download link
      link.href = canvas.toDataURL("image/png");
      link.download = `Table_QR_${table.TableName.replace(/\s+/g, '_')}.png`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log("QR code download initiated successfully");
    } catch (err) {
      console.error("Error downloading QR code:", err);
      alert("Failed to download QR code: " + err.message);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <Container className="mt--7">
          <Row className="justify-content-center">
            <Col lg="8">
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
            <Col lg="8">
              <Alert color="danger">
                <h4 className="alert-heading">Error</h4>
                <p>{error || localError || "Table not found"}</p>
                <hr />
                <p className="mb-0">Please try again or contact support if the issue persists.</p>
              </Alert>
              <Button color="primary" onClick={() => navigate("/tables-management")}>
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
          <Col lg="8">
            <Card className="shadow">
              <CardHeader className="bg-gradient-info text-white">
                <h3 className="mb-0 text-white">
                  <i className="fas fa-qrcode mr-2"></i> 
                  QR Code for Table: {table?.TableName || "Loading..."}
                </h3>
              </CardHeader>
              <CardBody className="text-center">
                {table ? (
                  <>
                    <div className="mb-4" ref={qrRef}>
                      <QRCodeCanvas 
                        value={getQRCodeValue()} 
                        size={256}
                        bgColor={"#ffffff"}
                        fgColor={"#000000"}
                        level={"H"}
                        includeMargin={true}
                      />
                    </div>
                    
                    <div className="mb-4">
                      <p className="mb-1"><strong>Table Name:</strong> {table.TableName}</p>
                      <p className="mb-1"><strong>Capacity:</strong> {table.capacity} persons</p>
                      <p className="mb-1"><strong>Zone:</strong> {table.location?.zone || 'Main'}</p>
                      {table.isVIP && (
                        <p className="mb-1"><span className="badge badge-info">VIP Table</span></p>
                      )}
                    </div>
                    
                    <Button 
                      color="success" 
                      size="lg" 
                      onClick={downloadQRCode}
                      className="mr-3"
                    >
                      <i className="fas fa-download mr-2"></i> Download QR Code
                    </Button>
                    
                    <Button 
                      color="primary" 
                      size="lg"
                      onClick={() => navigate("/tables-management")}
                    >
                      <i className="fas fa-arrow-left mr-2"></i> Back to Tables
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-5">
                    <Spinner color="primary" />
                    <p className="mt-3">Loading table information...</p>
                  </div>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default TableQRCode;