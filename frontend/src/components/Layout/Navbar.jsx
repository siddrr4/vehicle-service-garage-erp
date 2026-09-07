import React, { useContext } from 'react';
import { Dropdown } from 'react-bootstrap';
import { FaUserCircle, FaBell, FaBars, FaCog, FaSignOutAlt } from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

const Navbar = ({ toggleSidebar }) => {
  const { user, logout } = useContext(AuthContext);

  const getRoleDisplay = (role) => {
    if (!role) return 'User';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  return (
    <nav className="top-navbar">
      <div className="d-flex align-items-center gap-3">
        <button 
          className="btn btn-link text-dark p-0" 
          onClick={toggleSidebar}
        >
          <FaBars size={24} />
        </button>
        {/* Placeholder for Breadcrumb if needed */}
        <div className="d-none d-md-block text-muted fw-medium">
          Dashboard Overview
        </div>
      </div>
      
      <div className="d-flex align-items-center gap-4">
        {/* Notifications */}
        <Dropdown align="end">
          <Dropdown.Toggle as="button" className="btn btn-link text-muted p-0 position-relative border-0" id="dropdown-notifications">
            <FaBell size={20} />
            <span className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle">
              <span className="visually-hidden">New alerts</span>
            </span>
          </Dropdown.Toggle>

          <Dropdown.Menu className="shadow border-0 rounded-3 mt-2" style={{ minWidth: '300px' }}>
            <Dropdown.Header className="fw-bold text-dark border-bottom pb-2 mb-2">Notifications</Dropdown.Header>
            <Dropdown.Item href="#" className="py-2">
              <div className="d-flex gap-3">
                <div className="bg-primary bg-opacity-10 text-primary p-2 rounded-circle">
                  <FaBell />
                </div>
                <div>
                  <p className="mb-0 fw-medium text-dark small">New appointment request</p>
                  <small className="text-muted">2 mins ago</small>
                </div>
              </div>
            </Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item href="#" className="text-center text-primary fw-medium small">View All Notifications</Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
        
        {/* User Profile */}
        <Dropdown align="end">
          <Dropdown.Toggle as="div" className="d-flex align-items-center gap-2 cursor-pointer" style={{ cursor: 'pointer' }}>
            <div className="text-end d-none d-md-block">
              <p className="mb-0 fw-bold lh-1 text-navy">
                {user ? `${user.firstName} ${user.lastName}` : 'Admin User'}
              </p>
              <small className="text-muted">
                {user ? getRoleDisplay(user.role) : 'Administrator'}
              </small>
            </div>
            <FaUserCircle size={36} className="text-secondary" />
          </Dropdown.Toggle>

          <Dropdown.Menu className="shadow border-0 rounded-3 mt-2">
            <Dropdown.Item as={Link} to="/settings" className="d-flex align-items-center gap-2 py-2">
              <FaCog className="text-muted" /> Settings
            </Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item onClick={logout} className="d-flex align-items-center gap-2 py-2 text-danger">
              <FaSignOutAlt /> Logout
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>
    </nav>
  );
};

export default Navbar;
