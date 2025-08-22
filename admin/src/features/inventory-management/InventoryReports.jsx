import React, { useEffect, useState, useContext, useMemo } from 'react';
import {
  Container, Row, Col, Card, CardHeader, CardBody,
  Badge, Spinner, Table, Form, FormGroup, Label, Input,
  InputGroup, InputGroupAddon, InputGroupText, Button
} from 'reactstrap';
import { Line } from 'react-chartjs-2';
import { format, addDays } from 'date-fns';
import Header from '../../components/Headers/Header';
import { AuthContext } from '../../context/AuthContext';
import { InventoryAPI } from './inventoryService';
import { FaExclamationTriangle, FaThermometerHalf, FaCheckCircle, FaTimesCircle, FaClock, FaBoxes, FaChartLine } from 'react-icons/fa';

const numberFormat = (n) => {
  if (typeof n !== 'number') return '0';
  return n.toLocaleString();
};

const currencyFormat = (n) => {
  if (typeof n !== 'number') return '0';
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
};

const InventoryReports = () => {
  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState({ groupBy: 'day', points: [] });
  const [expiringSoon, setExpiringSoon] = useState([]);
  const [adjustments, setAdjustments] = useState({ reasons: [], topItems: [] });

  // filters
  const [daysUntilExpiry, setDaysUntilExpiry] = useState(7);
  const [groupBy, setGroupBy] = useState('day');
  const [from, setFrom] = useState(format(new Date(Date.now() - 7*24*60*60*1000), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  const scopeParams = useMemo(() => ({
    branchId: user?.branchId,
    restaurantId: user?.restaurantId,
  }), [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [sum, wt, exp, adj] = await Promise.all([
        InventoryAPI.getSummary({ ...scopeParams, daysUntilExpiry }),
        InventoryAPI.getWastageTrends({ ...scopeParams, from, to, groupBy }),
        InventoryAPI.getExpiringSoon({ ...scopeParams, daysUntilExpiry }),
        InventoryAPI.getAdjustmentSummary({ ...scopeParams, from, to })
      ]);

      setSummary(sum);
      setTrends(wt);
      setExpiringSoon(exp);
      setAdjustments(adj);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load inventory reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daysUntilExpiry, from, to, groupBy, user?.branchId, user?.restaurantId]);

  const trendChartData = useMemo(() => {
    const pts = Array.isArray(trends?.points) ? trends.points : [];
    const map = new Map(pts.map(p => [p.period, Number(p.qty) || 0]));

    let labels = [];
    if (groupBy === 'day') {
      // Build inclusive list of dates between from and to
      const start = from ? new Date(`${from}T00:00:00`) : null;
      const end = to ? new Date(`${to}T00:00:00`) : null;
      if (start && end && !isNaN(start) && !isNaN(end) && start <= end) {
        for (let d = start; d <= end; d = addDays(d, 1)) {
          labels.push(format(d, 'yyyy-MM-dd'));
        }
      } else {
        labels = pts.map(p => p.period);
      }
    } else {
      labels = pts.map(p => p.period);
    }

    const data = labels.map(l => map.get(l) || 0);
    return {
      labels,
      datasets: [
        {
          label: 'Wastage Qty',
          data,
          fill: false,
          borderColor: 'rgba(234, 67, 53, 1)',
          backgroundColor: 'rgba(234, 67, 53, 0.2)',
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.25,
        }
      ]
    };
  }, [trends, from, to, groupBy]);

  return (
    <>
      <Header />
      <Container className="mt--7" fluid>
        <Row className="mb-3">
          <Col>
            <Card className="shadow">
              <CardHeader className="border-0 d-flex align-items-center justify-content-between">
                <h3 className="mb-0 d-flex align-items-center"><FaChartLine className="mr-2" /> Inventory Reports</h3>
                <div className="d-flex">
                  <Form inline className="mr-3">
                    <FormGroup className="mb-0 mr-2">
                      <Label className="mr-2">From</Label>
                      <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                    </FormGroup>
                    <FormGroup className="mb-0 mr-2">
                      <Label className="mr-2">To</Label>
                      <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                    </FormGroup>
                    <FormGroup className="mb-0 mr-2">
                      <Label className="mr-2">Group</Label>
                      <Input type="select" value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
                        <option value="day">Day</option>
                        <option value="week">Week</option>
                      </Input>
                    </FormGroup>
                    <FormGroup className="mb-0">
                      <Label className="mr-2">Expiry window</Label>
                      <InputGroup>
                        <Input type="number" min={1} value={daysUntilExpiry} onChange={(e)=> setDaysUntilExpiry(Number(e.target.value)||7)} />
                        <InputGroupAddon addonType="append">
                          <InputGroupText>days</InputGroupText>
                        </InputGroupAddon>
                      </InputGroup>
                    </FormGroup>
                  </Form>
                  <Button color="primary" onClick={loadData} disabled={loading}>
                    {loading ? <Spinner size="sm" /> : 'Refresh'}
                  </Button>
                </div>
              </CardHeader>
              {error ? (
                <CardBody>
                  <div className="text-danger">{error}</div>
                </CardBody>
              ) : null}
            </Card>
          </Col>
        </Row>

        <Row>
          <Col lg="2" md="4" sm="6" className="mb-4">
            <Card className="card-stats shadow">
              <CardBody>
                <Row>
                  <div className="col">
                    <h5 className="card-title text-uppercase text-muted mb-0">In Stock</h5>
                    <span className="h2 font-weight-bold mb-0">{numberFormat(summary?.counts?.in_stock || 0)}</span>
                  </div>
                  <Col className="col-auto">
                    <div className="icon icon-shape bg-success text-white rounded-circle shadow">
                      <FaCheckCircle />
                    </div>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>
          <Col lg="2" md="4" sm="6" className="mb-4">
            <Card className="card-stats shadow">
              <CardBody>
                <Row>
                  <div className="col">
                    <h5 className="card-title text-uppercase text-muted mb-0">Low</h5>
                    <span className="h2 font-weight-bold mb-0">{numberFormat(summary?.counts?.low || 0)}</span>
                  </div>
                  <Col className="col-auto">
                    <div className="icon icon-shape bg-warning text-white rounded-circle shadow">
                      <FaThermometerHalf />
                    </div>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>
          <Col lg="2" md="4" sm="6" className="mb-4">
            <Card className="card-stats shadow">
              <CardBody>
                <Row>
                  <div className="col">
                    <h5 className="card-title text-uppercase text-muted mb-0">Critical</h5>
                    <span className="h2 font-weight-bold mb-0">{numberFormat(summary?.counts?.critical || 0)}</span>
                  </div>
                  <Col className="col-auto">
                    <div className="icon icon-shape bg-danger text-white rounded-circle shadow">
                      <FaExclamationTriangle />
                    </div>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>
          <Col lg="2" md="4" sm="6" className="mb-4">
            <Card className="card-stats shadow">
              <CardBody>
                <Row>
                  <div className="col">
                    <h5 className="card-title text-uppercase text-muted mb-0">Out</h5>
                    <span className="h2 font-weight-bold mb-0">{numberFormat(summary?.counts?.out || 0)}</span>
                  </div>
                  <Col className="col-auto">
                    <div className="icon icon-shape bg-secondary text-white rounded-circle shadow">
                      <FaTimesCircle />
                    </div>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>
          <Col lg="2" md="4" sm="6" className="mb-4">
            <Card className="card-stats shadow">
              <CardBody>
                <Row>
                  <div className="col">
                    <h5 className="card-title text-uppercase text-muted mb-0">Expired</h5>
                    <span className="h2 font-weight-bold mb-0">{numberFormat(summary?.counts?.expired || 0)}</span>
                  </div>
                  <Col className="col-auto">
                    <div className="icon icon-shape bg-dark text-white rounded-circle shadow">
                      <FaClock />
                    </div>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>
          <Col lg="2" md="4" sm="6" className="mb-4">
            <Card className="card-stats shadow">
              <CardBody>
                <Row>
                  <div className="col">
                    <h5 className="card-title text-uppercase text-muted mb-0">Stock Value</h5>
                    <span className="h2 font-weight-bold mb-0">{currencyFormat(summary?.totalStockValue || 0)}</span>
                  </div>
                  <Col className="col-auto">
                    <div className="icon icon-shape bg-info text-white rounded-circle shadow">
                      <FaBoxes />
                    </div>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>
        </Row>

        <Row>
          <Col xl="6" className="mb-4">
            <Card className="shadow">
              <CardHeader className="bg-transparent">
                <h6 className="text-uppercase text-muted ls-1 mb-1">Trends</h6>
                <h2 className="mb-0">Wastage ({trends?.groupBy || 'day'})</h2>
              </CardHeader>
              <CardBody>
                {loading && !trends?.points?.length ? (
                  <div className="text-center py-4"><Spinner /></div>
                ) : (
                  <div className="chart">
                    <Line data={trendChartData} options={{ maintainAspectRatio: false, legend: { display: false } }} height={300} />
                  </div>
                )}
              </CardBody>
            </Card>
          </Col>

          <Col xl="6" className="mb-4">
            <Card className="shadow">
              <CardHeader className="bg-transparent d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-uppercase text-muted ls-1 mb-1">Today</h6>
                  <h2 className="mb-0">Wastage Summary</h2>
                </div>
              </CardHeader>
              <CardBody>
                <Row>
                  <Col md="6" className="mb-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="text-muted">Qty</span>
                      <span className="h3 mb-0">{numberFormat(summary?.todayWastageQty || 0)}</span>
                    </div>
                  </Col>
                  <Col md="6" className="mb-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="text-muted">Value</span>
                      <span className="h3 mb-0">{currencyFormat(summary?.todayWastageValue || 0)}</span>
                    </div>
                  </Col>
                </Row>
                <hr />
                <h5 className="mb-3">Top Items Impacted</h5>
                <Table className="table-flush" responsive>
                  <thead className="thead-light">
                    <tr>
                      <th>Item</th>
                      <th>Qty</th>
                      <th>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(adjustments?.topItems || []).map((t) => (
                      <tr key={t.itemId}>
                        <td>{t.name || t.itemId}</td>
                        <td>{numberFormat(t.qty)}</td>
                        <td>{numberFormat(t.count)}</td>
                      </tr>
                    ))}
                    {(!adjustments?.topItems || adjustments.topItems.length === 0) && (
                      <tr>
                        <td colSpan="3" className="text-center text-muted">No data</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </CardBody>
            </Card>
          </Col>
        </Row>

        <Row>
          <Col xl="6" className="mb-4">
            <Card className="shadow">
              <CardHeader className="bg-transparent d-flex align-items-center justify-content-between">
                <div>
                  <h6 className="text-uppercase text-muted ls-1 mb-1">Quality</h6>
                  <h2 className="mb-0">Expiring Soon</h2>
                </div>
              </CardHeader>
              <CardBody>
                <Table className="table-flush" responsive>
                  <thead className="thead-light">
                    <tr>
                      <th>Name</th>
                      <th>Qty</th>
                      <th>Unit</th>
                      <th>Expiry</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expiringSoon.map((it) => (
                      <tr key={it._id}>
                        <td>{it.name}</td>
                        <td>{numberFormat(it.currentQty)}</td>
                        <td>{it.unit || '-'}</td>
                        <td>{it.expiryDate ? format(new Date(it.expiryDate), 'dd MMM yyyy') : '-'}</td>
                        <td>
                          <Badge color={it.status === 'critical' ? 'danger' : it.status === 'low' ? 'warning' : 'success'}>
                            {it.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {expiringSoon.length === 0 && (
                      <tr>
                        <td colSpan="5" className="text-center text-muted">No items</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </CardBody>
            </Card>
          </Col>

          <Col xl="6" className="mb-4">
            <Card className="shadow">
              <CardHeader className="bg-transparent">
                <h6 className="text-uppercase text-muted ls-1 mb-1">Adjustments</h6>
                <h2 className="mb-0">By Reason</h2>
              </CardHeader>
              <CardBody>
                <Table className="table-flush" responsive>
                  <thead className="thead-light">
                    <tr>
                      <th>Reason</th>
                      <th>Qty</th>
                      <th>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(adjustments?.reasons || []).map((r) => (
                      <tr key={r.reason || 'unknown'}>
                        <td className="text-capitalize">{r.reason || 'unknown'}</td>
                        <td>{numberFormat(r.qty)}</td>
                        <td>{numberFormat(r.count)}</td>
                      </tr>
                    ))}
                    {(!adjustments?.reasons || adjustments.reasons.length === 0) && (
                      <tr>
                        <td colSpan="3" className="text-center text-muted">No data</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default InventoryReports;
