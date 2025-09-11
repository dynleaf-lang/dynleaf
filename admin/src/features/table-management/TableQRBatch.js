import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Container,
  Row,
  Col,
  Input,
  Label,
  FormGroup,
  Spinner,
  Alert
} from 'reactstrap';
import Header from 'components/Headers/Header.js';
import { TableContext } from '../../context/TableContext';

const TableQRBatch = () => {
  const { tables, loading, error, fetchTables } = useContext(TableContext);
  const [waNumber, setWaNumber] = useState(() => localStorage.getItem('waNumber') || '');
  const [mode, setMode] = useState(() => localStorage.getItem('qrMode') || 'whatsapp'); // 'whatsapp' | 'direct'
  const gridRef = useRef(null);

  useEffect(() => {
    // Load all tables if not present
    if (!tables || tables.length === 0) {
      fetchTables && fetchTables();
    }
  }, [tables, fetchTables]);

  useEffect(() => {
    localStorage.setItem('waNumber', waNumber || '');
  }, [waNumber]);

  useEffect(() => {
    localStorage.setItem('qrMode', mode);
  }, [mode]);

  const basePortalUrl = useMemo(() => {
    // Try to derive a customer portal base URL by removing 'admin' path part
    // Fallback to current origin
    const { origin } = window.location;
    return origin.replace(/\/?admin.*/i, '') || origin;
  }, []);

  const buildQRValue = (t) => {
    if (!t) return '';
  const restaurantId = t.restaurantId;
  const branchId = t.branchId;
  const tableCode = t.tableId || t.TableCode || t.TableName || t._id; // prefer human code

    if (mode === 'whatsapp') {
      const number = (waNumber || '').replace(/\D/g, '');
  const text = `Order Now\nT: ${tableCode}`;
      return number
        ? `https://wa.me/${number}?text=${encodeURIComponent(text)}`
        : `https://wa.me/?text=${encodeURIComponent(text)}`;
    }
    // Direct link to customer portal menu with params (non-magic)
    return `${basePortalUrl}/menu?tableId=${encodeURIComponent(tableCode)}&restaurantId=${restaurantId}&branchId=${branchId}`;
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <>
        <Header />
        <Container className="mt--7">
          <div className="text-center py-5">
            <Spinner color="primary" />
            <p className="mt-3">Loading tables...</p>
          </div>
        </Container>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <Container className="mt--7">
          <Alert color="danger">{String(error)}</Alert>
        </Container>
      </>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .qr-card { page-break-inside: avoid; break-inside: avoid; }
          .branding-header { display: block !important; }
        }

        .branding-header img { height: 48px; width: 48px; object-fit: contain; margin-right: 10px; }
        .branding-header { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 18px; }
        .branding-title { margin: 0; font-weight: 700; }
        .branding-sub { margin: 0; color: #6c757d; font-size: 0.9rem; }
      `}</style>
      <Header />
      <Container className="mt--7">
        <Card className="shadow">
          <CardHeader className="d-flex align-items-center justify-content-between">
            <h3 className="mb-0">
              <i className="fas fa-qrcode mr-2" /> Table QR Codes
            </h3>
            <div className="no-print d-flex align-items-center" style={{ gap: 12 }}>
              <FormGroup className="mb-0">
                <Label className="mb-0 mr-2">Mode</Label>
                <Input type="select" value={mode} onChange={(e) => setMode(e.target.value)}>
                  <option value="whatsapp">WhatsApp Magic Link</option>
                  <option value="direct">Direct Menu Link</option>
                </Input>
              </FormGroup>
              {mode === 'whatsapp' && (
                <FormGroup className="mb-0">
                  <Label className="mb-0 mr-2">WhatsApp Number (international format)</Label>
                  <Input
                    placeholder="e.g., 15551234567"
                    value={waNumber}
                    onChange={(e) => setWaNumber(e.target.value)}
                    style={{ minWidth: 220 }}
                  />
                </FormGroup>
              )}
              <Button color="primary" onClick={handlePrint}>
                <i className="fas fa-print mr-2" /> Print
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            {/* Branding header visible on screen and in print */}
            <div className="branding-header">
              <img src="/apple-icon.png" alt="Brand Logo" />
              <div className="text-center">
                <h4 className="branding-title">OrderEase</h4>
                <p className="branding-sub">Scan the QR to view menu and order</p>
              </div>
            </div>
            <Row ref={gridRef}>
              {(tables || []).map((t) => (
                <Col key={t._id} lg="3" md="4" sm="6" xs="12" className="mb-4">
                  <div className="qr-card p-3 border rounded text-center">
                    <div className="mb-2" style={{ fontWeight: 600 }}>{t.TableName || 'Table'}</div>
                    <QRCodeCanvas
                      value={buildQRValue(t)}
                      size={220}
                      bgColor="#ffffff"
                      fgColor="#000000"
                      level="H"
                      includeMargin
                    />
                    <div className="mt-2" style={{ fontSize: 12, color: '#6c757d' }}>
                      Cap: {t.capacity || '-'} • Zone: {t.location?.zone || 'Main'}
                    </div>
                    <div className="mt-2" style={{ fontSize: 12 }}>
                      <strong>Scan to order</strong>
                    </div>
                    <div className="mt-2 no-print">
                      <small className="text-muted" title={buildQRValue(t)}>
                        {mode === 'whatsapp' ? 'WhatsApp JOIN link' : 'Direct menu link'}
                      </small>
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          </CardBody>
        </Card>
      </Container>
    </>
  );
};

export default TableQRBatch;
