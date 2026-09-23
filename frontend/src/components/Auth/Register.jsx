import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Container, Row, Col, Form, Button, Alert, Card, InputGroup } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash, FaEnvelope, FaLock, FaUser, FaPhone, FaCar } from 'react-icons/fa';
import api from '../../services/api';

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
  });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(formData.phone)) {
      setError('Phone number must be exactly 10 digits');
      setIsLoading(false);
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      setError('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character');
      setIsLoading(false);
      return;
    }

    try {
      const { data } = await api.post('/auth/register', formData);
      // After successful registration, log the user in automatically
      const result = await login(formData.email, formData.password);
      if (!result.success) {
        setError(result.message);
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || err.response?.data?.message || 'Registration failed';
      setError(errMsg);
    }
    
    setIsLoading(false);
  };

  return (
    <div className="login-container">
      <Container className="position-relative z-1 py-4">
        <Row className="justify-content-center">
          <Col md={8} lg={6}>
            <Card className="bg-card text-dark border-0 shadow-lg" style={{ borderRadius: '24px' }}>
              <Card.Body className="p-4 p-sm-5">
                <div className="text-center mb-4">
                  <div className="d-inline-flex align-items-center justify-content-center p-3 rounded-circle bg-orange bg-opacity-10 text-orange mb-3" style={{ width: '64px', height: '64px' }}>
                    <FaCar size={32} />
                  </div>
                  <h2 className="fw-bold mb-1 text-navy" style={{ letterSpacing: '-0.02em' }}>Garage ERP</h2>
                  <p className="text-muted small">Create your customer account console</p>
                </div>

                {error && <Alert variant="danger" className="py-2.5 rounded-3">{error}</Alert>}

                <Form onSubmit={handleSubmit}>
                  <Row>
                    <Col sm={6}>
                      <Form.Group className="mb-3" controlId="formFirstName">
                        <Form.Label className="form-label">First Name <span className="text-danger">*</span></Form.Label>
                        <InputGroup>
                          <InputGroup.Text className="bg-light border-end-0 text-muted" style={{ borderTopLeftRadius: '10px', borderBottomLeftRadius: '10px' }}>
                            <FaUser />
                          </InputGroup.Text>
                          <Form.Control 
                            type="text" 
                            name="firstName"
                            placeholder="John" 
                            value={formData.firstName}
                            onChange={handleChange}
                            className="border-start-0 ps-0"
                            style={{ borderTopRightRadius: '10px', borderBottomRightRadius: '10px' }}
                            required
                          />
                        </InputGroup>
                      </Form.Group>
                    </Col>
                    <Col sm={6}>
                      <Form.Group className="mb-3" controlId="formLastName">
                        <Form.Label className="form-label">Last Name <span className="text-danger">*</span></Form.Label>
                        <InputGroup>
                          <InputGroup.Text className="bg-light border-end-0 text-muted" style={{ borderTopLeftRadius: '10px', borderBottomLeftRadius: '10px' }}>
                            <FaUser />
                          </InputGroup.Text>
                          <Form.Control 
                            type="text" 
                            name="lastName"
                            placeholder="Doe" 
                            value={formData.lastName}
                            onChange={handleChange}
                            className="border-start-0 ps-0"
                            style={{ borderTopRightRadius: '10px', borderBottomRightRadius: '10px' }}
                            required
                          />
                        </InputGroup>
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3" controlId="formPhone">
                    <Form.Label className="form-label">Phone Number <span className="text-danger">*</span></Form.Label>
                    <InputGroup>
                      <InputGroup.Text className="bg-light border-end-0 text-muted" style={{ borderTopLeftRadius: '10px', borderBottomLeftRadius: '10px' }}>
                        <FaPhone />
                      </InputGroup.Text>
                      <Form.Control 
                        type="text" 
                        name="phone"
                        maxLength={10}
                        placeholder="Enter 10-digit number" 
                        value={formData.phone}
                        onChange={handleChange}
                        className="border-start-0 ps-0"
                        style={{ borderTopRightRadius: '10px', borderBottomRightRadius: '10px' }}
                        required
                      />
                    </InputGroup>
                  </Form.Group>

                  <Form.Group className="mb-3" controlId="formBasicEmail">
                    <Form.Label className="form-label">Email Address <span className="text-danger">*</span></Form.Label>
                    <InputGroup>
                      <InputGroup.Text className="bg-light border-end-0 text-muted" style={{ borderTopLeftRadius: '10px', borderBottomLeftRadius: '10px' }}>
                        <FaEnvelope />
                      </InputGroup.Text>
                      <Form.Control 
                        type="email" 
                        name="email"
                        placeholder="john.doe@example.com" 
                        value={formData.email}
                        onChange={handleChange}
                        className="border-start-0 ps-0"
                        style={{ borderTopRightRadius: '10px', borderBottomRightRadius: '10px' }}
                        required
                      />
                    </InputGroup>
                  </Form.Group>

                  <Form.Group className="mb-4" controlId="formBasicPassword">
                    <Form.Label className="form-label">Password <span className="text-danger">*</span></Form.Label>
                    <InputGroup className="mb-1">
                      <InputGroup.Text className="bg-light border-end-0 text-muted" style={{ borderTopLeftRadius: '10px', borderBottomLeftRadius: '10px' }}>
                        <FaLock />
                      </InputGroup.Text>
                      <Form.Control 
                        type={showPassword ? "text" : "password"} 
                        name="password"
                        placeholder="••••••••" 
                        value={formData.password}
                        onChange={handleChange}
                        className="border-start-0 border-end-0 ps-0"
                        required
                      />
                      <Button 
                        variant="outline-secondary" 
                        onClick={() => setShowPassword(!showPassword)}
                        className="border border-start-0 bg-light text-muted"
                        style={{ borderTopRightRadius: '10px', borderBottomRightRadius: '10px' }}
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </Button>
                    </InputGroup>
                    <Form.Text className="text-muted small" style={{ fontSize: '0.78rem' }}>
                      Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char.
                    </Form.Text>
                  </Form.Group>

                  <div className="d-grid gap-2">
                    <Button variant="orange" type="submit" disabled={isLoading} className="btn-orange py-2.5 w-100 mt-2">
                      {isLoading ? 'Registering...' : 'Register'}
                    </Button>
                    <Link to="/" className="btn btn-outline-secondary py-2.5 w-100 fw-semibold" style={{ borderRadius: '10px' }}>
                      Cancel
                    </Link>
                  </div>
                  
                  <div className="text-center mt-4">
                    <p className="text-muted mb-0 small">
                      Already have an account? <Link to="/login" className="text-orange fw-semibold text-decoration-none">Sign In</Link>
                    </p>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Register;
