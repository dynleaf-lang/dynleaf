import React, { useEffect, useMemo, useState } from 'react';
import { Button, Modal, ModalBody, ModalFooter, ModalHeader, Form, FormGroup, Label, Input, Row, Col } from 'reactstrap';
import { PurchasesAPI } from '../../purchases/purchasesService';
import { SuppliersAPI } from '../../supplier-management/supplierService';

const RestockModal = ({ isOpen, toggle, item, scope, onCreated }) => {
  const [qty, setQty] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0,10));

  const [suppliers, setSuppliers] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierContact, setSupplierContact] = useState('');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setQty('');
      setUnitCost(item.costPrice != null ? String(item.costPrice) : '');
      setNotes('');
      setDate(new Date().toISOString().slice(0,10));
      setSupplierName(item.supplierName || '');
      setSupplierContact(item.supplierContact || '');
      setSelectedSupplierId('');
    }
  }, [item]);

  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        setLoadingSuppliers(true);
        const params = scope?.restaurantId
          ? { restaurantId: scope.restaurantId, isActive: true }
          : (scope?.branchId ? { branchId: scope.branchId, isActive: true } : { isActive: true });
        const list = await SuppliersAPI.list(params);
        setSuppliers(Array.isArray(list) ? list : []);
        // Preselect by name if matches item's supplierName
        if (item?.supplierName) {
          const match = list.find(s => (s.name || '').toLowerCase().trim() === item.supplierName.toLowerCase().trim());
          if (match) setSelectedSupplierId(match._id);
        }
      } catch (e) {
        setSuppliers([]);
      } finally {
        setLoadingSuppliers(false);
      }
    };
    if (isOpen) loadSuppliers();
  }, [isOpen, scope?.restaurantId, scope?.branchId, item?.supplierName]);

  const handleSupplierSelect = (e) => {
    const id = e.target.value;
    setSelectedSupplierId(id);
    if (!id) return;
    const s = suppliers.find(x => x._id === id);
    if (s) {
      const contact = [s.contactPerson, s.phone || s.email].filter(Boolean).join(' | ');
      setSupplierName(s.name || '');
      setSupplierContact(contact || '');
    }
  };

  const canSubmit = useMemo(() => {
    const qn = Number(qty);
    const cn = Number(unitCost || 0);
    return isFinite(qn) && qn > 0 && isFinite(cn) && cn >= 0;
  }, [qty, unitCost]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      const payload = {
        supplierId: selectedSupplierId || undefined,
        supplierName: supplierName || undefined,
        supplierContact: supplierContact || undefined,
        purchaseDate: date,
        notes: notes || undefined,
        branchId: scope?.branchId,
        restaurantId: scope?.restaurantId,
        items: [
          {
            itemId: item._id,
            name: item.name,
            unit: item.unit,
            qty: Number(qty),
            unitCost: unitCost === '' ? 0 : Number(unitCost),
            notes: undefined,
          }
        ]
      };
      await PurchasesAPI.create(payload);
      if (onCreated) onCreated();
      toggle();
    } catch (err) {
      alert(err?.response?.data?.message || err.message || 'Failed to create purchase');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} backdrop>
      <Form onSubmit={handleSubmit}>
        <ModalHeader toggle={toggle}>Restock: {item?.name}</ModalHeader>
        <ModalBody>
          <Row>
            <Col md="4">
              <FormGroup>
                <Label>Quantity</Label>
                <Input type="number" step="any" min="0" value={qty} onChange={e => setQty(e.target.value)} required />
              </FormGroup>
            </Col>
            <Col md="4">
              <FormGroup>
                <Label>Unit Cost</Label>
                <Input type="number" step="any" min="0" value={unitCost} onChange={e => setUnitCost(e.target.value)} />
              </FormGroup>
            </Col>
            <Col md="4">
              <FormGroup>
                <Label>Date</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md="8">
              <FormGroup>
                <Label>Supplier</Label>
                <div className="d-flex align-items-center gap-2">
                  <Input type="select" value={selectedSupplierId} onChange={handleSupplierSelect} disabled={loadingSuppliers}>
                    <option value="">{loadingSuppliers ? 'Loading suppliers...' : 'Select supplier (optional)'}</option>
                    {suppliers.map(s => (
                      <option key={s._id} value={s._id}>{s.name}{s.contactPerson ? ` — ${s.contactPerson}` : ''}</option>
                    ))}
                  </Input>
                  <Button color="link" type="button" onClick={() => window.open('/admin/suppliers', '_blank')}>Manage</Button>
                </div>
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md="6">
              <FormGroup>
                <Label>Supplier Name</Label>
                <Input value={supplierName} onChange={e => setSupplierName(e.target.value)} />
              </FormGroup>
            </Col>
            <Col md="6">
              <FormGroup>
                <Label>Supplier Contact</Label>
                <Input value={supplierContact} onChange={e => setSupplierContact(e.target.value)} />
              </FormGroup>
            </Col>
          </Row>

          <FormGroup>
            <Label>Notes</Label>
            <Input type="textarea" rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggle} disabled={saving}>Cancel</Button>
          <Button color="primary" type="submit" disabled={!canSubmit || saving}>{saving ? 'Saving...' : 'Create & Adjust'}</Button>
        </ModalFooter>
      </Form>
    </Modal>
  );
};

export default RestockModal;
