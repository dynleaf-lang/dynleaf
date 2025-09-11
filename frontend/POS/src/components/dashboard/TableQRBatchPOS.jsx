import React, { useMemo } from 'react';
import { Row, Col, Card, CardBody, Button, Input, Label, FormGroup } from 'reactstrap';
import QRCode from 'react-qr-code';

const TableQRBatchPOS = ({ tables = [], waNumber, setWaNumber, mode, setMode }) => {
  const basePortalUrl = useMemo(() => {
    const { origin } = window.location;
    return origin.replace(/\/?pos.*/i, '') || origin;
  }, []);

  const buildQRValue = (t) => {
    if (!t) return '';
    const restaurantId = t.restaurantId;
    const branchId = t.branchId;
    const tableId = t._id;
    if (mode === 'whatsapp') {
      const number = (waNumber || '').replace(/\D/g, '');
      const text = `JOIN\nT: ${tableId}\nB: ${branchId}\nR: ${restaurantId}`;
      return number
        ? `https://wa.me/${number}?text=${encodeURIComponent(text)}`
        : `https://wa.me/?text=${encodeURIComponent(text)}`;
    }
    return `${basePortalUrl}/menu?tableId=${tableId}&restaurantId=${restaurantId}&branchId=${branchId}`;
  };

  const handlePrint = () => window.print();

  return (
    <div>
      <style>{`
        @media print { .no-print { display:none!important; } .qr-card { page-break-inside: avoid; } .branding-header { display:block!important; } }
        .branding-header { display:flex; align-items:center; justify-content:center; gap:12px; margin-bottom: 12px; }
        .branding-header img { height: 40px; width: 40px; object-fit: contain; }
        .branding-title { margin: 0; font-weight: 700; }
        .branding-sub { margin: 0; color:#6c757d; font-size: 0.9rem; }
      `}</style>
      <div className="no-print d-flex align-items-center justify-content-between mb-3">
        <div className="d-flex align-items-center" style={{ gap: 12 }}>
          <FormGroup className="mb-0">
            <Label className="mb-0 mr-2">Mode</Label>
            <Input type="select" value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="whatsapp">WhatsApp Magic Link</option>
              <option value="direct">Direct Menu Link</option>
            </Input>
          </FormGroup>
          {mode === 'whatsapp' && (
            <FormGroup className="mb-0">
              <Label className="mb-0 mr-2">WhatsApp Number</Label>
              <Input placeholder="e.g., 15551234567" value={waNumber} onChange={(e) => setWaNumber(e.target.value)} />
            </FormGroup>
          )}
        </div>
        <Button color="primary" onClick={handlePrint}>Print</Button>
      </div>
      {/* Branding header visible on screen and in print */}
      <div className="branding-header">
        <img src="/vite.svg" alt="Brand Logo" />
        <div className="text-center">
          <h5 className="branding-title">OrderEase</h5>
          <p className="branding-sub">Scan the QR to view menu and order</p>
        </div>
      </div>
      <Row>
        {(tables || []).map((t) => (
          <Col key={t._id} lg="3" md="4" sm="6" xs="12" className="mb-3">
            <Card className="qr-card">
              <CardBody className="text-center">
                <div style={{ fontWeight: 600, marginBottom: 8 }}>{t.TableName || 'Table'}</div>
                <QRCode value={buildQRValue(t)} size={220} />
                <div className="mt-2" style={{ fontSize: 12, color: '#6c757d' }}>
                  Cap: {t.capacity || '-'} • Zone: {t.location?.zone || 'Main'}
                </div>
                <div className="mt-2" style={{ fontSize: 12 }}>
                  <strong>Scan to order</strong>
                </div>
              </CardBody>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default TableQRBatchPOS;
