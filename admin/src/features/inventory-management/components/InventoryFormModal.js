import React, { useEffect, useState } from 'react';
import api from '../../../utils/api';
import { Button, Modal, ModalBody, ModalFooter, ModalHeader, Form, FormGroup, Label, Input, Row, Col } from 'reactstrap';

const defaultVals = {
  name: '',
  sku: '',
  unit: 'pcs',
  category: '',
  description: '',
  currentQty: 0,
  lowThreshold: 0,
  criticalThreshold: 0,
  isActive: true,
  supplierName: '',
  supplierContact: '',
  costPrice: '',
  salePrice: '',
  complianceNotes: '',
  expiryDate: '', // yyyy-mm-dd
};

// Fallback hard-coded category values
const DEFAULT_CATEGORIES = [
  'General', 'Beverages', 'Bakery', 'Dairy', 'Produce', 'Meat', 'Seafood', 'Pantry',
  'Spices', 'Sauces', 'Frozen', 'Dry Goods', 'Cleaning', 'Packaging', 'Disposables',
  'Paper Goods', 'Condiments', 'Snacks', 'Desserts', 'Breakfast', 'Grains', 'Oils',
  'Herbs', 'Hardware', 'Other'
];

const InventoryFormModal = ({ isOpen, toggle, initialValues, onSubmit, scope }) => {
  const [values, setValues] = useState(defaultVals);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(false);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');

  useEffect(() => {
    if (initialValues) {
      // Normalize expiryDate for date input (yyyy-mm-dd)
      let expiryDate = '';
      if (initialValues.expiryDate) {
        const d = new Date(initialValues.expiryDate);
        if (!isNaN(d)) {
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          expiryDate = `${yyyy}-${mm}-${dd}`;
        }
      }
      setValues({ ...defaultVals, ...initialValues, expiryDate });
    } else {
      setValues(defaultVals);
    }
  }, [initialValues]);

  // Load categories for dropdown (restaurant scoped preferred)
  useEffect(() => {
    const load = async () => {
      if (!scope?.restaurantId && !scope?.branchId) {
        // No scope: use defaults
        setCategories(DEFAULT_CATEGORIES);
        // Prefill default category for new items
        if (!initialValues && (!values.category || !values.category.trim())) {
          const preferred = DEFAULT_CATEGORIES.includes('General') ? 'General' : (DEFAULT_CATEGORIES[0] || '');
          if (preferred) setValues(v => ({ ...v, category: preferred }));
        }
        return;
      }
      setLoadingCats(true);
      try {
        let list = [];
        if (scope?.restaurantId) {
          const { data } = await api.get(`/public/categories/restaurant/${scope.restaurantId}`);
          list = Array.isArray(data?.categories) ? data.categories : [];
        } else if (scope?.branchId) {
          const { data } = await api.get(`/public/categories/branch/${scope.branchId}`);
          list = Array.isArray(data?.categories) ? data.categories : [];
        }
        // Map to unique names
        const names = Array.from(new Set(list.map(c => c?.name).filter(Boolean))).sort((a,b) => a.localeCompare(b));
        const finalList = names.length ? names : DEFAULT_CATEGORIES;
        setCategories(finalList);
        // Prefill default category for new items
        if (!initialValues && (!values.category || !values.category.trim())) {
          const preferred = finalList.includes('General') ? 'General' : (finalList[0] || '');
          if (preferred) setValues(v => ({ ...v, category: preferred }));
        }
        // If current value empty and options exist, do not auto-select; keep empty
      } catch (err) {
        console.warn('Failed to load categories', err?.response?.data?.message || err.message);
        setCategories(DEFAULT_CATEGORIES);
        if (!initialValues && (!values.category || !values.category.trim())) {
          const preferred = DEFAULT_CATEGORIES.includes('General') ? 'General' : (DEFAULT_CATEGORIES[0] || '');
          if (preferred) setValues(v => ({ ...v, category: preferred }));
        }
      } finally {
        setLoadingCats(false);
      }
    };
    load();
  }, [scope?.restaurantId, scope?.branchId]);

  // When categories load, detect if current value is a custom category
  useEffect(() => {
    const current = (values.category || '').trim();
    if (!current) {
      setIsCustomCategory(false);
      setCustomCategory('');
      return;
    }
    const inList = categories.includes(current);
    setIsCustomCategory(!inList);
    if (!inList) setCustomCategory(current);
  }, [categories]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'category') {
      if (value === '__custom__') {
        setIsCustomCategory(true);
        // keep existing category in custom input if present
        setCustomCategory((values.category || '').trim());
      } else {
        setIsCustomCategory(false);
        setCustomCategory('');
        setValues((v) => ({ ...v, category: value }));
      }
      return;
    }
    setValues((v) => ({ ...v, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: values.name?.trim(),
        sku: values.sku?.trim(),
        unit: values.unit,
        category: (isCustomCategory ? customCategory : values.category)?.trim() || undefined,
        description: values.description?.trim() || undefined,
        complianceNotes: values.complianceNotes?.trim() || undefined,
        currentQty: Number(values.currentQty) || 0,
        lowThreshold: Number(values.lowThreshold) || 0,
        criticalThreshold: Number(values.criticalThreshold) || 0,
        isActive: !!values.isActive,
        supplierName: values.supplierName?.trim() || undefined,
        supplierContact: values.supplierContact?.trim() || undefined,
        costPrice: values.costPrice === '' ? undefined : Number(values.costPrice),
        salePrice: values.salePrice === '' ? undefined : Number(values.salePrice),
        expiryDate: values.expiryDate ? values.expiryDate : undefined,
      };
      await onSubmit(payload);
    } catch (err) {
      // onSubmit handles alert
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="lg" centered>
      <Form onSubmit={handleSubmit}>
        <ModalHeader toggle={toggle}>{initialValues?._id ? 'Edit Item' : 'Create Item'}</ModalHeader>
        <ModalBody>
          <Row>
            <Col md="6">
              <FormGroup>
                <Label>Name</Label>
                <Input name="name" value={values.name} onChange={handleChange} required />
              </FormGroup>
            </Col>
            <Col md="3">
              <FormGroup>
                <Label>SKU</Label>
                <Input name="sku" value={values.sku} onChange={handleChange} />
              </FormGroup>
            </Col>
            <Col md="3">
              <FormGroup>
                <Label>Unit</Label>
                <Input type="select" name="unit" value={values.unit} onChange={handleChange}>
                  <option value="pcs">pcs</option>
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="L">L</option>
                  <option value="ml">ml</option>
                  <option value="pack">pack</option>
                  <option value="box">box</option>
                  <option value="custom">custom</option>
                </Input>
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md="4">
              <FormGroup>
                <Label>Category</Label>
                <Input
                  type="select"
                  name="category"
                  value={isCustomCategory ? '__custom__' : (values.category || '')}
                  onChange={handleChange}
                >
                  <option value="">{loadingCats ? 'Loading categories...' : 'Select category'}</option>
                  {categories.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                  <option value="__custom__">Custom...</option>
                </Input>
                {isCustomCategory && (
                  <Input
                    className="mt-2"
                    placeholder="Enter custom category"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                  />
                )}
              </FormGroup>
            </Col>
            <Col md="4">
              <FormGroup>
                <Label>Low Threshold</Label>
                <Input type="number" name="lowThreshold" value={values.lowThreshold} onChange={handleChange} />
              </FormGroup>
            </Col>
            <Col md="4">
              <FormGroup>
                <Label>Critical Threshold</Label>
                <Input type="number" name="criticalThreshold" value={values.criticalThreshold} onChange={handleChange} />
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md="4">
              <FormGroup>
                <Label>Initial Stock</Label>
                <Input type="number" name="currentQty" value={values.currentQty} onChange={handleChange} />
              </FormGroup>
            </Col>
            <Col md="4">
              <FormGroup>
                <Label>Cost Price</Label>
                <Input type="number" step="0.01" name="costPrice" value={values.costPrice} onChange={handleChange} />
              </FormGroup>
            </Col>
            <Col md="4">
              <FormGroup>
                <Label>Sale Price</Label>
                <Input type="number" step="0.01" name="salePrice" value={values.salePrice} onChange={handleChange} />
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md="4">
              <FormGroup>
                <Label>Expiry Date</Label>
                <Input type="date" name="expiryDate" value={values.expiryDate} onChange={handleChange} />
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md="6">
              <FormGroup>
                <Label>Supplier Name</Label>
                <Input name="supplierName" value={values.supplierName} onChange={handleChange} />
              </FormGroup>
            </Col>
            <Col md="6">
              <FormGroup>
                <Label>Supplier Contact</Label>
                <Input name="supplierContact" value={values.supplierContact} onChange={handleChange} />
              </FormGroup>
            </Col>
          </Row>

          <FormGroup>
            <Label>Description</Label>
            <Input type="textarea" rows="3" name="description" value={values.description} onChange={handleChange} />
          </FormGroup>

          <FormGroup>
            <Label>Compliance Notes</Label>
            <Input type="textarea" rows="2" name="complianceNotes" value={values.complianceNotes} onChange={handleChange} />
          </FormGroup>

          <FormGroup check>
            <Label check>
              <Input type="checkbox" name="isActive" checked={!!values.isActive} onChange={handleChange} /> Active
            </Label>
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggle} disabled={saving}>Cancel</Button>
          <Button color="primary" type="submit" disabled={saving}>{saving ? 'Saving...' : (initialValues?._id ? 'Update' : 'Create')}</Button>
        </ModalFooter>
      </Form>
    </Modal>
  );
};

export default InventoryFormModal;
