import React from 'react';
import { UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem, Badge } from 'reactstrap';
import { useNotifications } from '../../context/NotificationsContext';

export default function NotificationBell() {
  const { notifications, unreadCount, markAllRead, clearAll } = useNotifications();
  const recent = notifications.slice(0, 8);

  const severityClass = (sev) => {
    if (sev === 'critical' || sev === 'out') return 'text-danger';
    if (sev === 'low') return 'text-warning';
    return 'text-info';
  };

  return (
    <div className="nav align-items-center d-flex">
      <UncontrolledDropdown nav inNavbar className="ml-2">
        <DropdownToggle nav className="position-relative nav-link pr-0 text-white" caret={false}>
          <i className="fas fa-bell" />
          {unreadCount > 0 && (
            <Badge color="danger" pill className="position-absolute" style={{ top: -6, right: -8 }}>
              {unreadCount}
            </Badge>
          )}
        </DropdownToggle>
        <DropdownMenu right className="dropdown-menu-arrow" style={{ minWidth: 320 }}>
          <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
            <strong className="mb-0">Notifications</strong>
            <div className="d-flex align-items-center">
              <button className="btn btn-link btn-sm mb-0" onClick={markAllRead}>Mark all read</button>
              <button className="btn btn-link btn-sm text-danger mb-0" onClick={clearAll}>Clear</button>
            </div>
          </div>
          {recent.length === 0 && <div className="px-3 py-3 text-muted small">No notifications</div>}
          {recent.map((n) => (
            <DropdownItem key={n.id} className="py-2">
              <div className="d-flex align-items-start">
                <div className={`mr-2 ${severityClass(n.severity)}`}>
                  <i className="fas fa-exclamation-circle" />
                </div>
                <div className="flex-fill">
                  <div className="small font-weight-bold">
                    {n.title || (n.type || 'Inventory')}
                  </div>
                  <div className="small text-muted">
                    {(n.message || `${n.itemName || 'Item'}: ${n.type}`)} • {new Date(n.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            </DropdownItem>
          ))}
        </DropdownMenu>
      </UncontrolledDropdown>
    </div>
  );
}
