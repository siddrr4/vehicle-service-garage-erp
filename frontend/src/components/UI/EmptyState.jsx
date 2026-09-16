import React from 'react';
import { Link } from 'react-router-dom';
import { FaInbox } from 'react-icons/fa';

const EmptyState = ({
  icon = <FaInbox size={42} className="text-muted opacity-50" />,
  title = 'No records found',
  message = 'There are currently no items to display.',
  actionLabel = null,
  actionLink = null,
  onAction = null,
}) => {
  return (
    <div className="text-center py-5 px-3 bg-light bg-opacity-50 rounded border border-dashed my-3">
      <div className="mb-3 d-inline-flex p-3 rounded-circle bg-white shadow-sm">
        {icon}
      </div>
      <h5 className="fw-bold text-navy mb-1">{title}</h5>
      <p className="text-muted small mb-3 mx-auto" style={{ maxWidth: '400px' }}>
        {message}
      </p>
      {actionLabel && (
        actionLink ? (
          <Link to={actionLink} className="btn btn-sm btn-orange shadow-sm">
            {actionLabel}
          </Link>
        ) : onAction ? (
          <button onClick={onAction} className="btn btn-sm btn-orange shadow-sm">
            {actionLabel}
          </button>
        ) : null
      )}
    </div>
  );
};

export default EmptyState;
