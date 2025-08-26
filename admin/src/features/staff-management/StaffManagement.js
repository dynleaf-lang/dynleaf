import React, { useState, useEffect, useContext } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Container,
  Row,
  Col,
  Nav,
  NavItem,
  NavLink,
  TabContent,
  TabPane,
  Button,
  Badge,
  Alert,
  Spinner
} from 'reactstrap';
import classnames from 'classnames';
import { AuthContext } from '../../context/AuthContext';
import { useStaff } from '../../context/StaffContext';
import Header from '../../components/Headers/Header';
import StaffTable from './components/StaffTable';
import StaffModal from './components/StaffModal';
import StaffStats from './components/StaffStats';

const StaffManagement = () => {
  const { user, isBranchManager } = useContext(AuthContext);
  const {
    staff,
    loading,
    error,
    stats,
    fetchStaff,
    fetchStaffStats,
    createStaff,
    updateStaff,
    updateStaffStatus,
    deleteStaff,
    setError
  } = useStaff();

  const [activeTab, setActiveTab] = useState('employees');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [alertMessage, setAlertMessage] = useState({ visible: false, color: '', message: '' });

  // Note: Do not return early before hooks; render conditionally in JSX below

  useEffect(() => {
    if (user && user.branchId) {
      fetchStaffStats();
      fetchStaff(activeTab === 'all' ? 'all' : activeTab.slice(0, -1)); // Remove 's' from plural
    }
  }, [user, activeTab, fetchStaff, fetchStaffStats]);

  const toggleTab = (tab) => {
    if (activeTab !== tab) {
      setActiveTab(tab);
    }
  };

  const handleCreateStaff = () => {
    setEditingStaff(null);
    setModalOpen(true);
  };

  const handleEditStaff = (staffMember) => {
    setEditingStaff(staffMember);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingStaff(null);
    setError(null);
  };

  const handleSaveStaff = async (staffData) => {
    try {
      if (editingStaff) {
        await updateStaff(editingStaff._id, staffData);
        showAlert('success', 'Staff member updated successfully!');
      } else {
        await createStaff(staffData);
        showAlert('success', 'Staff member created successfully!');
      }
      setModalOpen(false);
      setEditingStaff(null);
    } catch (err) {
      showAlert('danger', err.message);
    }
  };

  const handleStatusChange = async (staffId, newStatus) => {
    try {
      await updateStaffStatus(staffId, newStatus);
      showAlert('success', 'Staff status updated successfully!');
    } catch (err) {
      showAlert('danger', err.message);
    }
  };

  const handleDeleteStaff = async (staffId) => {
    if (window.confirm('Are you sure you want to delete this staff member?')) {
      try {
        await deleteStaff(staffId);
        showAlert('success', 'Staff member deleted successfully!');
      } catch (err) {
        showAlert('danger', err.message);
      }
    }
  };

  const showAlert = (color, message) => {
    setAlertMessage({ visible: true, color, message });
    setTimeout(() => {
      setAlertMessage({ visible: false, color: '', message: '' });
    }, 5000);
  };

  const getFilteredStaff = () => {
    switch (activeTab) {
      case 'employees':
        return staff.filter(s => ['POS_Operator', 'Staff'].includes(s.role));
      case 'waiters':
        return staff.filter(s => s.role === 'Waiter');
      case 'chefs':
        return staff.filter(s => s.role === 'Chef');
      default:
        return staff;
    }
  };

  const getTabTitle = (tab) => {
    switch (tab) {
      case 'employees':
        return 'Employees';
      case 'waiters':
        return 'Waiters';
      case 'chefs':
        return 'Chefs';
      default:
        return 'All Staff';
    }
  };

  const getTabIcon = (tab) => {
    switch (tab) {
      case 'employees':
        return 'fas fa-users';
      case 'waiters':
        return 'fas fa-concierge-bell';
      case 'chefs':
        return 'fas fa-utensils';
      default:
        return 'fas fa-user-friends';
    }
  };

  const getCreateButtonText = () => {
    switch (activeTab) {
      case 'employees':
        return 'Add Employee';
      case 'waiters':
        return 'Add Waiter';
      case 'chefs':
        return 'Add Chef';
      default:
        return 'Add Staff';
    }
  };

  const filteredStaff = getFilteredStaff();

  return (
    <>
      <Header />
      <Container className="mt--7" fluid>
        {!isBranchManager ? (
          <Row className="justify-content-center">
            <Col lg="6">
              <Alert color="warning" className="text-center">
                <h4 className="alert-heading">Access Denied</h4>
                <p>Only Branch Managers can access the Staff Management module.</p>
              </Alert>
            </Col>
          </Row>
        ) : (
          <>
            {/* Alert Messages */}
            {alertMessage.visible && (
              <Row>
                <Col>
                  <Alert 
                    color={alertMessage.color} 
                    toggle={() => setAlertMessage({ ...alertMessage, visible: false })}
                  >
                    {alertMessage.message}
                  </Alert>
                </Col>
              </Row>
            )}

            {/* Error Alert */}
            {error && (
              <Row>
                <Col>
                  <Alert color="danger" toggle={() => setError(null)}>
                    {error}
                  </Alert>
                </Col>
              </Row>
            )}

            {/* Staff Statistics */}
            <StaffStats stats={stats} />

            {/* Main Staff Management Card */}
            <Row>
              <Col>
                <Card className="shadow">
                  <CardHeader className="bg-transparent">
                    <Row className="align-items-center">
                      <Col>
                        <h3 className="mb-0">
                          <i className="fas fa-user-friends mr-2"></i>
                          Staff Management
                        </h3>
                        <p className="text-muted mb-0">
                          Manage your branch staff members
                        </p>
                      </Col>
                      <Col className="text-right">
                        <Button
                          color="primary"
                          size="sm"
                          onClick={handleCreateStaff}
                          disabled={loading}
                        >
                          <i className="fas fa-plus mr-1"></i>
                          {getCreateButtonText()}
                        </Button>
                      </Col>
                    </Row>
                  </CardHeader>

                  <CardBody>
                    {/* Navigation Tabs */}
                    <Nav tabs className="nav-fill flex-column flex-md-row">
                      {['employees', 'waiters', 'chefs'].map((tab) => (
                        <NavItem key={tab}>
                          <NavLink
                            className={classnames('mb-sm-3 mb-md-0', {
                              active: activeTab === tab,
                            })}
                            onClick={() => toggleTab(tab)}
                            href="#"
                          >
                            <i className={`${getTabIcon(tab)} mr-2`}></i>
                            {getTabTitle(tab)}
                            <Badge 
                              color="primary" 
                              pill 
                              className="ml-2"
                            >
                              {tab === 'employees' ? stats.employees : 
                               tab === 'waiters' ? stats.waiters : stats.chefs}
                            </Badge>
                          </NavLink>
                        </NavItem>
                      ))}
                    </Nav>

                    {/* Tab Content */}
                    <TabContent activeTab={activeTab} className="mt-4">
                      {['employees', 'waiters', 'chefs'].map((tab) => (
                        <TabPane key={tab} tabId={tab}>
                          {loading ? (
                            <div className="text-center py-5">
                              <Spinner color="primary" />
                              <p className="mt-2">Loading staff...</p>
                            </div>
                          ) : (
                            <StaffTable
                              staff={filteredStaff}
                              staffType={tab}
                              onEdit={handleEditStaff}
                              onStatusChange={handleStatusChange}
                              onDelete={handleDeleteStaff}
                              loading={loading}
                            />
                          )}
                        </TabPane>
                      ))}
                    </TabContent>
                  </CardBody>
                </Card>
              </Col>
            </Row>

            {/* Staff Modal */}
            <StaffModal
              isOpen={modalOpen}
              toggle={handleModalClose}
              staff={editingStaff}
              staffType={activeTab}
              onSave={handleSaveStaff}
              loading={loading}
            />
          </>
        )}
      </Container>
    </>
  );
};

export default StaffManagement;
