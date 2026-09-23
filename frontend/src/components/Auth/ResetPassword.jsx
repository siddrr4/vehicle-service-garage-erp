import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Container, Row, Col, Form, Button, Alert, Card, InputGroup } from 'react-bootstrap';
import { FaLock, FaEye, FaEyeSlash, FaCar, FaArrowLeft } from 'react-icons/fa';
import api from '../../services/api';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Validations
    if (!password) {
      setError('New password is required.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      setError('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post('/auth/reset-password', { token, password });
      setSuccessMessage(response.data.message || 'Password changed successfully. Please login.');
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Network error. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Container className="position-relative z-1">
        <Row className="justify-content-center">
          <Col md={7} lg={5}>
            <Card className="bg-card text-dark border-0 shadow-lg" style={{ borderRadius: '24px' }}>
              <Card.Body className="p-4 p-sm-5">
                <div className="text-center mb-4">
                  <div className="d-inline-flex align-items-center justify-content-center p-3 rounded-circle bg-orange bg-opacity-10 text-orange mb-3" style={{ width: '64px', height: '64px' }}>
                    <FaCar size={32} />
                  </div>
                  <h2 className="fw-bold mb-1 text-navy" style={{ letterSpacing: '-0.02em' }}>Reset Password</h2>
                  <p className="text-muted small">Please enter your new password below.</p>
                </div>

                {error && <Alert variant="danger" className="py-2.5 rounded-3">{error}</Alert>}
                {successMessage && <Alert variant="success" className="py-2.5 rounded-3">{successMessage}</Alert>}

                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3" controlId="formNewPassword">
                    <Form.Label className="form-label">New Password <span className="text-danger">*</span></Form.Label>
                    <InputGroup>
                      <InputGroup.Text className="bg-light border-end-0 text-muted" style={{ borderTopLeftRadius: '10px', borderBottomLeftRadius: '10px' }}>
                        <FaLock />
                      </InputGroup.Text>
                      <Form.Control 
                        type={showPassword ? "text" : "password"} 
                        placeholder="••••••••" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
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
                    <Form.Text className="text-muted small">
                      Must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number & 1 special character.
                    </Form.Text>
                  </Form.Group>

                  <Form.Group className="mb-4" controlId="formConfirmPassword">
                    <Form.Label className="form-label">Confirm Password <span className="text-danger">*</span></Form.Label>
                    <InputGroup>
                      <InputGroup.Text className="bg-light border-end-0 text-muted" style={{ borderTopLeftRadius: '10px', borderBottomLeftRadius: '10px' }}>
                        <FaLock />
                      </InputGroup.Text>
                      <Form.Control 
                        type={showConfirmPassword ? "text" : "password"} 
                        placeholder="••••••••" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="border-start-0 border-end-0 ps-0"
                        required
                      />
                      <Button 
                        variant="outline-secondary" 
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="border border-start-0 bg-light text-muted"
                        style={{ borderTopRightRadius: '10px', borderBottomRightRadius: '10px' }}
                      >
                        {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                      </Button>
                    </InputGroup>
                  </Form.Group>

                  <div className="d-grid gap-2">
                    <Button variant="orange" type="submit" disabled={isLoading} className="btn-orange py-2.5 w-100">
                      {isLoading ? 'Resetting Password...' : 'Reset Password'}
                    </Button>
                    <Link to="/login" className="btn btn-outline-secondary py-2.5 w-100 d-inline-flex align-items-center justify-content-center gap-2">
                      <FaArrowLeft size={14} /> Back to Login
                    </Link>
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

export default ResetPassword;
