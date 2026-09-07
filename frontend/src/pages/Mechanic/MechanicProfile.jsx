import React, { useState, useEffect, useContext } from 'react';
import { Card, Row, Col, Badge } from 'react-bootstrap';
import { FaUserCircle, FaEnvelope, FaPhone, FaBriefcase, FaWrench, FaCheckCircle, FaUserTag } from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';
import employeeService from '../../services/employeeService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const MechanicProfile = () => {
  const { user } = useContext(AuthContext);
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        // Find employee record for logged-in user
        const data = await employeeService.getEmployees(1, 100);
        const matched = data.employees?.find(
          (emp) => emp.email?.toLowerCase() === user?.email?.toLowerCase() || emp.userRef?._id === user?._id
        );
        setEmployee(matched || null);
        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="container-fluid p-0">
      <div className="mb-4">
        <h2 className="fw-bold m-0 text-navy d-flex align-items-center gap-2">
          <FaUserCircle /> Mechanic Profile
        </h2>
        <p className="text-muted mb-0">Personal employee details and account status</p>
      </div>

      <Row className="g-4">
        <Col xs={12} lg={4}>
          <Card className="border-0 shadow-sm bg-card text-center p-4">
            <Card.Body>
              <div className="mb-3">
                <FaUserCircle size={80} className="text-primary opacity-75" />
              </div>
              <h4 className="fw-bold text-dark mb-1">{employee?.fullName || `${user?.firstName} ${user?.lastName}`}</h4>
              <p className="text-muted small mb-2">{employee?.email || user?.email}</p>
              <Badge bg="primary" className="px-3 py-2 rounded-pill mb-3">
                {employee?.role || 'Mechanic'}
              </Badge>

              <div className="pt-3 border-top d-flex justify-content-around">
                <div>
                  <small className="text-muted d-block">Status</small>
                  <Badge bg={employee?.status === 'Active' ? 'success' : 'secondary'} className="px-2 py-1">
                    {employee?.status || 'Active'}
                  </Badge>
                </div>
                <div>
                  <small className="text-muted d-block">Availability</small>
                  <Badge bg="info" text="dark" className="px-2 py-1">
                    {employee?.availability || 'Available'}
                  </Badge>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} lg={8}>
          <Card className="border-0 shadow-sm bg-card p-4">
            <Card.Body>
              <h5 className="fw-bold text-dark mb-4 pb-2 border-bottom">Employment Information</h5>

              <Row className="g-4">
                <Col xs={12} sm={6}>
                  <div className="d-flex align-items-center gap-3">
                    <div className="p-3 bg-light text-primary rounded">
                      <FaUserTag size={20} />
                    </div>
                    <div>
                      <small className="text-muted d-block">Employee ID</small>
                      <span className="fw-bold text-dark fs-6">{employee?.employeeId || 'EMP-001'}</span>
                    </div>
                  </div>
                </Col>

                <Col xs={12} sm={6}>
                  <div className="d-flex align-items-center gap-3">
                    <div className="p-3 bg-light text-primary rounded">
                      <FaWrench size={20} />
                    </div>
                    <div>
                      <small className="text-muted d-block">Specialization</small>
                      <span className="fw-bold text-dark fs-6">{employee?.specialization || 'General Repairs'}</span>
                    </div>
                  </div>
                </Col>

                <Col xs={12} sm={6}>
                  <div className="d-flex align-items-center gap-3">
                    <div className="p-3 bg-light text-primary rounded">
                      <FaBriefcase size={20} />
                    </div>
                    <div>
                      <small className="text-muted d-block">Experience</small>
                      <span className="fw-bold text-dark fs-6">{employee?.experience ? `${employee.experience} Years` : 'N/A'}</span>
                    </div>
                  </div>
                </Col>

                <Col xs={12} sm={6}>
                  <div className="d-flex align-items-center gap-3">
                    <div className="p-3 bg-light text-primary rounded">
                      <FaPhone size={20} />
                    </div>
                    <div>
                      <small className="text-muted d-block">Mobile Number</small>
                      <span className="fw-bold text-dark fs-6">{employee?.phone || user?.phone || 'N/A'}</span>
                    </div>
                  </div>
                </Col>

                <Col xs={12} sm={6}>
                  <div className="d-flex align-items-center gap-3">
                    <div className="p-3 bg-light text-primary rounded">
                      <FaEnvelope size={20} />
                    </div>
                    <div>
                      <small className="text-muted d-block">Official Email</small>
                      <span className="fw-bold text-dark fs-6">{employee?.email || user?.email}</span>
                    </div>
                  </div>
                </Col>

                <Col xs={12} sm={6}>
                  <div className="d-flex align-items-center gap-3">
                    <div className="p-3 bg-light text-primary rounded">
                      <FaCheckCircle size={20} />
                    </div>
                    <div>
                      <small className="text-muted d-block">Joining Date</small>
                      <span className="fw-bold text-dark fs-6">
                        {employee?.joiningDate ? new Date(employee.joiningDate).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default MechanicProfile;
