import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { FaShieldAlt, FaArrowLeft, FaWalking, FaHome } from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext';

const AccessDenied = () => {
  const { user } = useContext(AuthContext);

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin-dashboard';
    if (user.role === 'advisor') return '/advisor-dashboard';
    if (user.role === 'mechanic') return '/mechanic-dashboard';
    return '/customer-dashboard';
  };

  const getDashboardLabel = () => {
    if (user?.role === 'advisor') return 'Return to Advisor Console (Walk-ins & Queue)';
    if (user?.role === 'admin') return 'Return to Admin Dashboard';
    if (user?.role === 'mechanic') return 'Return to Mechanic Workbench';
    return 'Return to Customer Dashboard';
  };

  return (
    <div 
      className="d-flex align-items-center justify-content-center py-5" 
      style={{ minHeight: '70vh' }}
    >
      <div 
        className="card border-0 shadow-lg text-center p-4 p-md-5"
        style={{
          maxWidth: '560px',
          width: '100%',
          backgroundColor: '#121714',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '16px'
        }}
      >
        <div 
          className="mx-auto mb-4 d-flex align-items-center justify-content-center rounded-circle"
          style={{
            width: '80px',
            height: '80px',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            color: '#F87171',
            border: '2px solid rgba(239, 68, 68, 0.3)'
          }}
        >
          <FaShieldAlt size={38} />
        </div>

        <h3 className="fw-bold text-white mb-2" style={{ letterSpacing: '-0.02em' }}>
          Access Denied &bull; 403 Forbidden
        </h3>

        {user?.role === 'advisor' ? (
          <div className="mb-4">
            <p className="text-light mb-2 fw-medium">
              Service Advisors handle <span className="text-gold fw-bold">Walk-In Services Only</span>.
            </p>
            <p className="text-muted-gray small mb-0">
              You do not have authorization to view, create, or manage appointments. Please use the Advisor Console to handle walk-in reception, waiting queue, bay allocation, and mechanic assignments.
            </p>
          </div>
        ) : (
          <p className="text-muted-gray mb-4">
            You do not have the required permissions to view or access this administrative resource.
          </p>
        )}

        <div className="d-flex justify-content-center gap-2 flex-wrap">
          <Link 
            to={getDashboardPath()}
            className="btn btn-warning text-dark fw-bold px-4 py-2 d-inline-flex align-items-center gap-2"
          >
            {user?.role === 'advisor' ? <FaWalking /> : <FaHome />}
            <span>{getDashboardLabel()}</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;
