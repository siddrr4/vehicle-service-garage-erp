import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Container, Row, Col, Form, Button, Alert, Card, InputGroup } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaEye, FaEyeSlash, FaEnvelope, FaLock, FaCar } from 'react-icons/fa';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const result = await login(email, password);
    
    if (!result.success) {
      setError(result.message);
    }
    setIsLoading(false);
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
                  <h2 className="fw-bold mb-1 text-navy" style={{ letterSpacing: '-0.02em' }}>Garage ERP</h2>
                  <p className="text-muted small">Sign in to your garage dashboard console</p>
                </div>

                {error && <Alert variant="danger" className="py-2.5 rounded-3">{error}</Alert>}

                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3.5" controlId="formBasicEmail">
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

                  <Form.Group className="mb-4" controlId="formBasicPassword">
                    <Form.Label className="form-label">Password <span className="text-danger">*</span></Form.Label>
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
                  </Form.Group>

                  <div className="d-flex justify-content-end mb-3">
                    <Link to="/forgot-password" className="text-orange small text-decoration-none fw-semibold">
                      Forgot Password?
                    </Link>
                  </div>

                  <div className="d-grid gap-2">
                    <Button variant="orange" type="submit" disabled={isLoading} className="btn-orange py-2.5 w-100 mt-2">
                      {isLoading ? 'Signing In...' : 'Sign In'}
                    </Button>
                    <Link to="/" className="btn btn-outline-secondary py-2.5 w-100 fw-semibold" style={{ borderRadius: '10px' }}>
                      Cancel
                    </Link>
                  </div>
                  
                  <div className="text-center mt-4">
                    <p className="text-muted mb-0 small">
                      Don't have an account? <Link to="/register" className="text-orange fw-semibold text-decoration-none">Sign Up</Link>
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

export default Login;
