import React, { useState, useEffect, useMemo } from 'react';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Input, Label, FormGroup, Badge, Spinner } from 'reactstrap';
import { FaLockOpen, FaLock } from 'react-icons/fa';
import { useShift } from '../../context/ShiftContext';
import { useOrder } from '../../context/OrderContext';
import { useCurrency } from '../../context/CurrencyContext';
import axios from 'axios';


export default function ShiftControls() {
  const { currentSession, openSession, closeSession, loading, error, lastSummary, closeDetails } = useShift();
  const { orders } = useOrder();
  const { formatCurrency: fmt, isReady: currencyReady, getCurrencySymbol } = useCurrency();
  const [openModal, setOpenModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const [openingFloat, setOpeningFloat] = useState('');
  const [closingCash, setClosingCash] = useState('');
  const [expectedCash, setExpectedCash] = useState('');
  const [notes, setNotes] = useState('');

  // Compute a suggested expected cash: opening float + sum of paid cash orders since open
  const expectedCashSuggestion = useMemo(() => {
    try {
      if (!currentSession?.openAt) return 0;
      const openTs = new Date(currentSession.openAt).getTime();
      const opening = Number(currentSession.openingFloat || 0) || 0;
      const cashSales = (orders || []).reduce((sum, o) => {
        try {
          const ts = new Date(o.createdAt || o.orderDate || o.updatedAt || 0).getTime();
          const status = String(o.paymentStatus || o.orderPaymentStatus || '').toLowerCase();
          const method = String(o.paymentMethod || '').toLowerCase();
          const amt = Number(o.totalAmount || 0) || 0;
          if (Number.isFinite(ts) && ts >= openTs && status === 'paid' && (method === 'cash')) {
            return sum + amt;
          }
          return sum;
        } catch { return sum; }
      }, 0);
      return opening + cashSales;
    } catch { return 0; }
  }, [orders, currentSession]);

  // When closing modal opens, prefill expected cash with the suggestion if empty
  useEffect(() => {
    if (closeModal) {
      setExpectedCash((prev) => (prev === '' || prev == null ? String(Math.round(expectedCashSuggestion)) : prev));
    }
  }, [closeModal, expectedCashSuggestion]);

  const doOpen = async () => {
    await openSession({ openingFloat: Number(openingFloat || 0), notes });
    setOpenModal(false);
    setOpeningFloat(''); setNotes('');
  };

  const doClose = async () => {
    const totals = { ordersCount: 0, grossSales: 0, netSales: 0, discounts: 0, refunds: 0, byPayment: { cash: Number(expectedCash || 0), card: 0, online: 0 } };
  const res = await closeSession({ closingCash: Number(closingCash || 0), expectedCash: Number(expectedCash || 0), totals, notes });
    if (res) {
      setCloseModal(false);
      setClosingCash(''); setExpectedCash(''); setNotes('');
      setShowSummary(true);
    }
  };

  const resolveTables = async () => {
    if (!currentSession) return;
    try {
      await axios.post(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'}/api/pos/sessions/resolve-occupancy`, {
        branchId: currentSession.branchId
      });
    } catch (_) {}
  };

  return (
    <div className="d-flex align-items-center gap-2">
      {currentSession ? (
        <>
          <Badge color="success">Session Open</Badge>
          <Button color="danger" size="sm" onClick={() => setCloseModal(true)} disabled={loading}>
            {loading ? <Spinner size="sm" /> : <FaLock className="me-1" />} Close
          </Button>
        </>
      ) : (
        <>
          <Badge color="secondary">No Session</Badge>
          <Button color="primary" size="sm" onClick={() => setOpenModal(true)} disabled={loading}>
            {loading ? <Spinner size="sm" /> : <FaLockOpen className="me-1" />} Open
          </Button>
        </>
      )}

      {/* Open Modal */}
      <Modal isOpen={openModal} toggle={() => setOpenModal(false)}>
        <ModalHeader toggle={() => setOpenModal(false)}>Open Register</ModalHeader>
        <ModalBody>
          {error ? <div className="alert alert-danger py-2 mb-2">{error}</div> : null}
          <FormGroup>
            <Label>Opening Float</Label>
            <Input type="number" min="0" step="1" value={openingFloat} onChange={(e) => setOpeningFloat(e.target.value)} placeholder="0" />
          </FormGroup>
          <FormGroup>
            <Label>Notes</Label>
            <Input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setOpenModal(false)}>Cancel</Button>
          <Button color="primary" onClick={doOpen} disabled={loading}>Open</Button>
        </ModalFooter>
      </Modal>

      {/* Close Modal */}
      <Modal isOpen={closeModal} toggle={() => setCloseModal(false)}>
        <ModalHeader toggle={() => setCloseModal(false)}>Close Register</ModalHeader>
        <ModalBody>
          {error ? <div className="alert alert-danger py-2 mb-2">{error}</div> : null}
          <FormGroup>
            <div className="d-flex justify-content-between align-items-center">
              <Label className="mb-0">Expected Cash</Label>
              <Button size="sm" color="secondary" outline onClick={() => setExpectedCash(String(Math.round(expectedCashSuggestion || 0)))} disabled={loading}>
                Auto ({currencyReady && fmt ? fmt(expectedCashSuggestion, { minimumFractionDigits: 0 }) : expectedCashSuggestion})
              </Button>
            </div>
            <Input type="number" min="0" step="1" value={expectedCash} onChange={(e) => setExpectedCash(e.target.value)} placeholder="0" />
            <small className="text-muted">Opening float + paid cash sales since open. {currencyReady && fmt ? fmt(expectedCash, { minimumFractionDigits: 0 }) : expectedCash}</small>
          </FormGroup>
          {error && /orders are in progress|tables are occupied/i.test(error) && (
            <div className="alert alert-warning py-2">
              Please complete or cancel all pending orders and free occupied tables before closing.
              {closeDetails && (
                <div className="mt-2 small">
                  Active orders: <strong>{closeDetails.activeOrdersCount || 0}</strong> | Occupied tables: <strong>{closeDetails.occupiedTablesCount || 0}</strong>
                </div>
              )}
              <div className="mt-2">
                <Button size="sm" color="secondary" outline onClick={resolveTables} disabled={loading}>Resolve Tables</Button>
              </div>
            </div>
          )}
          <FormGroup>
            <Label>Counted (Closing) Cash</Label>
            <Input type="number" min="0" step="1" value={closingCash} onChange={(e) => setClosingCash(e.target.value)} placeholder="0" />
          </FormGroup>
          <FormGroup>
            <Label>Notes</Label>
            <Input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setCloseModal(false)}>Cancel</Button>
          <Button color="danger" onClick={doClose} disabled={loading}>Close Register</Button>
        </ModalFooter>
      </Modal>

      {/* Summary Modal after close */}
      <Modal isOpen={showSummary && !!lastSummary} toggle={() => setShowSummary(false)}>
        <ModalHeader toggle={() => setShowSummary(false)}>Session Summary</ModalHeader>
        <ModalBody>
          {lastSummary ? (
            <div>
              <div className="d-flex justify-content-between"><span>Orders</span><strong>{lastSummary.ordersCount || 0}</strong></div>
              <div className="d-flex justify-content-between"><span>Gross Sales</span><strong>{currencyReady && fmt ? fmt(lastSummary.grossSales, { minimumFractionDigits: 0 }) : lastSummary.grossSales}</strong></div>
              <hr />
              <div className="d-flex justify-content-between"><span>Cash</span><strong>{currencyReady && fmt ? fmt(lastSummary.byPayment?.cash || 0, { minimumFractionDigits: 0 }) : (lastSummary.byPayment?.cash || 0)}</strong></div>
              <div className="d-flex justify-content-between"><span>Card</span><strong>{currencyReady && fmt ? fmt(lastSummary.byPayment?.card || 0, { minimumFractionDigits: 0 }) : (lastSummary.byPayment?.card || 0)}</strong></div>
              <div className="d-flex justify-content-between"><span>Online</span><strong>{currencyReady && fmt ? fmt(lastSummary.byPayment?.online || 0, { minimumFractionDigits: 0 }) : (lastSummary.byPayment?.online || 0)}</strong></div>
              <hr />
              <div className="d-flex justify-content-between"><span>Expected Cash</span><strong>{currencyReady && fmt ? fmt(lastSummary.expectedCash || 0, { minimumFractionDigits: 0 }) : (lastSummary.expectedCash || 0)}</strong></div>
              <div className="d-flex justify-content-between"><span>Counted Cash</span><strong>{currencyReady && fmt ? fmt(lastSummary.closingCash || 0, { minimumFractionDigits: 0 }) : (lastSummary.closingCash || 0)}</strong></div>
              <div className="d-flex justify-content-between"><span>Variance</span><strong className={Number(lastSummary.cashVariance||0)===0? 'text-success':'text-danger'}>{currencyReady && fmt ? fmt(lastSummary.cashVariance || 0, { minimumFractionDigits: 0 }) : (lastSummary.cashVariance || 0)}</strong></div>
            </div>
          ) : (
            <div>No summary available.</div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={() => setShowSummary(false)}>Done</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
