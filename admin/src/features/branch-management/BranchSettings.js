import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Container,
  Row,
  Col,
  FormGroup,
  Label,
  Spinner,
  Alert,
  Badge
} from 'reactstrap';
import Header from "components/Headers/Header.js";
import { BranchContext } from '../../context/BranchContext';
import { AuthContext } from '../../context/AuthContext';

const BranchSettings = ({ embedded = false }) => {
  const { branches, fetchBranches, updateBranchSettings, error } = useContext(BranchContext);
  const { user } = useContext(AuthContext);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  const myBranchId = user?.branchId || '';
  const branch = useMemo(() => branches.find(b => String(b._id) === String(myBranchId)), [branches, myBranchId]);

  useEffect(() => {
    if (!branches || branches.length === 0) fetchBranches();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleWA = async (e) => {
    const enabled = e.target.checked;
    if (!branch) return;
    setSaving(true);
    try {
      await updateBranchSettings(branch._id, { whatsappUpdatesEnabled: enabled });
      setSuccess(`WhatsApp updates ${enabled ? 'enabled' : 'disabled'} for this branch`);
      setTimeout(() => setSuccess(''), 2500);
    } catch (_) {}
    setSaving(false);
  };

  if (!user) return null;

  const content = (
    <Card className="shadow">
      <CardHeader className="border-0">
        <h3 className="mb-0">Branch Settings</h3>
        {branch && <p className="text-muted mb-0">{branch.name}</p>}
      </CardHeader>
      <CardBody>
              {error && (
                <Alert color="warning">
                  <i className="fas fa-exclamation-triangle mr-2" /> {error}
                </Alert>
              )}
              {success && (
                <Alert color="success">
                  <i className="fas fa-check-circle mr-2" /> {success}
                </Alert>
              )}

              {!branch ? (
                <div className="text-muted">No branch assigned to your user.</div>
              ) : (
                <Row>
                  <Col md="6">
                    <Card className="mb-4">
                      <CardBody>
                        <div className="d-flex align-items-center mb-3">
                          <div
                            className="icon icon-shape rounded-circle mr-3"
                            style={{ backgroundColor: branch?.settings?.whatsappUpdatesEnabled ? '#25D366' : '#f5f5f5', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <i className={`fas fa-comments ${branch?.settings?.whatsappUpdatesEnabled ? 'text-white' : 'text-muted'}`} />
                          </div>
                          <div>
                            <h4 className="mb-1">WhatsApp Order Updates</h4>
                            <Badge color={branch?.settings?.whatsappUpdatesEnabled ? 'success' : 'secondary'}>
                              {branch?.settings?.whatsappUpdatesEnabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-muted small">Send order placed/status updates to customers via WhatsApp when a phone number is present. Requires platform WA credentials.</p>
                        <FormGroup className="d-flex justify-content-between align-items-center mb-0">
                          <Label className="mb-0" htmlFor="wa-toggle">
                            {saving ? <Spinner size="sm" color="primary" /> : 'Status'}
                          </Label>
                          <div className="custom-control custom-switch">
                            <input
                              type="checkbox"
                              className="custom-control-input"
                              id="wa-toggle"
                              checked={Boolean(branch?.settings?.whatsappUpdatesEnabled)}
                              onChange={handleToggleWA}
                              disabled={saving}
                            />
                            <label className="custom-control-label" htmlFor="wa-toggle" />
                          </div>
                        </FormGroup>
                      </CardBody>
                    </Card>
                  </Col>
                </Row>
              )}
      </CardBody>
    </Card>
  );

  return (
    <>
      {!embedded && <Header />}
      {!embedded ? (
        <Container className="mt--7" fluid>
          <Row>
            <Col>
              {content}
            </Col>
          </Row>
        </Container>
      ) : (
        content
      )}
    </>
  );
};

export default BranchSettings;
