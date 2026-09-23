import React from 'react';
import { Card } from 'react-bootstrap';

const StatCard = ({
  title,
  value,
  icon,
  color = 'primary',
  trend = null,
  trendColor = 'text-success',
  subtext = null,
  onClick = null,
}) => {
  return (
    <Card 
      className={`h-100 bg-card dashboard-card border-0 shadow-sm ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <Card.Body className="p-3 p-md-4 d-flex flex-column justify-content-between">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div>
            <h6 className="text-muted small fw-semibold text-uppercase mb-1" style={{ letterSpacing: '0.04em' }}>
              {title}
            </h6>
            <h3 className="fw-bold mb-0 text-navy" style={{ fontSize: '1.65rem' }}>
              {value}
            </h3>
          </div>
          <div className={`stat-icon-wrapper stat-icon-${color}`}>
            {React.isValidElement(icon) ? icon : (typeof icon === 'function' ? React.createElement(icon) : icon)}
          </div>
        </div>

        {(trend || subtext) && (
          <div className="mt-3 pt-2 border-top border-light d-flex align-items-center justify-content-between">
            {trend && (
              <small className={`fw-medium ${trendColor} d-flex align-items-center gap-1`}>
                {trend}
              </small>
            )}
            {subtext && <small className="text-muted ms-auto">{subtext}</small>}
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default StatCard;
