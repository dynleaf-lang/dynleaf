import React, { useState } from 'react';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Input, Label, FormGroup, Badge, Spinner } from 'reactstrap';
import { FaLockOpen, FaLock } from 'react-icons/fa';
import { useShift } from '../../context/ShiftContext';

const currency = (n) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(Number(n || 0));

export default function ShiftControls() {
  const { currentSession, openSession, closeSession, loading, error, lastSummary } = useShift();
  const [openModal, setOpenModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const [openingFloat, setOpeningFloat] = useState('');
  const [closingCash, setClosingCash] = useState('');
  const [expectedCash, setExpectedCash] = useState('');
  const [notes, setNotes] = useState('');

  const doOpen = async () => {
    await openSession({ openingFloat: Number(openingFloat || 0), notes });
    setOpenModal(false);
    setOpeningFloat(''); setNotes('');
  };

  const doClose = async () => {
    const totals = { ordersCount: 0, grossSales: 0, netSales: 0, discounts: 0, refunds: 0, byPayment: { cash: Number(expectedCash || 0), card: 0, online: 0 } };
    await closeSession({ closingCash: Number(closingCash || 0), expectedCash: Number(expectedCash || 0), totals, notes });
    setCloseModal(false);
    setClosingCash(''); setExpectedCash(''); setNotes('');
  setShowSummary(true);
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
            <Label>Expected Cash</Label>
            <Input type="number" min="0" step="1" value={expectedCash} onChange={(e) => setExpectedCash(e.target.value)} placeholder="0" />
            <small className="text-muted">Based on sales minus payouts. {currency(expectedCash)}</small>
          </FormGroup>
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
          <Button color="danger" onClick={doClose} disabled={loading}>Close</Button>
        </ModalFooter>
      </Modal>

      {/* Summary Modal after close */}
      <Modal isOpen={showSummary && !!lastSummary} toggle={() => setShowSummary(false)}>
        <ModalHeader toggle={() => setShowSummary(false)}>Session Summary</ModalHeader>
        <ModalBody>
          {lastSummary ? (
            <div>
              <div className="d-flex justify-content-between"><span>Orders</span><strong>{lastSummary.ordersCount || 0}</strong></div>
              <div className="d-flex justify-content-between"><span>Gross Sales</span><strong>{currency(lastSummary.grossSales)}</strong></div>
              <hr />
              <div className="d-flex justify-content-between"><span>Cash</span><strong>{currency(lastSummary.byPayment?.cash || 0)}</strong></div>
              <div className="d-flex justify-content-between"><span>Card</span><strong>{currency(lastSummary.byPayment?.card || 0)}</strong></div>
              <div className="d-flex justify-content-between"><span>Online</span><strong>{currency(lastSummary.byPayment?.online || 0)}</strong></div>
              <hr />
              <div className="d-flex justify-content-between"><span>Expected Cash</span><strong>{currency(lastSummary.expectedCash || 0)}</strong></div>
              <div className="d-flex justify-content-between"><span>Counted Cash</span><strong>{currency(lastSummary.closingCash || 0)}</strong></div>
              <div className="d-flex justify-content-between"><span>Variance</span><strong className={Number(lastSummary.cashVariance||0)===0? 'text-success':'text-danger'}>{currency(lastSummary.cashVariance || 0)}</strong></div>
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
