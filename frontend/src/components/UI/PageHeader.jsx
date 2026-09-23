import React from 'react';
import { Link } from 'react-router-dom';

const PageHeader = ({ title, subtitle, breadcrumbs = [], actions = null }) => {
  return (
    <div className="mb-4">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-2">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return isLast ? (
                <li key={idx} className="breadcrumb-item active" aria-current="page">
                  {crumb.label}
                </li>
              ) : (
                <li key={idx} className="breadcrumb-item">
                  <Link to={crumb.path || '#'}>{crumb.label}</Link>
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
        <div>
          <h2 className="fw-bold mb-1 text-navy" style={{ fontSize: '1.6rem', letterSpacing: '-0.02em' }}>
            {title}
          </h2>
          {subtitle && <p className="text-muted mb-0 small">{subtitle}</p>}
        </div>

        {actions && <div className="d-flex align-items-center gap-2 flex-wrap">{actions}</div>}
      </div>
    </div>
  );
};

export default PageHeader;
