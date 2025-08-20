import React, { useEffect, useMemo, useState, useContext } from 'react';
import api from '../../utils/api';
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
  Badge,
  Table,
  Spinner,  
} from 'reactstrap';
import { FaPlus, FaSync, FaFilter, FaHistory, FaEdit, FaBoxes, FaSearch, FaBalanceScale, FaTruck, FaExclamationTriangle, FaClock } from 'react-icons/fa';
import { InventoryAPI } from './inventoryService';
import { AuthContext } from '../../context/AuthContext';
import AdjustStockModal from './components/AdjustStockModal';
import InventoryFormModal from './components/InventoryFormModal';
import HistoryModal from './components/HistoryModal';
import RestockModal from './components/RestockModal';
import Header from '../../components/Headers/Header';

// Fallback hard-coded category values for filters
const DEFAULT_CATEGORIES = [
  'General', 'Beverages', 'Bakery', 'Dairy', 'Produce', 'Meat', 'Seafood', 'Pantry',
  'Spices', 'Sauces', 'Frozen', 'Dry Goods', 'Cleaning', 'Packaging', 'Disposables',
  'Paper Goods', 'Condiments', 'Snacks', 'Desserts', 'Breakfast', 'Grains', 'Oils',
  'Herbs', 'Hardware', 'Other'
];

const statusBadge = (qty, lowThreshold, criticalThreshold, expiryDate) => {
  // Compute expired when expiryDate is past and there is stock remaining
  const now = new Date();
  if (expiryDate && qty > 0) {
    const exp = new Date(expiryDate);
    if (!isNaN(exp) && exp < now) return <Badge color="danger">Expired</Badge>;
  }
  if (qty <= 0) return <Badge color="danger">Out</Badge>;
  const critical = typeof criticalThreshold === 'number' ? criticalThreshold : 0;
  const low = typeof lowThreshold === 'number' ? lowThreshold : 0;
  if (qty <= critical) return <Badge color="danger">Critical</Badge>;
  if (qty <= low) return <Badge color="warning">Low</Badge>;
  return <Badge color="success">In Stock</Badge>;
};

const canWrite = (roles = []) => {
  const allowed = ['admin', 'Branch_Manager', 'Super_Admin'];
  return roles.some(r => allowed.includes(r));
};

const InventoryManagement = () => {
  const { user } = useContext(AuthContext) || {};
  const roles = user?.roles || (user?.role ? [user.role] : []);

  const scope = useMemo(() => ({
    branchId: user?.branch?._id || user?.branchId,
    restaurantId: user?.restaurant?._id || user?.restaurantId,
  }), [user]);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [onlyActive, setOnlyActive] = useState(true);
  const [supplierFilter, setSupplierFilter] = useState('');

  const [categories, setCategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(false);
  const [isCustomCategoryFilter, setIsCustomCategoryFilter] = useState(false);
  const [customCategoryFilter, setCustomCategoryFilter] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [adjustingItem, setAdjustingItem] = useState(null);
  const [historyItem, setHistoryItem] = useState(null);
  const [restockItem, setRestockItem] = useState(null);

  // Recent adjustments (consumption/purchases)
  const [recentAdjustments, setRecentAdjustments] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  // For preset adjustments (e.g., wastage)
  const [adjustingInitial, setAdjustingInitial] = useState(null);
  // Quick wastage form state
  const [wastageItemId, setWastageItemId] = useState('');
  const [wastageQty, setWastageQty] = useState('');
  const [wastageNotes, setWastageNotes] = useState('');

  // Dashboard derivations
  const computeStatus = (it) => {
    const currentQty = it.currentQty ?? 0;
    const low = it.lowThreshold ?? 0;
    const critical = it.criticalThreshold ?? 0;
    const now = new Date();
    if (it.expiryDate && currentQty > 0) {
      const exp = new Date(it.expiryDate);
      if (!isNaN(exp) && exp < now) return 'expired';
    }
    if (currentQty <= 0) return 'out';
    if (currentQty <= (typeof critical === 'number' ? critical : 0)) return 'critical';
    if (currentQty <= (typeof low === 'number' ? low : 0)) return 'low';
    return 'in_stock';
  };

  const upcomingDays = 14;
  const stats = useMemo(() => {
    const totals = { total: items.length, in_stock: 0, low: 0, critical: 0, out: 0, expired: 0, expiringSoon: 0 };
    const soonCutoff = new Date(Date.now() + upcomingDays * 24 * 60 * 60 * 1000);
    items.forEach(it => {
      const s = computeStatus(it);
      totals[s] = (totals[s] || 0) + 1;
      if (it.expiryDate && (it.currentQty ?? 0) > 0) {
        const exp = new Date(it.expiryDate);
        if (!isNaN(exp) && exp >= new Date() && exp <= soonCutoff) totals.expiringSoon += 1;
      }
    });
    return totals;
  }, [items]);

  const expiredItems = useMemo(() => {
    const now = new Date();
    return items
      .filter(it => (it.currentQty ?? 0) > 0 && it.expiryDate)
      .filter(it => {
        const d = new Date(it.expiryDate);
        return !isNaN(d) && d < now;
      })
      .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
  }, [items]);

  const lowList = useMemo(() => {
    return items
      .filter(it => ['low', 'critical', 'out'].includes(computeStatus(it)))
      .sort((a, b) => (a.currentQty ?? 0) - (b.currentQty ?? 0))
      .slice(0, 10);
  }, [items]);

  const upcomingExpiry = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(Date.now() + upcomingDays * 24 * 60 * 60 * 1000);
    return items
      .filter(it => (it.currentQty ?? 0) > 0 && it.expiryDate)
      .filter(it => {
        const d = new Date(it.expiryDate);
        return !isNaN(d) && d >= now && d <= cutoff;
      })
      .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))
      .slice(0, 10);
  }, [items]);

  const fetchItems = async () => {
    setLoading(true);
    setError('');
    try {
      const cat = (isCustomCategoryFilter ? customCategoryFilter : category) || '';
      const data = await InventoryAPI.list({ ...scope, q, status, category: cat, isActive: onlyActive ? true : undefined });
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const loadRecentAdjustments = async () => {
    if (!scope?.branchId && !scope?.restaurantId) {
      setRecentAdjustments([]);
      return;
    }
    setLoadingRecent(true);
    try {
      const list = await InventoryAPI.recentAdjustments({ branchId: scope.branchId, restaurantId: scope.restaurantId, limit: 20 });
      setRecentAdjustments(Array.isArray(list) ? list : []);
    } catch (_) {
      setRecentAdjustments([]);
    } finally {
      setLoadingRecent(false);
    }
  };

  useEffect(() => {
    fetchItems();
    loadRecentAdjustments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope.branchId, scope.restaurantId]);

  // Load categories for filter (restaurant scoped preferred)
  useEffect(() => {
    const loadCats = async () => {
      if (!scope?.restaurantId && !scope?.branchId) {
        setCategories(DEFAULT_CATEGORIES);
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
        const names = Array.from(new Set(list.map(c => c?.name).filter(Boolean))).sort((a,b) => a.localeCompare(b));
        setCategories(names.length ? names : DEFAULT_CATEGORIES);
      } catch (err) {
        console.warn('Failed to load categories', err?.response?.data?.message || err.message);
        setCategories(DEFAULT_CATEGORIES);
      } finally {
        setLoadingCats(false);
      }
    };
    loadCats();
  }, [scope?.restaurantId, scope?.branchId]);

  const onSubmitForm = async (values) => {
    try {
      if (editingItem?._id) {
        await InventoryAPI.update(editingItem._id, values);
      } else {
        await InventoryAPI.create(values);
      }
      setShowForm(false);
      setEditingItem(null);
      await fetchItems();
    } catch (e) {
      alert(e?.response?.data?.message || e.message || 'Save failed');
    }
  };

  const filtered = useMemo(() => {
    // If backend already filters via q/status/isActive, we apply only client-side supplier filter
    if (!supplierFilter) return items;
    const s = supplierFilter.toLowerCase();
    return items.filter(it => (it.supplierName || '').toLowerCase().includes(s));
  }, [items, supplierFilter]);

  return (
   <>
   <Header />
   <Container className="mt--7" fluid>
            <Row>
                <Col>
      <Card className="shadow">
        <CardHeader className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <FaBoxes className="mr-2" />
            <h3 className="mb-0">Inventory</h3>
          </div>
          <div className="d-flex gap-2">
            <Button color="secondary" size="sm" onClick={() => { fetchItems(); loadRecentAdjustments(); }}>
              <FaSync className="mr-1" /> Refresh
            </Button>
            {canWrite(roles) && (
              <Button color="primary" size="sm" onClick={() => { setEditingItem(null); setShowForm(true); }}>
                <FaPlus className="mr-1" /> New Item
              </Button>
            )}
          </div>
        </CardHeader>
        <CardBody>
          {/* Dashboard overview */}
          <Row className="mb-3">
            <Col md="2" sm="4" xs="6" className="mb-2">
              <Card className="shadow-sm">
                <CardBody className="py-3">
                  <div className="text-muted small">Total Items</div>
                  <div className="h4 mb-0">{stats.total}</div>
                </CardBody>
              </Card>
            </Col>
            <Col md="2" sm="4" xs="6" className="mb-2">
              <Card className="shadow-sm">
                <CardBody className="py-3">
                  <div className="text-muted small">In Stock</div>
                  <div className="h4 mb-0 text-success">{stats.in_stock}</div>
                </CardBody>
              </Card>
            </Col>
            <Col md="2" sm="4" xs="6" className="mb-2">
              <Card className="shadow-sm">
                <CardBody className="py-3">
                  <div className="text-muted small">Low</div>
                  <div className="h4 mb-0 text-warning">{stats.low}</div>
                </CardBody>
              </Card>
            </Col>
            <Col md="2" sm="4" xs="6" className="mb-2">
              <Card className="shadow-sm">
                <CardBody className="py-3">
                  <div className="text-muted small">Critical</div>
                  <div className="h4 mb-0 text-danger">{stats.critical}</div>
                </CardBody>
              </Card>
            </Col>
            <Col md="2" sm="4" xs="6" className="mb-2">
              <Card className="shadow-sm">
                <CardBody className="py-3">
                  <div className="text-muted small">Out</div>
                  <div className="h4 mb-0 text-danger">{stats.out}</div>
                </CardBody>
              </Card>
            </Col>
            <Col md="2" sm="4" xs="6" className="mb-2">
              <Card className="shadow-sm">
                <CardBody className="py-3">
                  <div className="text-muted small d-flex align-items-center"><FaClock className="mr-1"/>Expiring ≤ {upcomingDays}d</div>
                  <div className="h4 mb-0 text-info">{stats.expiringSoon}</div>
                </CardBody>
              </Card>
            </Col>
          </Row>

          {/* Quick insights */}
          <Row className="mb-4">
            <Col md="6" className="mb-3">
              <Card className="shadow-sm h-100">
                <CardHeader className="py-2"><FaExclamationTriangle className="mr-2"/>Low / Critical / Out</CardHeader>
                <CardBody className="p-0">
                  {lowList.length ? (
                    <div className="table-responsive">
                      <Table className="table-sm mb-0">
                        <thead className="thead-light">
                          <tr>
                            <th>Name</th>
                            <th className="text-right">Qty</th>
                            <th>Low</th>
                            <th>Critical</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lowList.map(it => (
                            <tr key={it._id}>
                              <td>{it.name}</td>
                              <td className="text-right">{it.currentQty ?? 0}</td>
                              <td className="small">{it.lowThreshold ?? 0}</td>
                              <td className="small">{it.criticalThreshold ?? 0}</td>
                              <td>{statusBadge(it.currentQty ?? 0, it.lowThreshold, it.criticalThreshold, it.expiryDate)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  ) : (
                    <div className="p-3 text-muted small">All good. No low stock items.</div>
                  )}
                </CardBody>
              </Card>
            </Col>
            <Col md="6" className="mb-3">
              <Card className="shadow-sm h-100">
                <CardHeader className="py-2"><FaClock className="mr-2"/>Upcoming Expiry (≤ {upcomingDays} days)</CardHeader>
                <CardBody className="p-0">
                  {upcomingExpiry.length ? (
                    <div className="table-responsive">
                      <Table className="table-sm mb-0">
                        <thead className="thead-light">
                          <tr>
                            <th>Name</th>
                            <th>Expiry</th>
                            <th className="text-right">Qty</th>
                          </tr>
                        </thead>
                        <tbody>
                          {upcomingExpiry.map(it => (
                            <tr key={it._id}>
                              <td>{it.name}</td>
                              <td className="small">{new Date(it.expiryDate).toLocaleDateString()}</td>
                              <td className="text-right">{it.currentQty ?? 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  ) : (
                    <div className="p-3 text-muted small">No items expiring soon.</div>
                  )}
                </CardBody>
              </Card>
            </Col>
          </Row>

          <Form onSubmit={(e) => { e.preventDefault(); fetchItems(); }}>
            <Row className="align-items-center">
              <Col md="3">
                <FormGroup>
                  <Label for="q"><FaSearch className="mr-1" /> Search</Label>
                  <Input id="q" placeholder="Search by name, SKU, supplier..." value={q} onChange={(e) => setQ(e.target.value)} />
                </FormGroup>
              </Col>
              <Col md="2">
                <FormGroup>
                  <Label for="status"><FaFilter className="mr-1" /> Status</Label>
                  <Input type="select" id="status" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">All</option>
                    <option value="in_stock">In Stock</option>
                    <option value="low">Low</option>
                    <option value="critical">Critical</option>
                    <option value="out">Out</option>
                    <option value="expired">Expired</option>
                  </Input>
                </FormGroup>
              </Col>
              <Col md="2">
                <FormGroup>
                  <Label for="category"><FaFilter className="mr-1" /> Category</Label>
                  <Input
                    type="select"
                    id="category"
                    value={isCustomCategoryFilter ? '__custom__' : category}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '__custom__') {
                        setIsCustomCategoryFilter(true);
                        // keep any previous custom text
                      } else {
                        setIsCustomCategoryFilter(false);
                        setCustomCategoryFilter('');
                        setCategory(v);
                      }
                    }}
                  >
                    <option value="">{loadingCats ? 'Loading...' : 'All Categories'}</option>
                    {categories.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                    <option value="__custom__">Custom...</option>
                  </Input>
                  {isCustomCategoryFilter && (
                    <Input
                      className="mt-2"
                      placeholder="Enter custom category"
                      value={customCategoryFilter}
                      onChange={(e) => setCustomCategoryFilter(e.target.value)}
                    />
                  )} 
                </FormGroup>
              </Col>
              <Col md="2">
               <FormGroup>
               <Label for="supplier"><FaFilter className="mr-1" /> Supplier</Label>
              <Input 
                    placeholder="Filter by supplier"
                    value={supplierFilter}
                    onChange={(e) => setSupplierFilter(e.target.value)}
                  />
               </FormGroup>
              </Col>
              <Col md="1">
                <FormGroup check className="mt-4">
                  <Label check>
                    <Input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} />{' '}
                 <span className='small'>Active Only</span>
                  </Label>
                </FormGroup>
              </Col>
              <Col md="2" className="text-right">
                <Button color="info" type="submit">
                  <FaFilter className="mr-1" /> Apply Filters
                </Button>
              </Col>
            </Row>
          </Form>

          {/* Wastage & Expiry */}
          <Row className="mb-4">
            <Col md="7" className="mb-3">
              <Card className="shadow-sm h-100">
                <CardHeader className="py-2">Expired Items</CardHeader>
                <CardBody className="p-0">
                  {expiredItems.length ? (
                    <div className="table-responsive">
                      <Table className="table-sm mb-0">
                        <thead className="thead-light">
                          <tr>
                            <th>Name</th>
                            <th>Expired On</th>
                            <th className="text-right">Qty</th>
                            <th>Unit</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expiredItems.map(it => (
                            <tr key={it._id}>
                              <td>{it.name}</td>
                              <td className="small">{new Date(it.expiryDate).toLocaleDateString()}</td>
                              <td className="text-right">{it.currentQty ?? 0}</td>
                              <td>{it.unit || '-'}</td>
                              <td>
                                <Button size="sm" color="danger" onClick={() => { setAdjustingItem(it); setAdjustingInitial({ initialDeltaQty: -(Math.abs(it.currentQty ?? 0) || 1), initialReason: 'wastage', initialNotes: 'Expired disposal' }); }}>
                                  Record Wastage
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  ) : (
                    <div className="p-3 text-muted small">No expired stock requiring disposal.</div>
                  )}
                </CardBody>
              </Card>
            </Col>
            <Col md="5" className="mb-3">
              <Card className="shadow-sm h-100">
                <CardHeader className="py-2">Quick Wastage Record</CardHeader>
                <CardBody>
                  <Form onSubmit={(e) => {
                    e.preventDefault();
                    const qty = Number(wastageQty);
                    if (!wastageItemId || !qty || qty <= 0) return;
                    const it = items.find(x => x._id === wastageItemId);
                    if (!it) return;
                    setAdjustingItem(it);
                    setAdjustingInitial({ initialDeltaQty: -Math.abs(qty), initialReason: 'wastage', initialNotes: wastageNotes || 'Wastage' });
                  }}>
                    <FormGroup>
                      <Label>Item</Label>
                      <Input type="select" value={wastageItemId} onChange={(e) => setWastageItemId(e.target.value)} required>
                        <option value="">Select item…</option>
                        {items.map(it => (
                          <option key={it._id} value={it._id}>{it.name}</option>
                        ))}
                      </Input>
                    </FormGroup>
                    <Row>
                      <Col md="6">
                        <FormGroup>
                          <Label>Quantity</Label>
                          <Input type="number" min="0" step="any" value={wastageQty} onChange={(e) => setWastageQty(e.target.value)} placeholder="e.g. 2.5" required />
                        </FormGroup>
                      </Col>
                      <Col md="6">
                        <FormGroup>
                          <Label>Notes</Label>
                          <Input value={wastageNotes} onChange={(e) => setWastageNotes(e.target.value)} placeholder="Optional notes" />
                        </FormGroup>
                      </Col>
                    </Row>
                    <Button color="danger" type="submit">Record Wastage</Button>
                  </Form>
                </CardBody>
              </Card>
            </Col>
          </Row>

          {/* Recent consumption panel */}
          <div className="mb-4">
            <div className="d-flex align-items-center mb-2">
              <FaHistory className="mr-2" />
              <h5 className="mb-0">Recent Consumption</h5>
              <Button color="link" size="sm" className="ml-2 p-0" onClick={loadRecentAdjustments}>Reload</Button>
            </div>
            {loadingRecent ? (
              <div className="py-2"><Spinner size="sm" color="primary" /> Loading…</div>
            ) : recentAdjustments.length ? (
              <div className="table-responsive">
                <Table className="table-sm mb-0">
                  <thead className="thead-light">
                    <tr>
                      <th>When</th>
                      <th>Item</th>
                      <th className="text-right">Qty</th>
                      <th>Unit</th>
                      <th>Reason</th>
                      <th>Ref</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAdjustments.map((adj) => {
                      const qty = Number(adj.deltaQty || 0);
                      const isConsumption = qty < 0 || (adj.reason || '').toLowerCase() === 'sale';
                      const badgeColor = isConsumption ? 'danger' : 'success';
                      const reasonLabel = (adj.reason || '').charAt(0).toUpperCase() + (adj.reason || '').slice(1);
                      return (
                        <tr key={adj._id}>
                          <td className="small text-muted">{adj.createdAt ? new Date(adj.createdAt).toLocaleString() : '-'}</td>
                          <td>{adj.item?.name || adj.itemId}</td>
                          <td className="text-right">{qty}</td>
                          <td>{adj.item?.unit || '-'}</td>
                          <td><Badge color={badgeColor}>{reasonLabel || '—'}</Badge></td>
                          <td className="small text-muted">{adj.refOrderId || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            ) : (
              <div className="text-muted small">No recent adjustments</div>
            )}
          </div>

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
                    <th>SKU</th>
                    <th>Unit</th>
                    <th>Category</th>
                    <th>Expiry</th>
                    <th className="text-right">Stock</th>
                    <th>Thresholds</th>
                    <th>Status</th>
                    <th>Supplier</th>
                    <th>Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((it) => (
                    <tr key={it._id}>
                      <td>
                        <div className="font-weight-bold">{it.name}</div>
                        <div className="text-muted small">{it.description}</div>
                      </td>
                      <td>{it.sku || '-'}</td>
                      <td>{it.unit || '-'}</td>
                      <td>{it.category?.name || it.category || '-'}</td>
                      <td>
                        {it.expiryDate ? (
                          <>
                            <span className="small">{new Date(it.expiryDate).toLocaleDateString()}</span>
                            {(it.currentQty ?? 0) > 0 && new Date(it.expiryDate) < new Date() && (
                              <>
                                <br />
                                <Badge color="danger" className="mt-1">Expired</Badge>
                              </>
                            )}
                          </>
                        ) : (
                          <span className="text-muted small">—</span>
                        )}
                      </td>
                      <td className="text-right">
                        <span>{it.currentQty ?? 0}</span>
                      </td>
                      <td>
                        <span className="small text-muted">Low: {it.lowThreshold ?? 0}</span>
                        <br />
                        <span className="small text-muted">Critical: {it.criticalThreshold ?? 0}</span>
                      </td>
                      <td>
                        {statusBadge(it.currentQty ?? 0, it.lowThreshold, it.criticalThreshold, it.expiryDate)}
                      </td>
                      <td>
                        <span className="small">{it.supplierName || '-'}</span>
                      </td>
                      <td className="small text-muted">{it.updatedAt ? new Date(it.updatedAt).toLocaleString() : '-'}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <Button size="sm" color="secondary" onClick={() => setHistoryItem(it)} title="Adjustment History">
                            <FaHistory />
                          </Button>
                          {canWrite(roles) && (
                            <>
                              <Button size="sm" color="success" onClick={() => setRestockItem(it)} title="Restock (create purchase & adjust)">
                                <FaTruck />
                              </Button>
                              <Button size="sm" color="warning" onClick={() => setAdjustingItem(it)} title="Adjust Stock">
                                <FaBalanceScale />
                              </Button>
                              <Button size="sm" color="primary" onClick={() => { setEditingItem(it); setShowForm(true); }} title="Edit">
                                <FaEdit />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan="11" className="text-center text-muted py-4">No items found</td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </CardBody>
      </Card>

      {showForm && (
        <InventoryFormModal
          isOpen={showForm}
          toggle={() => { setShowForm(false); setEditingItem(null); }}
          initialValues={editingItem}
          onSubmit={onSubmitForm}
          scope={scope}
        />
      )}

      {!!adjustingItem && (
        <AdjustStockModal
          isOpen={!!adjustingItem}
          toggle={() => { setAdjustingItem(null); setAdjustingInitial(null); }}
          item={adjustingItem}
          initialDeltaQty={adjustingInitial?.initialDeltaQty}
          initialReason={adjustingInitial?.initialReason}
          initialNotes={adjustingInitial?.initialNotes}
          onAdjusted={async () => {
            setAdjustingItem(null);
            setAdjustingInitial(null);
            setWastageItemId('');
            setWastageQty('');
            setWastageNotes('');
            await fetchItems();
            await loadRecentAdjustments();
          }}
        />
      )}

      {!!historyItem && (
        <HistoryModal
          isOpen={!!historyItem}
          toggle={() => setHistoryItem(null)}
          itemId={historyItem._id}
          itemName={historyItem.name}
        />
      )}

      {!!restockItem && (
        <RestockModal
          isOpen={!!restockItem}
          toggle={() => setRestockItem(null)}
          item={restockItem}
          scope={scope}
          onCreated={async () => { setRestockItem(null); await fetchItems(); }}
        />
      )}
   
   </Col>
   </Row>
   </Container>
   </>
  );
};

export default InventoryManagement;
