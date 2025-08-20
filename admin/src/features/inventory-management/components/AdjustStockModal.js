import React, { useEffect, useState } from 'react';
import { Button, Modal, ModalBody, ModalFooter, ModalHeader, Form, FormGroup, Label, Input } from 'reactstrap';
import { InventoryAPI } from '../inventoryService';

const AdjustStockModal = ({ isOpen, toggle, item, onAdjusted, initialDeltaQty, initialReason, initialNotes }) => {
  const [deltaQty, setDeltaQty] = useState('');
  const [reason, setReason] = useState('manual');
  const [refOrderId, setRefOrderId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDeltaQty(typeof initialDeltaQty !== 'undefined' && initialDeltaQty !== null ? String(initialDeltaQty) : '');
      setReason(initialReason || 'manual');
      setNotes(initialNotes || '');
      setRefOrderId('');
    }
  }, [isOpen, initialDeltaQty, initialReason, initialNotes]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await InventoryAPI.adjust(item._id, { deltaQty: Number(deltaQty), reason, refOrderId: refOrderId || undefined, notes });
      onAdjusted && onAdjusted();
    } catch (err) {
      alert(err?.response?.data?.message || err.message || 'Adjustment failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} centered>
      <Form onSubmit={onSubmit}>
        <ModalHeader toggle={toggle}>Adjust Stock - {item?.name}</ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label>Quantity Change (use negative for deduction)</Label>
            <Input type="number" value={deltaQty} onChange={(e) => setDeltaQty(e.target.value)} required placeholder="e.g. 10 or -5" />
          </FormGroup>
          <FormGroup>
            <Label>Reason</Label>
            <Input type="select" value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="manual">Manual</option>
              <option value="purchase">Purchase</option>
              <option value="wastage">Wastage</option>
              <option value="breakage">Breakage</option>
              <option value="correction">Correction</option>
              <option value="sale">Sale</option>
            </Input>
          </FormGroup>
          <FormGroup>
            <Label>Reference Order ID (optional)</Label>
            <Input value={refOrderId} onChange={(e) => setRefOrderId(e.target.value)} placeholder="Order ID if applicable" />
          </FormGroup>
          <FormGroup>
            <Label>Notes</Label>
            <Input type="textarea" rows="3" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional details" />
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggle} disabled={saving}>Cancel</Button>
          <Button color="primary" type="submit" disabled={saving || deltaQty === ''}>
            {saving ? 'Saving...' : 'Apply Adjustment'}
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  );
};

export default AdjustStockModal;
