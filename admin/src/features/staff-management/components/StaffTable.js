import React from 'react';
import {
  Table,
  Badge,
  UncontrolledDropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
  Button,
  Card,
  CardBody
} from 'reactstrap';

const StaffTable = ({ staff, staffType, onEdit, onStatusChange, onDelete, loading }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'secondary';
      case 'suspended':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'POS_Operator':
        return 'primary';
      case 'Staff':
        return 'info';
      case 'Waiter':
        return 'warning';
      case 'Chef':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  const formatRole = (role) => {
    switch (role) {
      case 'POS_Operator':
        return 'POS Operator';
      default:
        return role;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!staff || staff.length === 0) {
    return (
      <Card>
        <CardBody className="text-center py-5">
          <i className="fas fa-users fa-3x text-muted mb-3"></i>
          <h4 className="text-muted">No {staffType} found</h4>
          <p className="text-muted">
            {staffType === 'employees' 
              ? 'No employees have been added to this branch yet.'
              : staffType === 'waiters'
              ? 'No waiters have been added to this branch yet.'
              : 'No chefs have been added to this branch yet.'
            }
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="table-responsive">
      <Table className="align-items-center table-flush" responsive>
        <thead className="thead-light">
          <tr>
            <th scope="col">Staff Member</th>
            <th scope="col">Role</th>
            <th scope="col">Contact</th>
            <th scope="col">Status</th>
            <th scope="col">Joined</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {staff.map((staffMember) => (
            <tr key={staffMember._id}>
              <td>
                <div className="d-flex align-items-center">
                  <div className="avatar avatar-sm rounded-circle mr-3">
                    <div className="avatar-placeholder bg-gradient-primary text-white d-flex align-items-center justify-content-center">
                      {staffMember.name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div>
                    <span className="mb-0 text-sm font-weight-bold">
                      {staffMember.name}
                    </span>
                    <br />
                    <small className="text-muted">{staffMember.email}</small>
                  </div>
                </div>
              </td>
              <td>
                <Badge color={getRoleBadgeColor(staffMember.role)} pill>
                  {formatRole(staffMember.role)}
                </Badge>
              </td>
              <td>
                <span className="text-sm">
                  {staffMember.phoneNumber || 'Not provided'}
                </span>
              </td>
              <td>
                <Badge color={getStatusColor(staffMember.status)} pill>
                  {staffMember.status}
                </Badge>
              </td>
              <td>
                <span className="text-sm">
                  {formatDate(staffMember.createdAt)}
                </span>
              </td>
              <td>
                <UncontrolledDropdown>
                  <DropdownToggle
                    className="btn-icon-only text-light"
                    href="#pablo"
                    role="button"
                    size="sm"
                    color=""
                    onClick={(e) => e.preventDefault()}
                  >
                    <i className="fas fa-ellipsis-v" />
                  </DropdownToggle>
                  <DropdownMenu className="dropdown-menu-arrow" right>
                    <DropdownItem
                      href="#pablo"
                      onClick={(e) => {
                        e.preventDefault();
                        onEdit(staffMember);
                      }}
                    >
                      <i className="fas fa-edit mr-2"></i>
                      Edit
                    </DropdownItem>
                    
                    <DropdownItem divider />
                    
                    {staffMember.status === 'active' ? (
                      <>
                        <DropdownItem
                          href="#pablo"
                          onClick={(e) => {
                            e.preventDefault();
                            onStatusChange(staffMember._id, 'inactive');
                          }}
                        >
                          <i className="fas fa-pause mr-2"></i>
                          Deactivate
                        </DropdownItem>
                        <DropdownItem
                          href="#pablo"
                          onClick={(e) => {
                            e.preventDefault();
                            onStatusChange(staffMember._id, 'suspended');
                          }}
                        >
                          <i className="fas fa-ban mr-2"></i>
                          Suspend
                        </DropdownItem>
                      </>
                    ) : (
                      <DropdownItem
                        href="#pablo"
                        onClick={(e) => {
                          e.preventDefault();
                          onStatusChange(staffMember._id, 'active');
                        }}
                      >
                        <i className="fas fa-play mr-2"></i>
                        Activate
                      </DropdownItem>
                    )}
                    
                    <DropdownItem divider />
                    
                    <DropdownItem
                      href="#pablo"
                      onClick={(e) => {
                        e.preventDefault();
                        onDelete(staffMember._id);
                      }}
                      className="text-danger"
                    >
                      <i className="fas fa-trash mr-2"></i>
                      Delete
                    </DropdownItem>
                  </DropdownMenu>
                </UncontrolledDropdown>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default StaffTable;
