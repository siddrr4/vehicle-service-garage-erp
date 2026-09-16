import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Form, Button, Tabs, Tab } from 'react-bootstrap';
import { FaBuilding, FaFileInvoice, FaWrench, FaCreditCard, FaLock } from 'react-icons/fa';
import { toast } from 'react-toastify';
import settingService from '../../services/settingService';
import PageHeader from '../../components/UI/PageHeader';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('profile');
  
  // Profile settings state
  const [garageName, setGarageName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gstin, setGstin] = useState('');

  // Invoice settings state
  const [invoicePrefix, setInvoicePrefix] = useState('INV');
  const [invoiceNumbering, setInvoiceNumbering] = useState(1);
  const [defaultTaxGst, setDefaultTaxGst] = useState(18);
  const [showGstin, setShowGstin] = useState(true);
  const [showGarageContact, setShowGarageContact] = useState(true);

  // Service Charges state
  const [defaultLabourCharge, setDefaultLabourCharge] = useState(500);
  const [defaultWashingCharge, setDefaultWashingCharge] = useState(300);

  // Payment settings state
  const [razorpayStatus, setRazorpayStatus] = useState('Not Configured');
  const [onlinePaymentEnabled, setOnlinePaymentEnabled] = useState(false);
  const [acceptedManualMethods, setAcceptedManualMethods] = useState(['Cash', 'UPI', 'Card', 'Other']);

  // Account Security state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await settingService.getSettings();
      setGarageName(data.garageName || '');
      setAddress(data.address || '');
      setCity(data.city || '');
      setState(data.state || '');
      setPincode(data.pincode || '');
      setPhone(data.phone || '');
      setEmail(data.email || '');
      setGstin(data.gstin || '');

      setInvoicePrefix(data.invoicePrefix || 'INV');
      setInvoiceNumbering(data.invoiceNumbering || 1);
      setDefaultTaxGst(data.defaultTaxGst !== undefined ? data.defaultTaxGst : 18);
      setShowGstin(data.showGstin !== undefined ? data.showGstin : true);
      setShowGarageContact(data.showGarageContact !== undefined ? data.showGarageContact : true);

      setDefaultLabourCharge(data.defaultLabourCharge !== undefined ? data.defaultLabourCharge : 500);
      setDefaultWashingCharge(data.defaultWashingCharge !== undefined ? data.defaultWashingCharge : 300);

      setRazorpayStatus(data.razorpayStatus || 'Not Configured');
      setOnlinePaymentEnabled(data.onlinePaymentEnabled || false);
      setAcceptedManualMethods(data.acceptedManualMethods || ['Cash', 'UPI', 'Card', 'Other']);

      setLoading(false);
    } catch (error) {
      toast.error('Failed to load settings.');
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        garageName,
        address,
        city,
        state,
        pincode,
        phone,
        email,
        gstin,
        invoicePrefix,
        invoiceNumbering: Number(invoiceNumbering),
        defaultTaxGst: Number(defaultTaxGst),
        showGstin,
        showGarageContact,
        defaultLabourCharge: Number(defaultLabourCharge),
        defaultWashingCharge: Number(defaultWashingCharge),
        onlinePaymentEnabled,
        acceptedManualMethods
      };

      const updated = await settingService.updateSettings(payload);
      toast.success('Settings updated successfully!');
      setRazorpayStatus(updated.razorpayStatus || 'Not Configured');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleManualMethodChange = (method) => {
    if (acceptedManualMethods.includes(method)) {
      setAcceptedManualMethods(acceptedManualMethods.filter(m => m !== method));
    } else {
      setAcceptedManualMethods([...acceptedManualMethods, method]);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      toast.error('New passwords do not match!');
      return;
    }

    try {
      setSaving(true);
      await settingService.changePassword({ currentPassword, newPassword });
      toast.success('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update password.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid px-0">
      <PageHeader
        title="ERP Configuration & System Settings"
        subtitle="Business profile, tax parameters, invoice numbering sequences, payment gateways, and security controls"
        breadcrumbs={[
          { label: 'System', to: '/admin-dashboard' },
          { label: 'Settings' }
        ]}
      />
      
      <Row>
        <Col md={12}>
          <Card className="border-0 shadow-sm rounded-3 mb-4 bg-white text-dark">
            <Card.Body className="p-0">
              <Tabs
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
                className="custom-tabs px-4 pt-3 border-bottom"
              >
                <Tab eventKey="profile" title={<span><FaBuilding className="me-2"/>Business Profile</span>}>
                  <div className="p-4">
                    <Form onSubmit={handleSaveSettings}>
                      <h5 className="fw-bold mb-4 text-navy">Garage & Business Identity</h5>
                      <Row className="g-3">
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold small text-secondary">Garage Name</Form.Label>
                            <Form.Control
                              type="text"
                              value={garageName}
                              onChange={e => setGarageName(e.target.value)}
                              required
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold small text-secondary">GSTIN</Form.Label>
                            <Form.Control
                              type="text"
                              value={gstin}
                              onChange={e => setGstin(e.target.value)}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={12}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold small text-secondary">Address</Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={2}
                              value={address}
                              onChange={e => setAddress(e.target.value)}
                              required
                            />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold small text-secondary">City</Form.Label>
                            <Form.Control
                              type="text"
                              value={city}
                              onChange={e => setCity(e.target.value)}
                              required
                            />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold small text-secondary">State</Form.Label>
                            <Form.Control
                              type="text"
                              value={state}
                              onChange={e => setState(e.target.value)}
                              required
                            />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold small text-secondary">Pincode</Form.Label>
                            <Form.Control
                              type="text"
                              value={pincode}
                              onChange={e => setPincode(e.target.value)}
                              required
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold small text-secondary">Phone Number</Form.Label>
                            <Form.Control
                              type="text"
                              value={phone}
                              onChange={e => setPhone(e.target.value)}
                              required
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold small text-secondary">Email Address</Form.Label>
                            <Form.Control
                              type="email"
                              value={email}
                              onChange={e => setEmail(e.target.value)}
                              required
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                      <div className="mt-4 border-top pt-3 d-flex justify-content-end">
                        <Button variant="orange" type="submit" disabled={saving}>
                          {saving ? 'Saving...' : 'Save Profile Settings'}
                        </Button>
                      </div>
                    </Form>
                  </div>
                </Tab>
                
                <Tab eventKey="invoice" title={<span><FaFileInvoice className="me-2"/>Invoice Rules</span>}>
                  <div className="p-4">
                    <Form onSubmit={handleSaveSettings}>
                      <h5 className="fw-bold mb-4 text-navy">Invoice Configurations</h5>
                      <Row className="g-3">
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold small text-secondary">Invoice Prefix</Form.Label>
                            <Form.Control
                              type="text"
                              value={invoicePrefix}
                              onChange={e => setInvoicePrefix(e.target.value)}
                              required
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold small text-secondary">Default Tax / GST (%)</Form.Label>
                            <Form.Control
                              type="number"
                              min="0"
                              max="100"
                              value={defaultTaxGst}
                              onChange={e => setDefaultTaxGst(e.target.value)}
                              required
                            />
                          </Form.Group>
                        </Col>
                        <Col md={12}>
                          <Form.Group className="mb-3">
                            <Form.Check
                              type="checkbox"
                              label="Show GSTIN on Invoice"
                              id="showGstin"
                              checked={showGstin}
                              onChange={e => setShowGstin(e.target.checked)}
                            />
                          </Form.Group>
                          <Form.Group className="mb-3">
                            <Form.Check
                              type="checkbox"
                              label="Show Garage Contact details on Invoice"
                              id="showGarageContact"
                              checked={showGarageContact}
                              onChange={e => setShowGarageContact(e.target.checked)}
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                      <div className="mt-4 border-top pt-3 d-flex justify-content-end">
                        <Button variant="orange" type="submit" disabled={saving}>
                          {saving ? 'Saving...' : 'Save Invoice Rules'}
                        </Button>
                      </div>
                    </Form>
                  </div>
                </Tab>
                
                <Tab eventKey="charges" title={<span><FaWrench className="me-2"/>Service Charges</span>}>
                  <div className="p-4">
                    <Form onSubmit={handleSaveSettings}>
                      <h5 className="fw-bold mb-3 text-navy">Default Charges</h5>
                      <p className="text-muted small mb-4">Note: The free services (first 3 free services) logic takes precedence, applying zero charges automatically to eligible labor & washing bookings.</p>
                      <Row className="g-3">
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold small text-secondary">Default Labour Charge (₹)</Form.Label>
                            <Form.Control
                              type="number"
                              min="0"
                              value={defaultLabourCharge}
                              onChange={e => setDefaultLabourCharge(e.target.value)}
                              required
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold small text-secondary">Default Washing Charge (₹)</Form.Label>
                            <Form.Control
                              type="number"
                              min="0"
                              value={defaultWashingCharge}
                              onChange={e => setDefaultWashingCharge(e.target.value)}
                              required
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                      <div className="mt-4 border-top pt-3 d-flex justify-content-end">
                        <Button variant="orange" type="submit" disabled={saving}>
                          {saving ? 'Saving...' : 'Save Charges'}
                        </Button>
                      </div>
                    </Form>
                  </div>
                </Tab>
                
                <Tab eventKey="payment" title={<span><FaCreditCard className="me-2"/>Payment Gateways</span>}>
                  <div className="p-4">
                    <Form onSubmit={handleSaveSettings}>
                      <h5 className="fw-bold mb-4 text-navy">Gateway & Checkout Settings</h5>
                      
                      <div className="mb-4 p-3 bg-light rounded border text-dark">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <strong className="text-secondary small">Razorpay Gateway Credentials Status</strong>
                          <span className={`badge ${razorpayStatus === 'Configured' ? 'bg-success' : 'bg-danger'}`}>
                            {razorpayStatus}
                          </span>
                        </div>
                        <p className="text-muted small mb-0">Razorpay Key IDs & Secrets are secure environmental variables. They are not displayed in the client UI.</p>
                      </div>

                      <Row className="g-3">
                        <Col md={12}>
                          <Form.Group className="mb-3">
                            <Form.Check
                              type="checkbox"
                              label="Enable Customer Online Payments"
                              id="onlinePaymentEnabled"
                              checked={onlinePaymentEnabled}
                              onChange={e => setOnlinePaymentEnabled(e.target.checked)}
                            />
                          </Form.Group>
                        </Col>
                        
                        <Col md={12}>
                          <Form.Label className="fw-semibold small text-secondary mb-2">Accepted Manual Payment Methods (Admin / Advisor Only)</Form.Label>
                          <div className="d-flex flex-wrap gap-4 mt-1">
                            {['Cash', 'UPI', 'Card', 'Other'].map(method => (
                              <Form.Check
                                key={method}
                                type="checkbox"
                                id={`method-${method}`}
                                label={method}
                                checked={acceptedManualMethods.includes(method)}
                                onChange={() => handleManualMethodChange(method)}
                              />
                            ))}
                          </div>
                        </Col>
                      </Row>
                      
                      <div className="mt-4 border-top pt-3 d-flex justify-content-end">
                        <Button variant="orange" type="submit" disabled={saving}>
                          {saving ? 'Saving...' : 'Save Payment Configurations'}
                        </Button>
                      </div>
                    </Form>
                  </div>
                </Tab>
                
                <Tab eventKey="security" title={<span><FaLock className="me-2"/>Account Security</span>}>
                  <div className="p-4">
                    <Form onSubmit={handlePasswordChange}>
                      <h5 className="fw-bold mb-4 text-navy">Change Account Password</h5>
                      <Row className="g-3">
                        <Col md={12}>
                          <Form.Group className="mb-3" style={{ maxWidth: '450px' }}>
                            <Form.Label className="fw-semibold small text-secondary">Current Password</Form.Label>
                            <Form.Control
                              type="password"
                              value={currentPassword}
                              onChange={e => setCurrentPassword(e.target.value)}
                              required
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold small text-secondary">New Password</Form.Label>
                            <Form.Control
                              type="password"
                              value={newPassword}
                              onChange={e => setNewPassword(e.target.value)}
                              required
                            />
                            <Form.Text className="text-muted small">
                              Minimum 8 characters with upper, lower, number, and special character.
                            </Form.Text>
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold small text-secondary">Confirm New Password</Form.Label>
                            <Form.Control
                              type="password"
                              value={confirmNewPassword}
                              onChange={e => setConfirmNewPassword(e.target.value)}
                              required
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                      
                      <div className="mt-4 border-top pt-3 d-flex justify-content-end">
                        <Button variant="orange" type="submit" disabled={saving}>
                          {saving ? 'Saving...' : 'Update Password'}
                        </Button>
                      </div>
                    </Form>
                  </div>
                </Tab>
              </Tabs>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SettingsPage;
