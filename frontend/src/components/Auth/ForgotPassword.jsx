import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Alert, Card, InputGroup, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FaEnvelope, 
  FaCar, 
  FaArrowLeft, 
  FaKey, 
  FaLock, 
  FaEye, 
  FaEyeSlash, 
  FaCheckCircle, 
  FaRedo,
  FaShieldAlt
} from 'react-icons/fa';
import api from '../../services/api';

const ForgotPassword = () => {
  const navigate = useNavigate();

  // STEP 1: 'EMAIL' | STEP 2: 'VERIFY_OTP' | STEP 3: 'NEW_PASSWORD' | STEP 4: 'SUCCESS'
  const [step, setStep] = useState('EMAIL');
  
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Timer countdown for resending OTP
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // STEP 1: Send OTP to Email
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your registered email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post('/auth/forgot-password', { email: cleanEmail });
      setSuccessMessage(response.data.message || 'OTP verification code has been sent to your email.');
      setStep('VERIFY_OTP');
      setResendCooldown(60); // 60s cooldown
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Network error. Unable to send OTP. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanOtp = otp.toString().trim().replace(/\s+/g, '');
    if (!cleanOtp) {
      setError('Please enter the 6-digit OTP code received in your email.');
      return;
    }

    if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      setError('The OTP code must be exactly 6 numeric digits.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post('/auth/verify-otp', {
        email: email.trim(),
        otp: cleanOtp,
      });

      if (response.data && response.data.resetToken) {
        setResetToken(response.data.resetToken);
      }

      setSuccessMessage(response.data.message || 'OTP verified successfully!');
      // Transition to Step 3: Set New Password
      setTimeout(() => {
        setStep('NEW_PASSWORD');
        setError(null);
      }, 400);
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Invalid OTP code. Please check your email and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isLoading) return;
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const response = await api.post('/auth/resend-otp', { email: email.trim() });
      setSuccessMessage(response.data.message || 'A fresh OTP has been sent to your email.');
      setResendCooldown(60);
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Failed to resend OTP. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 3: Reset Password with Verified OTP
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!resetToken) {
      setError('Reset session expired or invalid. Please verify your OTP again.');
      setStep('VERIFY_OTP');
      return;
    }

    if (!newPassword) {
      setError('Please enter a new password.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      setError('Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify your confirm password.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post('/auth/reset-password', {
        resetToken,
        password: newPassword,
      });

      setSuccessMessage(response.data.message || 'Password reset successfully!');
      setStep('SUCCESS');

      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Failed to reset password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Container className="position-relative z-1 py-4">
        <Row className="justify-content-center">
          <Col md={8} lg={6} xl={5}>
            <Card className="bg-card text-dark border-0 shadow-lg" style={{ borderRadius: '24px' }}>
              <Card.Body className="p-4 p-sm-5">
                {/* Brand Header */}
                <div className="text-center mb-4">
                  <div 
                    className="d-inline-flex align-items-center justify-content-center p-3 rounded-circle bg-orange bg-opacity-10 text-orange mb-3" 
                    style={{ width: '64px', height: '64px' }}
                  >
                    <FaCar size={32} />
                  </div>
                  <h2 className="fw-bold mb-1 text-navy" style={{ letterSpacing: '-0.02em' }}>GarageERP</h2>
                  <p className="text-muted small">
                    {step === 'EMAIL' && 'Step 1: Enter your registered email'}
                    {step === 'VERIFY_OTP' && 'Step 2: Verify the 6-digit OTP'}
                    {step === 'NEW_PASSWORD' && 'Step 3: Create your new password'}
                    {step === 'SUCCESS' && 'Password updated successfully'}
                  </p>
                </div>

                {/* Step Progress Indicators */}
                {step !== 'SUCCESS' && (
                  <div className="d-flex align-items-center justify-content-center gap-2 mb-4">
                    <span 
                      className={`badge rounded-pill px-3 py-1.5 ${step === 'EMAIL' ? 'bg-orange text-white' : 'bg-success text-white'}`}
                      style={{ fontSize: '11px', fontWeight: 600 }}
                    >
                      1. Email
                    </span>
                    <span className="text-muted small">&rarr;</span>
                    <span 
                      className={`badge rounded-pill px-3 py-1.5 ${
                        step === 'VERIFY_OTP' ? 'bg-orange text-white' : step === 'NEW_PASSWORD' ? 'bg-success text-white' : 'bg-light text-muted border'
                      }`}
                      style={{ fontSize: '11px', fontWeight: 600 }}
                    >
                      2. Verify OTP
                    </span>
                    <span className="text-muted small">&rarr;</span>
                    <span 
                      className={`badge rounded-pill px-3 py-1.5 ${
                        step === 'NEW_PASSWORD' ? 'bg-orange text-white' : 'bg-light text-muted border'
                      }`}
                      style={{ fontSize: '11px', fontWeight: 600 }}
                    >
                      3. New Password
                    </span>
                  </div>
                )}

                {/* Alerts */}
                {error && <Alert variant="danger" className="py-2.5 rounded-3 mb-3">{error}</Alert>}
                {successMessage && step !== 'SUCCESS' && (
                  <Alert variant="success" className="py-2.5 rounded-3 mb-3">{successMessage}</Alert>
                )}

                {/* STEP 1: ENTER EMAIL */}
                {step === 'EMAIL' && (
                  <Form onSubmit={handleSendOtp}>
                    <p className="text-muted small mb-3">
                      Enter your account email. We will send a 6-digit verification code (OTP) via Google SMTP to your inbox.
                    </p>

                    <Form.Group className="mb-4" controlId="formForgotPasswordEmail">
                      <Form.Label className="form-label fw-semibold">Email Address <span className="text-danger">*</span></Form.Label>
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
                          autoFocus
                        />
                      </InputGroup>
                    </Form.Group>

                    <div className="d-grid gap-2">
                      <Button 
                        variant="orange" 
                        type="submit" 
                        disabled={isLoading} 
                        className="btn-orange py-2.5 w-100 fw-bold d-inline-flex align-items-center justify-content-center gap-2"
                      >
                        {isLoading ? (
                          <>
                            <Spinner animation="border" size="sm" /> Sending OTP...
                          </>
                        ) : (
                          'Send Reset OTP'
                        )}
                      </Button>
                      <Link to="/login" className="btn btn-outline-secondary py-2.5 w-100 d-inline-flex align-items-center justify-content-center gap-2">
                        <FaArrowLeft size={14} /> Back to Login
                      </Link>
                    </div>
                  </Form>
                )}

                {/* STEP 2: VERIFY OTP */}
                {step === 'VERIFY_OTP' && (
                  <Form onSubmit={handleVerifyOtp}>
                    <div className="p-3 mb-3 rounded-3 bg-light border text-center">
                      <div className="text-muted small">We sent a 6-digit OTP code to:</div>
                      <div className="fw-bold text-dark text-truncate mt-1">{email}</div>
                      <button
                        type="button"
                        onClick={() => {
                          setStep('EMAIL');
                          setError(null);
                          setSuccessMessage(null);
                          setResetToken('');
                          setOtp('');
                        }}
                        className="btn btn-link p-0 mt-1 small text-decoration-none text-orange"
                        style={{ fontSize: '13px' }}
                      >
                        Change email address?
                      </button>
                    </div>

                    <Form.Group className="mb-4" controlId="formOtpCode">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <Form.Label className="form-label fw-semibold mb-0">6-Digit OTP Code <span className="text-danger">*</span></Form.Label>
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={resendCooldown > 0 || isLoading}
                          className="btn btn-link p-0 text-decoration-none small"
                          style={{ 
                            fontSize: '12px',
                            color: resendCooldown > 0 ? '#94a3b8' : '#ea580c',
                            cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer'
                          }}
                        >
                          <FaRedo className={`me-1 ${isLoading ? 'fa-spin' : ''}`} size={11} />
                          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                        </button>
                      </div>
                      <InputGroup>
                        <InputGroup.Text className="bg-light border-end-0 text-muted" style={{ borderTopLeftRadius: '10px', borderBottomLeftRadius: '10px' }}>
                          <FaKey />
                        </InputGroup.Text>
                        <Form.Control 
                          type="text" 
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="••••••" 
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          className="border-start-0 text-center fw-bold fs-4 tracking-widest ps-0"
                          style={{ 
                            borderTopRightRadius: '10px', 
                            borderBottomRightRadius: '10px',
                            letterSpacing: '8px',
                            fontFamily: 'monospace'
                          }}
                          required
                          autoFocus
                        />
                      </InputGroup>
                      <Form.Text className="text-muted small">
                        Please check your inbox or spam folder for the code. Valid for 10 minutes.
                      </Form.Text>
                    </Form.Group>

                    <div className="d-grid gap-2">
                      <Button 
                        variant="orange" 
                        type="submit" 
                        disabled={isLoading || otp.length !== 6} 
                        className="btn-orange py-2.5 w-100 fw-bold d-inline-flex align-items-center justify-content-center gap-2"
                      >
                        {isLoading ? (
                          <>
                            <Spinner animation="border" size="sm" /> Verifying OTP...
                          </>
                        ) : (
                          <>
                            <FaShieldAlt /> Verify OTP
                          </>
                        )}
                      </Button>
                      <button
                        type="button"
                        onClick={() => {
                          setStep('EMAIL');
                          setError(null);
                          setSuccessMessage(null);
                          setResetToken('');
                          setOtp('');
                        }}
                        className="btn btn-outline-secondary py-2.5 w-100 d-inline-flex align-items-center justify-content-center gap-2"
                      >
                        <FaArrowLeft size={14} /> Back
                      </button>
                    </div>
                  </Form>
                )}

                {/* STEP 3: SET NEW PASSWORD */}
                {step === 'NEW_PASSWORD' && (
                  <Form onSubmit={handleResetPassword}>
                    <div className="p-2.5 mb-3 rounded-3 bg-success bg-opacity-10 border border-success border-opacity-25 d-flex align-items-center gap-2 text-success">
                      <FaCheckCircle size={18} />
                      <div className="small fw-semibold">
                        OTP Verified for <strong>{email}</strong>
                      </div>
                    </div>

                    {/* New Password */}
                    <Form.Group className="mb-3" controlId="formNewPassword">
                      <Form.Label className="form-label fw-semibold">New Password <span className="text-danger">*</span></Form.Label>
                      <InputGroup>
                        <InputGroup.Text className="bg-light border-end-0 text-muted" style={{ borderTopLeftRadius: '10px', borderBottomLeftRadius: '10px' }}>
                          <FaLock />
                        </InputGroup.Text>
                        <Form.Control 
                          type={showPassword ? "text" : "password"} 
                          placeholder="••••••••" 
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="border-start-0 border-end-0 ps-0"
                          required
                          autoFocus
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
                        Min. 8 characters with 1 uppercase, 1 lowercase, 1 number & 1 symbol.
                      </Form.Text>
                    </Form.Group>

                    {/* Confirm New Password */}
                    <Form.Group className="mb-4" controlId="formConfirmPassword">
                      <Form.Label className="form-label fw-semibold">Confirm New Password <span className="text-danger">*</span></Form.Label>
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
                      <Button 
                        variant="orange" 
                        type="submit" 
                        disabled={isLoading} 
                        className="btn-orange py-2.5 w-100 fw-bold d-inline-flex align-items-center justify-content-center gap-2"
                      >
                        {isLoading ? (
                          <>
                            <Spinner animation="border" size="sm" /> Resetting Password...
                          </>
                        ) : (
                          'Save New Password'
                        )}
                      </Button>
                      <button
                        type="button"
                        onClick={() => {
                          setStep('EMAIL');
                          setError(null);
                          setSuccessMessage(null);
                          setResetToken('');
                          setOtp('');
                        }}
                        className="btn btn-outline-secondary py-2.5 w-100 d-inline-flex align-items-center justify-content-center gap-2"
                      >
                        <FaArrowLeft size={14} /> Request New OTP
                      </button>
                    </div>
                  </Form>
                )}

                {/* STEP 4: SUCCESS CONFIRMATION */}
                {step === 'SUCCESS' && (
                  <div className="text-center py-3">
                    <div className="text-success mb-3">
                      <FaCheckCircle size={60} />
                    </div>
                    <h4 className="fw-bold text-navy mb-2">Password Reset Successfully!</h4>
                    <p className="text-muted small mb-4">
                      Your password has been securely updated. You will now be redirected to the login page automatically.
                    </p>
                    <Button 
                      variant="orange" 
                      onClick={() => navigate('/login')} 
                      className="btn-orange py-2.5 w-100 fw-bold"
                    >
                      Go to Login Now
                    </Button>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default ForgotPassword;
