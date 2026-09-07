import React, { useContext } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { 
  FaHome, FaUsers, FaCar, FaCalendarAlt, FaWrench, 
  FaUserTie, FaBoxOpen, FaFileInvoiceDollar, FaChartBar, 
  FaCog, FaSignOutAlt, FaTimes, FaPlus, FaUserClock, FaCheckCircle, FaUserCircle,
  FaClipboardList
} from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user, logout } = useContext(AuthContext);

  const isAdmin = user?.role === 'admin' || user?.role === 'advisor';
  const isMechanic = user?.role === 'mechanic';

  const adminNavItems = [
    { name: 'Dashboard', path: '/admin-dashboard', icon: <FaHome /> },
    { name: 'Employees', path: '/employees', icon: <FaUserTie /> },
    { name: 'Attendance', path: '/admin-attendance', icon: <FaUserClock /> },
    { name: 'Customers', path: '/customers', icon: <FaUsers /> },
    { name: 'Vehicles', path: '/vehicles', icon: <FaCar /> },
    { name: 'Appointments', path: '/appointments', icon: <FaCalendarAlt /> },
    { name: 'Service Requests', path: '/service-requests', icon: <FaCalendarAlt /> },
    { name: 'Job Cards', path: '/job-cards', icon: <FaWrench /> },
    { name: 'Inventory', path: '/inventory', icon: <FaBoxOpen /> },
    { name: 'Parts Requests', path: '/parts-requests', icon: <FaClipboardList /> },
    { name: 'Billing', path: '/billing', icon: <FaFileInvoiceDollar /> },
    { name: 'Reports', path: '/reports', icon: <FaChartBar /> },
    { name: 'Settings', path: '/settings', icon: <FaCog /> },
  ];

  const mechanicNavItems = [
    { name: 'Dashboard', path: '/mechanic-dashboard', icon: <FaHome /> },
    { name: 'Attendance', path: '/mechanic-attendance', icon: <FaUserClock /> },
    { name: 'Assigned Jobs', path: '/mechanic-jobs', icon: <FaWrench /> },
    { name: 'Completed Jobs', path: '/mechanic-completed-jobs', icon: <FaCheckCircle /> },
    { name: 'Profile', path: '/mechanic-profile', icon: <FaUserCircle /> },
  ];

  const customerNavItems = [
    { name: 'Dashboard', path: '/customer-dashboard', icon: <FaHome /> },
    { name: 'My Vehicles', path: '/my-vehicles', icon: <FaCar /> },
    { name: 'My Requests', path: '/my-requests', icon: <FaCalendarAlt /> },
    { name: 'My Job Cards', path: '/my-job-cards', icon: <FaWrench /> },
    { name: 'Request Service', path: '/request-service', icon: <FaPlus /> },
  ];

  let navItems = customerNavItems;
  let dashboardPath = '/customer-dashboard';

  if (isAdmin) {
    navItems = adminNavItems;
    dashboardPath = '/admin-dashboard';
  } else if (isMechanic) {
    navItems = mechanicNavItems;
    dashboardPath = '/mechanic-dashboard';
  }

  return (
    <div className={`sidebar ${isOpen ? 'show' : ''}`}>
      <div className="sidebar-brand justify-content-between">
        <Link to={dashboardPath} className="text-white text-decoration-none d-flex align-items-center gap-2">
          <FaCar className="text-orange" size={24} />
          <span>Garage ERP</span>
        </Link>
        <button className="btn btn-link text-white p-0 d-lg-none" onClick={toggleSidebar}>
          <FaTimes size={20} />
        </button>
      </div>
      
      <div className="sidebar-menu">
        <ul className="nav flex-column mb-auto">
          {navItems.map((item, index) => (
            <li className="nav-item" key={index}>
              <NavLink 
                to={item.path} 
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={() => { if(window.innerWidth < 992) toggleSidebar(); }}
              >
                {item.icon}
                <span>{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
      
      <div className="p-3 border-top border-secondary border-opacity-25">
        <button onClick={logout} className="btn btn-link nav-link w-100 text-start text-danger d-flex align-items-center gap-2">
          <FaSignOutAlt /> <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
