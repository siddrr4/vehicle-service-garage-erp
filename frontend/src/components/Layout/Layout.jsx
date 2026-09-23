import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { Outlet } from 'react-router-dom';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className={`layout-wrapper ${sidebarOpen ? 'sidebar-toggled' : ''}`}>
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      
      {/* Overlay for mobile when sidebar is open */}
      {sidebarOpen && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 d-lg-none" 
          style={{ zIndex: 1035 }}
          onClick={toggleSidebar}
        ></div>
      )}

      <div className="main-content">
        <Navbar toggleSidebar={toggleSidebar} />
        <main className="flex-grow-1 main-layout-content overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
