import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Col,
  Container,
  Form,
  FormGroup,
  Input,
  Label,
  Row,
  Table,
  Badge,
  Spinner,
} from 'reactstrap';
import { FaPlus, FaSync, FaFilter, FaSearch, FaEdit, FaTrash, FaTruck } from 'react-icons/fa';
import Header from '../../components/Headers/Header';
import { AuthContext } from '../../context/AuthContext';
import { SuppliersAPI } from './supplierService';
import SupplierFormModal from './components/SupplierFormModal';

const canWrite = (roles = []) => {
  const allowed = ['admin', 'Branch_Manager', 'Super_Admin'];
  return roles.some(r => allowed.includes(r));
};

const SuppliersManagement = () => {
  const { user } = useContext(AuthContext) || {};
  const roles = user?.roles || (user?.role ? [user.role] : []);

  const scope = useMemo(() => ({
    branchId: user?.branch?._id || user?.branchId,
    restaurantId: user?.restaurant?._id || user?.restaurantId,
  }), [user]);

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [q, setQ] = useState('');
  const [onlyActive, setOnlyActive] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const fetchSuppliers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await SuppliersAPI.list({ ...scope, q, isActive: onlyActive ? true : undefined });
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope.branchId, scope.restaurantId]);

  const onSubmitForm = async (values) => {
    try {
      if (editing?._id) {
        await SuppliersAPI.update(editing._id, values);
      } else {
        await SuppliersAPI.create({ ...values, ...scope });
      }
      setShowForm(false);
      setEditing(null);
      await fetchSuppliers();
    } catch (e) {
      alert(e?.response?.data?.message || e.message || 'Save failed');
    }
  };

  const onDelete = async (s) => {
    if (!s?._id) return;
    const ok = window.confirm(`Delete supplier "${s.name}"?`);
    if (!ok) return;
    try {
      await SuppliersAPI.remove(s._id);
      await fetchSuppliers();
    } catch (e) {
      alert(e?.response?.data?.message || e.message || 'Delete failed');
    }
  };

  return (
    <>
      <Header />
      <Container className="mt--7" fluid>
        <Row>
          <Col>
            <Card className="shadow">
              <CardHeader className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-2">
                  <FaTruck className="mr-2" />
                  <h3 className="mb-0">Suppliers</h3>
                </div>
                <div className="d-flex gap-2">
                  <Button color="secondary" size="sm" onClick={fetchSuppliers}>
                    <FaSync className="mr-1" /> Refresh
                  </Button>
                  {canWrite(roles) && (
                    <Button color="primary" size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
                      <FaPlus className="mr-1" /> New Supplier
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardBody>
                <Form onSubmit={(e) => { e.preventDefault(); fetchSuppliers(); }}>
                  <Row className="align-items-center">
                    <Col md="6">
                      <FormGroup>
                        <Label htmlFor="q"><FaSearch className="mr-1" /> Search</Label>
                        <Input id="q" placeholder="Search by name, email, phone, contact person..." value={q} onChange={(e) => setQ(e.target.value)} />
                      </FormGroup>
                    </Col>
                    <Col md="3">
                      <FormGroup check className="mt-4">
                        <Label check>
                          <Input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} />{' '}
                          Active Only
                        </Label>
                      </FormGroup>
                    </Col>
                    <Col md="3" className="text-right">
                      <Button color="info" type="submit">
                        <FaFilter className="mr-1" /> Apply Filters
                      </Button>
                    </Col>
                  </Row>
                </Form>

                {error && (
                  <div className="text-danger my-2">{error}</div>
                )}

                {loading ? (
                  <div className="py-5 text-center">
                    <Spinner color="primary" />
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table className="align-items-center table-flush" responsive>
                      <thead className="thead-light">
                        <tr>
                          <th>Name</th>
                          <th>Contact</th>
                          <th>Email</th>
                          <th>Phone</th>
                          <th>Status</th>
                          <th>Updated</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {suppliers.map((s) => (
                          <tr key={s._id}>
                            <td>
                              <div className="font-weight-bold">{s.name}</div>
                              {s.address && <div className="text-muted small">{s.address}</div>}
                            </td>
                            <td>{s.contactPerson || '-'}</td>
                            <td>{s.email || '-'}</td>
                            <td>{s.phone || '-'}</td>
                            <td>
                              {s.isActive ? (
                                <Badge color="success">Active</Badge>
                              ) : (
                                <Badge color="secondary">Inactive</Badge>
                              )}
                            </td>
                            <td className="small text-muted">{s.updatedAt ? new Date(s.updatedAt).toLocaleString() : '-'}</td>
                            <td>
                              <div className="d-flex gap-2">
                                {canWrite(roles) && (
                                  <>
                                    <Button size="sm" color="primary" onClick={() => { setEditing(s); setShowForm(true); }} title="Edit">
                                      <FaEdit />
                                    </Button>
                                    <Button size="sm" color="danger" onClick={() => onDelete(s)} title="Delete">
                                      <FaTrash />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                        {suppliers.length === 0 && (
                          <tr>
                            <td colSpan="7" className="text-center text-muted py-4">No suppliers found</td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </div>
                )}
              </CardBody>
            </Card>

            {showForm && (
              <SupplierFormModal
                isOpen={showForm}
                toggle={() => { setShowForm(false); setEditing(null); }}
                initialValues={editing}
                onSubmit={onSubmitForm}
              />
            )}
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default SuppliersManagement;
