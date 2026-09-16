import React, { useContext } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { 
  FaHome, FaUsers, FaCar, FaCalendarAlt, FaWrench, 
  FaUserTie, FaBoxOpen, FaFileInvoiceDollar, FaChartBar, 
  FaCog, FaSignOutAlt, FaTimes, FaPlus, FaUserClock, FaCheckCircle, FaUserCircle,
  FaClipboardList, FaMoneyBillWave, FaReceipt, FaWalking, FaBell, FaHistory
} from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user, logout } = useContext(AuthContext);

  const isAdmin = user?.role === 'admin' || user?.role === 'advisor';
  const isMechanic = user?.role === 'mechanic';

  // Admin & Advisor navigation grouped into standard enterprise sections
  const adminSections = [
    {
      category: 'DASHBOARD',
      items: [
        { name: 'Dashboard', path: '/admin-dashboard', icon: <FaHome /> }
      ]
    },
    {
      category: 'WORKSHOP',
      items: [
        { name: 'Appointments', path: '/appointments', icon: <FaCalendarAlt /> },
        { name: 'Walk-in Service', path: '/walk-in', icon: <FaWalking /> },
        { name: 'Waiting Queue', path: '/waiting-queue', icon: <FaUserClock /> },
        { name: 'Job Cards', path: '/job-cards', icon: <FaWrench /> }
      ]
    },
    {
      category: 'CUSTOMERS',
      items: [
        { name: 'Customers', path: '/customers', icon: <FaUsers /> },
        { name: 'Vehicles', path: '/vehicles', icon: <FaCar /> }
      ]
    },
    {
      category: 'EMPLOYEES',
      items: [
        { name: 'Employees', path: '/employees', icon: <FaUserTie /> },
        { name: 'Attendance', path: '/admin-attendance', icon: <FaUserClock /> },
        { name: 'Salary', path: '/salary', icon: <FaMoneyBillWave /> },
        { name: 'Payroll', path: '/payroll', icon: <FaReceipt /> }
      ]
    },
    {
      category: 'INVENTORY',
      items: [
        { name: 'Spare Parts', path: '/inventory', icon: <FaBoxOpen /> },
        { name: 'Parts Requests', path: '/parts-requests', icon: <FaClipboardList /> }
      ]
    },
    {
      category: 'FINANCE',
      items: [
        { name: 'Billing', path: '/billing', icon: <FaFileInvoiceDollar /> }
      ]
    },
    {
      category: 'ANALYTICS',
      items: [
        { name: 'Reports', path: '/reports', icon: <FaChartBar /> }
      ]
    },
    {
      category: 'SYSTEM',
      items: [
        { name: 'Notifications', path: '/notifications', icon: <FaBell /> },
        { name: 'Settings', path: '/settings', icon: <FaCog /> }
      ]
    }
  ];

  // Mechanic navigation
  const mechanicSections = [
    {
      category: 'DASHBOARD',
      items: [
        { name: 'Dashboard', path: '/mechanic-dashboard', icon: <FaHome /> }
      ]
    },
    {
      category: 'WORKSHOP',
      items: [
        { name: 'Assigned Jobs', path: '/mechanic-jobs', icon: <FaWrench /> },
        { name: 'Completed Jobs', path: '/mechanic-completed-jobs', icon: <FaCheckCircle /> }
      ]
    },
    {
      category: 'ATTENDANCE & PAYROLL',
      items: [
        { name: 'Attendance', path: '/mechanic-attendance', icon: <FaUserClock /> },
        { name: 'My Payslips', path: '/my-payslips', icon: <FaReceipt /> }
      ]
    },
    {
      category: 'SYSTEM',
      items: [
        { name: 'Profile', path: '/mechanic-profile', icon: <FaUserCircle /> },
        { name: 'Notifications', path: '/notifications', icon: <FaBell /> }
      ]
    }
  ];

  // Customer navigation
  const customerSections = [
    {
      category: 'DASHBOARD',
      items: [
        { name: 'Dashboard', path: '/customer-dashboard', icon: <FaHome /> }
      ]
    },
    {
      category: 'MY VEHICLES & REPAIRS',
      items: [
        { name: 'My Vehicles', path: '/my-vehicles', icon: <FaCar /> },
        { name: 'Request Service', path: '/request-service', icon: <FaPlus /> },
        { name: 'My Requests', path: '/my-requests', icon: <FaCalendarAlt /> },
        { name: 'My Job Cards', path: '/my-job-cards', icon: <FaWrench /> },
        { name: 'Service History', path: '/service-history', icon: <FaHistory /> }
      ]
    },
    {
      category: 'SYSTEM',
      items: [
        { name: 'Notifications', path: '/notifications', icon: <FaBell /> }
      ]
    }
  ];

  let sections = customerSections;
  let dashboardPath = '/customer-dashboard';

  if (isAdmin) {
    sections = adminSections;
    dashboardPath = '/admin-dashboard';
  } else if (isMechanic) {
    sections = mechanicSections;
    dashboardPath = '/mechanic-dashboard';
  }

  return (
    <aside className={`sidebar ${isOpen ? 'show' : ''}`}>
      {/* Sidebar Header */}
      <div className="sidebar-brand justify-content-between">
        <Link to={dashboardPath} className="text-white text-decoration-none d-flex align-items-center gap-2 overflow-hidden">
          <div className="bg-orange p-2 rounded-2 text-white d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '36px', height: '36px' }}>
            <FaCar size={18} />
          </div>
          <div className="d-flex flex-column text-start">
            <span className="fw-bold fs-6 lh-1" style={{ letterSpacing: '0.02em' }}>GARAGE ERP</span>
            <span className="text-muted" style={{ fontSize: '0.675rem', letterSpacing: '0.01em' }}>Vehicle Service Management</span>
          </div>
        </Link>
        <button 
          type="button" 
          className="btn btn-link text-white p-0 d-lg-none" 
          onClick={toggleSidebar}
          aria-label="Close Sidebar"
        >
          <FaTimes size={18} />
        </button>
      </div>
      
      {/* Navigation Menu */}
      <div className="sidebar-menu">
        {sections.map((section, sIdx) => (
          <div key={sIdx} className="mb-2">
            <div className="sidebar-category">{section.category}</div>
            <ul className="nav flex-column mb-0">
              {section.items.map((item, iIdx) => (
                <li className="nav-item" key={iIdx}>
                  <NavLink 
                    to={item.path} 
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => { if (window.innerWidth < 992) toggleSidebar(); }}
                  >
                    <span className="d-inline-flex" style={{ width: '18px', justifyContent: 'center' }}>
                      {item.icon}
                    </span>
                    <span>{item.name}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      
      {/* Sidebar Footer with Logout */}
      <div className="sidebar-footer">
        <button 
          onClick={logout} 
          className="btn btn-link nav-link w-100 text-start text-danger d-flex align-items-center gap-2 px-2 py-2 m-0"
        >
          <FaSignOutAlt /> <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
