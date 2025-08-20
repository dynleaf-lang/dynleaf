import React, { useEffect, useState } from 'react';
import { Button, Modal, ModalBody, ModalFooter, ModalHeader, Form, FormGroup, Label, Input, Row, Col } from 'reactstrap';

const defaultVals = {
  name: '',
  email: '',
  phone: '',
  contactPerson: '',
  address: '',
  gstNumber: '',
  notes: '',
  isActive: true,
};

const SupplierFormModal = ({ isOpen, toggle, initialValues, onSubmit }) => {
  const [values, setValues] = useState(defaultVals);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialValues) {
      setValues({ ...defaultVals, ...initialValues });
    } else {
      setValues(defaultVals);
    }
  }, [initialValues]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setValues(v => ({ ...v, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: values.name?.trim(),
        email: values.email?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
        contactPerson: values.contactPerson?.trim() || undefined,
        address: values.address?.trim() || undefined,
        gstNumber: values.gstNumber?.trim() || undefined,
        notes: values.notes?.trim() || undefined,
        isActive: !!values.isActive,
      };
      await onSubmit(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="lg" centered>
      <Form onSubmit={handleSubmit}>
        <ModalHeader toggle={toggle}>{initialValues?._id ? 'Edit Supplier' : 'Create Supplier'}</ModalHeader>
        <ModalBody>
          <Row>
            <Col md="6">
              <FormGroup>
                <Label>Name</Label>
                <Input name="name" value={values.name} onChange={handleChange} required />
              </FormGroup>
            </Col>
            <Col md="6">
              <FormGroup>
                <Label>Contact Person</Label>
                <Input name="contactPerson" value={values.contactPerson} onChange={handleChange} />
              </FormGroup>
            </Col>
            <Col md="6">
              <FormGroup>
                <Label>Email</Label>
                <Input type="email" name="email" value={values.email} onChange={handleChange} />
              </FormGroup>
            </Col>
            <Col md="6">
              <FormGroup>
                <Label>Phone</Label>
                <Input name="phone" value={values.phone} onChange={handleChange} />
              </FormGroup>
            </Col>
            <Col md="6">
              <FormGroup>
                <Label>GST/VAT Number</Label>
                <Input name="gstNumber" value={values.gstNumber} onChange={handleChange} />
              </FormGroup>
            </Col>
            <Col md="6">
              <FormGroup check className="mt-4">
                <Label check>
                  <Input type="checkbox" name="isActive" checked={values.isActive} onChange={handleChange} /> Active
                </Label>
              </FormGroup>
            </Col>
            <Col md="12">
              <FormGroup>
                <Label>Address</Label>
                <Input type="textarea" name="address" value={values.address} onChange={handleChange} />
              </FormGroup>
            </Col>
            <Col md="12">
              <FormGroup>
                <Label>Notes</Label>
                <Input type="textarea" name="notes" value={values.notes} onChange={handleChange} />
              </FormGroup>
            </Col>
          </Row>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggle} disabled={saving}>Cancel</Button>
          <Button color="primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </ModalFooter>
      </Form>
    </Modal>
  );
};

export default SupplierFormModal;
