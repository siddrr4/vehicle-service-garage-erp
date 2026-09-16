import React, { useContext } from 'react';
import { Dropdown } from 'react-bootstrap';
import { FaBars, FaCog, FaSignOutAlt, FaUserTie, FaUser, FaWrench } from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';
import { Link, useLocation } from 'react-router-dom';
import NotificationBell from '../Notifications/NotificationBell';

const Navbar = ({ toggleSidebar }) => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();

  const getPageTitle = (pathname) => {
    if (pathname.includes('/admin-dashboard')) return 'Admin & Service Advisor Console';
    if (pathname.includes('/customer-dashboard')) return 'Customer Service Portal';
    if (pathname.includes('/mechanic-dashboard')) return 'Workshop Mechanic Workbench';
    if (pathname.includes('/appointments/book')) return 'Book Appointment';
    if (pathname.includes('/appointments')) return 'Appointment Management';
    if (pathname.includes('/waiting-queue')) return 'Workshop Waiting Queue';
    if (pathname.includes('/job-cards/add')) return 'Create Workshop Job Card';
    if (pathname.includes('/job-cards')) return 'Job Card Management';
    if (pathname.includes('/customers')) return 'Customer Management';
    if (pathname.includes('/vehicles')) return 'Vehicle Fleet Management';
    if (pathname.includes('/employees')) return 'Employee Management';
    if (pathname.includes('/admin-attendance')) return 'Daily Workshop Attendance';
    if (pathname.includes('/salary')) return 'Employee Salary Management';
    if (pathname.includes('/payroll')) return 'Monthly Payroll & Payslips';
    if (pathname.includes('/inventory')) return 'Spare Parts & Inventory';
    if (pathname.includes('/parts-requests')) return 'Mechanic Spare Parts Requests';
    if (pathname.includes('/billing')) return 'Billing & Tax Invoices';
    if (pathname.includes('/reports')) return 'Analytics & Operational Reports';
    if (pathname.includes('/settings')) return 'System & Garage Settings';
    if (pathname.includes('/notifications')) return 'Notifications Center';
    if (pathname.includes('/my-vehicles')) return 'My Registered Vehicles';
    if (pathname.includes('/request-service')) return 'Book New Vehicle Service';
    if (pathname.includes('/my-requests')) return 'My Service Requests';
    if (pathname.includes('/my-job-cards')) return 'My Active Job Cards';
    if (pathname.includes('/service-history')) return 'Vehicle Service History';
    return 'Garage ERP Management';
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return { label: 'Administrator', bg: 'bg-navy', icon: <FaUserTie size={11} className="me-1" /> };
      case 'advisor':
        return { label: 'Service Advisor', bg: 'bg-orange', icon: <FaUserTie size={11} className="me-1" /> };
      case 'mechanic':
        return { label: 'Technician', bg: 'bg-primary', icon: <FaWrench size={11} className="me-1" /> };
      case 'customer':
        return { label: 'Vehicle Owner', bg: 'bg-secondary', icon: <FaUser size={11} className="me-1" /> };
      default:
        return { label: 'Staff', bg: 'bg-dark', icon: null };
    }
  };

  const roleInfo = getRoleBadge(user?.role);
  const initials = user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() : 'ERP';

  return (
    <nav className="top-navbar">
      <div className="d-flex align-items-center gap-3">
        <button 
          type="button"
          className="btn btn-light border p-2 d-flex align-items-center justify-content-center text-dark" 
          onClick={toggleSidebar}
          aria-label="Toggle Navigation Sidebar"
          style={{ width: '38px', height: '38px', borderRadius: '8px' }}
        >
          <FaBars size={18} />
        </button>

        <div>
          <h1 className="h6 mb-0 fw-bold text-navy d-none d-sm-block">
            {getPageTitle(location.pathname)}
          </h1>
          <small className="text-muted d-none d-md-block" style={{ fontSize: '0.75rem' }}>
            Automotive Workshop & Garage ERP Console
          </small>
        </div>
      </div>
      
      <div className="d-flex align-items-center gap-3">
        {/* Real Backend Notification Bell */}
        <NotificationBell />
        
        <div className="vr d-none d-sm-block my-2 text-muted opacity-25" style={{ height: '24px' }}></div>

        {/* User Profile Dropdown */}
        <Dropdown align="end">
          <Dropdown.Toggle as="div" className="d-flex align-items-center gap-2" style={{ cursor: 'pointer', userSelect: 'none' }}>
            <div className="text-end d-none d-sm-block">
              <p className="mb-0 fw-bold text-navy" style={{ fontSize: '0.875rem', lineHeight: '1.2' }}>
                {user ? `${user.firstName} ${user.lastName}` : 'Garage Admin'}
              </p>
              <div className="d-flex justify-content-end mt-0.5">
                <span className={`badge ${roleInfo.bg} text-white px-2 py-0.5`} style={{ fontSize: '0.65rem' }}>
                  {roleInfo.icon}
                  {roleInfo.label}
                </span>
              </div>
            </div>

            <div 
              className="d-flex align-items-center justify-content-center fw-bold text-white rounded-circle shadow-sm"
              style={{
                width: '38px',
                height: '38px',
                backgroundColor: 'var(--navy-primary)',
                border: '2px solid #FFFFFF',
                fontSize: '0.85rem',
                letterSpacing: '0.05em'
              }}
            >
              {initials}
            </div>
          </Dropdown.Toggle>

          <Dropdown.Menu className="shadow border mt-2 py-2" style={{ minWidth: '200px' }}>
            <div className="px-3 py-2 border-bottom mb-1 d-sm-none">
              <div className="fw-bold text-navy">{user ? `${user.firstName} ${user.lastName}` : 'User'}</div>
              <small className="text-muted">{user?.email}</small>
            </div>
            
            <Dropdown.Item as={Link} to="/settings" className="d-flex align-items-center gap-2 py-2">
              <FaCog className="text-muted" /> Settings & Preferences
            </Dropdown.Item>
            
            <Dropdown.Divider className="my-1" />
            
            <Dropdown.Item onClick={logout} className="d-flex align-items-center gap-2 py-2 text-danger">
              <FaSignOutAlt /> Sign Out
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>
    </nav>
  );
};

export default Navbar;
