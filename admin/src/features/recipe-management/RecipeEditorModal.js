import React, { useEffect, useMemo, useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Row, Col, Form, FormGroup, Label, Input, Table } from 'reactstrap';
import { InventoryAPI } from '../inventory-management/inventoryService';
import { RecipeAPI } from './recipeService';

const RecipeEditorModal = ({ isOpen, toggle, menuItem, scope, onSaved }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [inventory, setInventory] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [notes, setNotes] = useState('');
  const [totalQty, setTotalQty] = useState(1);
  const [totalUnit, setTotalUnit] = useState('portion');

  const effectiveScope = useMemo(() => ({
    restaurantId: scope?.restaurantId || menuItem?.restaurantId,
    branchId: scope?.branchId || menuItem?.branchId,
  }), [scope?.restaurantId, scope?.branchId, menuItem?.restaurantId, menuItem?.branchId]);

  useEffect(() => {
    if (!isOpen) return;
    const loadData = async () => {
      setLoading(true);
      try {
        const inv = await InventoryAPI.list({ ...effectiveScope, isActive: true });
        setInventory(Array.isArray(inv) ? inv : []);
        const existing = await RecipeAPI.get(menuItem._id, effectiveScope);
        if (existing) {
          setIngredients(existing.ingredients || []);
          setNotes(existing.notes || '');
          setTotalQty(existing.totalQty || 1);
          setTotalUnit(existing.totalUnit || 'portion');
        } else {
          setIngredients([]);
          setNotes('');
          setTotalQty(1);
          setTotalUnit('portion');
        }
      } catch (e) {
        // fall back to empty
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [isOpen, menuItem?._id, effectiveScope.restaurantId, effectiveScope.branchId]);

  const addRow = () => {
    setIngredients(prev => [...prev, { inventoryItemId: '', name: '', qty: 1, unit: '', wastePct: 0 }]);
  };
  const removeRow = (idx) => {
    setIngredients(prev => prev.filter((_, i) => i !== idx));
  };
  const changeRow = (idx, field, value) => {
    setIngredients(prev => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  };
  const selectInventory = (idx, id) => {
    const item = inventory.find(i => i._id === id);
    setIngredients(prev => prev.map((row, i) => i === idx ? {
      ...row,
      inventoryItemId: id,
      name: item?.name || row.name,
      unit: item?.unit || row.unit
    } : row));
  };

  const canSave = useMemo(() => {
    if (!menuItem?._id) return false;
    if (!ingredients || ingredients.length === 0) return false;
    for (const r of ingredients) {
      const q = Number(r.qty);
      if (!r.inventoryItemId || !isFinite(q) || q <= 0) return false;
    }
    return true;
  }, [menuItem?._id, ingredients]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    try {
      const payload = {
        ingredients: ingredients.map(r => ({
          inventoryItemId: r.inventoryItemId,
          name: r.name || undefined,
          qty: Number(r.qty),
          unit: r.unit || undefined,
          wastePct: r.wastePct ? Number(r.wastePct) : 0,
          notes: r.notes || undefined,
        })),
        totalQty: Number(totalQty) || 1,
        totalUnit: totalUnit || 'portion',
        notes: notes || undefined,
        branchId: effectiveScope.branchId,
        restaurantId: effectiveScope.restaurantId,
      };
      await RecipeAPI.save(menuItem._id, payload);
      if (onSaved) onSaved();
      toggle();
    } catch (err) {
      alert(err?.response?.data?.message || err.message || 'Failed to save recipe');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="lg">
      <Form onSubmit={handleSave}>
        <ModalHeader toggle={toggle}>Recipe for: {menuItem?.name}</ModalHeader>
        <ModalBody>
          {loading ? (
            <div className="text-center py-3">Loading...</div>
          ) : (
            <>
              <Row>
                <Col md="4">
                  <FormGroup>
                    <Label>Total Yield Qty</Label>
                    <Input type="number" step="any" min="0" value={totalQty} onChange={e => setTotalQty(e.target.value)} />
                  </FormGroup>
                </Col>
                <Col md="4">
                  <FormGroup>
                    <Label>Total Yield Unit</Label>
                    <Input value={totalUnit} onChange={e => setTotalUnit(e.target.value)} placeholder="portion" />
                  </FormGroup>
                </Col>
              </Row>

              <Table bordered responsive size="sm">
                <thead>
                  <tr>
                    <th style={{ minWidth: 220 }}>Ingredient (Inventory)</th>
                    <th>Qty</th>
                    <th>Unit</th>
                    <th>Waste %</th>
                    <th>Notes</th>
                    <th style={{ width: 60 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ingredients.map((row, idx) => (
                    <tr key={idx}>
                      <td>
                        <Input type="select" value={row.inventoryItemId} onChange={e => selectInventory(idx, e.target.value)}>
                          <option value="">Select Inventory Item</option>
                          {inventory.map(inv => (
                            <option key={inv._id} value={inv._id}>{inv.name} {inv.unit ? `(${inv.unit})` : ''}</option>
                          ))}
                        </Input>
                      </td>
                      <td>
                        <Input type="number" step="any" min="0" value={row.qty} onChange={e => changeRow(idx, 'qty', e.target.value)} />
                      </td>
                      <td>
                        <Input value={row.unit || ''} onChange={e => changeRow(idx, 'unit', e.target.value)} placeholder="e.g., g, ml, pcs" />
                      </td>
                      <td>
                        <Input type="number" step="any" min="0" max="100" value={row.wastePct || 0} onChange={e => changeRow(idx, 'wastePct', e.target.value)} />
                      </td>
                      <td>
                        <Input value={row.notes || ''} onChange={e => changeRow(idx, 'notes', e.target.value)} />
                      </td>
                      <td>
                        <Button color="danger" size="sm" onClick={() => removeRow(idx)}>Remove</Button>
                      </td>
                    </tr>
                  ))}
                  {ingredients.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center text-muted">No ingredients. Click Add Ingredient.</td>
                    </tr>
                  )}
                </tbody>
              </Table>

              <Button color="secondary" size="sm" type="button" onClick={addRow}>+ Add Ingredient</Button>

              <FormGroup className="mt-3">
                <Label>Recipe Notes</Label>
                <Input type="textarea" rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
              </FormGroup>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggle} disabled={saving}>Cancel</Button>
          <Button color="primary" type="submit" disabled={!canSave || saving}>{saving ? 'Saving...' : 'Save Recipe'}</Button>
        </ModalFooter>
      </Form>
    </Modal>
  );
};

export default RecipeEditorModal;
