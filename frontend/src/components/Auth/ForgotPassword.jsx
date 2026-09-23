import React, { useState } from 'react';
import { Container, Row, Col, Form, Button, Alert, Card, InputGroup } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaEnvelope, FaCar, FaArrowLeft, FaKey } from 'react-icons/fa';
import api from '../../services/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [resetToken, setResetToken] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setResetToken(null);

    // Email validation
    if (!email.trim()) {
      setError('Email is required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Email format must be valid.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post('/auth/forgot-password', { email: email.trim() });
      setSuccessMessage(response.data.message || 'Password reset link has been sent successfully.');
      if (response.data.resetToken) {
        setResetToken(response.data.resetToken);
      }
      setEmail('');
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
                  <h2 className="fw-bold mb-1 text-navy" style={{ letterSpacing: '-0.02em' }}>Forgot Password?</h2>
                  <p className="text-muted small">Enter your email address to receive a password reset link.</p>
                </div>

                {error && <Alert variant="danger" className="py-2.5 rounded-3">{error}</Alert>}
                {successMessage && (
                  <Alert variant="success" className="py-3 rounded-3">
                    <p className="mb-2 fw-semibold">{successMessage}</p>
                    {resetToken && (
                      <div className="mt-3 pt-2 border-top">
                        <p className="small text-muted mb-2">Click below to proceed to the Reset Password page:</p>
                        <Link 
                          to={`/reset-password/${resetToken}`} 
                          className="btn btn-orange w-100 py-2 d-inline-flex align-items-center justify-content-center gap-2 fw-bold text-white shadow-sm"
                        >
                          <FaKey /> Click Here to Reset Password
                        </Link>
                      </div>
                    )}
                  </Alert>
                )}

                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-4" controlId="formForgotPasswordEmail">
                    <Form.Label className="form-label">Email Address <span className="text-danger">*</span></Form.Label>
                    <InputGroup>
                      <InputGroup.Text className="bg-light border-end-0 text-muted" style={{ borderTopLeftRadius: '10px', borderBottomLeftRadius: '10px' }}>
                        <FaEnvelope />
                      </InputGroup.Text>
                      <Form.Control 
                        type="email" 
                        placeholder="name@example.com" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="border-start-0 ps-0"
                        style={{ borderTopRightRadius: '10px', borderBottomRightRadius: '10px' }}
                        required
                      />
                    </InputGroup>
                  </Form.Group>

                  <div className="d-grid gap-2">
                    <Button variant="orange" type="submit" disabled={isLoading} className="btn-orange py-2.5 w-100">
                      {isLoading ? 'Sending Link...' : 'Send Reset Link'}
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

export default ForgotPassword;
