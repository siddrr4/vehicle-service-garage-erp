import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  BsCarFront, BsCalendarCheck, BsClockHistory, BsCardText, BsReceipt, BsJournalText,
  BsShieldCheck, BsLightningCharge, BsGeoAlt, BsFileEarmarkText, BsCalendarPlus, BsCloudCheck,
  BsPeople, BsBox, BsClipboardData, BsBell, BsStarFill, BsTelephone, BsEnvelope,
  BsClock, BsFacebook, BsTwitter, BsInstagram, BsLinkedin, BsArrowRight, BsCheckCircleFill
} from 'react-icons/bs';
import { FaCar, FaWrench, FaShieldAlt, FaCalendarAlt, FaFileInvoiceDollar, FaUsers } from 'react-icons/fa';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="landing-page">
      {/* SECTION 1: Top Navigation */}
      <nav className={`navbar navbar-expand-lg fixed-top modern-navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="container">
          <Link className="navbar-brand d-flex align-items-center gap-2" to="/">
            <div className="bg-orange p-2 rounded-2 text-white d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px' }}>
              <FaCar size={18} />
            </div>
            <span>GARAGE ERP</span>
          </Link>
          
          <button 
            className="navbar-toggler border-0 text-white" 
            type="button" 
            data-bs-toggle="collapse" 
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon" style={{ filter: 'invert(1)' }}></span>
          </button>
          
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav mx-auto">
              <li className="nav-item"><a className="nav-link" href="#home">Home</a></li>
              <li className="nav-item"><a className="nav-link" href="#features">Features</a></li>
              <li className="nav-item"><a className="nav-link" href="#workflow">Workflow</a></li>
              <li className="nav-item"><a className="nav-link" href="#enterprise-value">Enterprise</a></li>
              <li className="nav-item"><a className="nav-link" href="#modules">ERP Modules</a></li>
              <li className="nav-item"><a className="nav-link" href="#faq">FAQ</a></li>
              <li className="nav-item"><a className="nav-link" href="#contact">Contact</a></li>
            </ul>
            <div className="d-flex gap-2 align-items-center">
              <button className="btn btn-outline-light btn-sm px-3" onClick={() => navigate('/login')}>
                Sign In
              </button>
              <button className="btn btn-orange btn-sm px-3" onClick={() => navigate('/register')}>
                Register
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* SECTION 2: Hero Section */}
      <section id="home" className="hero-section">
        <div className="container position-relative z-1">
          <div className="row align-items-center min-vh-100 pt-4 pb-4">
            <div className="col-lg-6 mb-5 mb-lg-0 text-start">
              <div className="hero-badge">
                <FaCar /> Automotive Service & Workshop ERP
              </div>
              <h1 className="hero-title mb-3">
                Intelligent Vehicle Service & Garage Management
              </h1>
              <p className="hero-lead mb-4 pe-lg-4">
                Streamline workshop appointments, live technician bays, digital repair job cards, spare parts inventory, and tax invoicing from one centralized enterprise system.
              </p>
              <div className="d-flex flex-wrap gap-3">
                <button 
                  className="btn btn-orange btn-lg px-4 shadow"
                  onClick={() => navigate('/register')}
                >
                  GET STARTED
                </button>
                <button 
                  className="btn btn-outline-light btn-lg px-4"
                  onClick={() => navigate('/login')}
                >
                  Book Service
                </button>
              </div>
            </div>
            
            <div className="col-lg-6">
              <div className="hero-img-container">
                <img 
                  src="https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" 
                  alt="Modern Automotive Service Center" 
                  className="img-fluid"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: Live Statistics Strip */}
      <section className="stats-section">
        <div className="container">
          <div className="row g-4 text-center">
            {[
              { num: "5,000+", label: "Services Completed" },
              { num: "3,000+", label: "Registered Customers" },
              { num: "1,500+", label: "Vehicles Managed" },
              { num: "99.4%", label: "Satisfaction Rate" }
            ].map((stat, index) => (
              <div className="col-6 col-md-3" key={index}>
                <div className="stat-box">
                  <div className="stat-num">{stat.num}</div>
                  <p className="stat-label">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4: Features Section */}
      <section id="features" className="features-section">
        <span id="services" className="nav-anchor" aria-hidden="true" />
        <div className="container">
          <div className="section-header-block">
            <span className="section-tag section-tag-orange">Workshop Features</span>
            <h2 className="section-title">Core Workshop Features</h2>
            <p className="section-subtitle">Complete end-to-end digital toolset engineered specifically for modern multi-brand garages.</p>
          </div>
          
          <div className="row g-4">
            {[
              { icon: <BsCarFront />, title: "Vehicle Registration", desc: "Maintain comprehensive vehicle profiles, warranty, odometer logs, and insurance records." },
              { icon: <BsCalendarCheck />, title: "Appointment Booking", desc: "Online self-service booking with dynamic mechanic capacity and time slot management." },
              { icon: <BsCardText />, title: "Digital Job Cards", desc: "Track mechanic assignments, complaints, diagnosis notes, and spare parts in real time." },
              { icon: <BsClockHistory />, title: "Live Bay Tracking", desc: "Real-time visibility into repair bays, walk-in queues, and technician workloads." },
              { icon: <BsReceipt />, title: "Billing & GST Invoicing", desc: "Instant automated itemized invoices with Razorpay online checkout and UPI support." },
              { icon: <BsJournalText />, title: "Complete Service History", desc: "Comprehensive historical logs of parts replaced, labour charges, and maintenance history." }
            ].map((service, idx) => (
              <div className="col-md-6 col-lg-4" key={idx}>
                <div className="enterprise-card feature-card">
                  <div className="icon-box icon-box-orange">
                    {service.icon}
                  </div>
                  <h4 className="feature-card-title">{service.title}</h4>
                  <p className="feature-card-desc">{service.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5: How It Works / Workflow */}
      <section id="workflow" className="workflow-section">
        <div className="container">
          <div className="section-header-block">
            <span className="section-tag section-tag-orange">Operational Flow</span>
            <h2 className="section-title">How Garage ERP Works</h2>
            <p className="section-subtitle">From initial booking to parts fulfillment, inspection, and customer invoice release.</p>
          </div>

          <div className="row g-3">
            {[
              { step: "01", title: "Registration", desc: "Customer creates account & registers vehicle" },
              { step: "02", title: "Appointment", desc: "Select preferred slot or walk in directly" },
              { step: "03", title: "Bay Allocation", desc: "Advisor verifies capacity & creates Job Card" },
              { step: "04", title: "Inspection", desc: "Assigned mechanic inspects & notes requirements" },
              { step: "05", title: "Parts & Repair", desc: "Parts requisitions deducted from live inventory" },
              { step: "06", title: "Tax Invoice", desc: "Automatic GST invoice generated with Razorpay" }
            ].map((item, idx) => (
              <div className="col-md-4 col-lg-2" key={idx}>
                <div className="workflow-box h-100">
                  <div className="step-pill">{item.step}</div>
                  <h6 className="workflow-step-title">{item.title}</h6>
                  <p className="workflow-step-desc">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6: Why Choose Us / Enterprise Value */}
      <section id="enterprise-value" className="enterprise-value-section">
        <div className="container">
          <div className="section-header-block">
            <span className="section-tag section-tag-blue">Enterprise Value</span>
            <h2 className="section-title">Engineered for Efficiency</h2>
            <p className="section-subtitle">Enterprise-grade capabilities built for maximum uptime, accountability, and customer loyalty.</p>
          </div>
          
          <div className="row g-4">
            {[
              { icon: <BsCalendarPlus />, title: "Capacity-Driven Booking", desc: "Never overbook: live slot availability calculated automatically from active mechanic check-ins." },
              { icon: <BsGeoAlt />, title: "Live Waiting Queue", desc: "Manage walk-in customers with priority queue tokens and estimated bay wait times." },
              { icon: <BsShieldCheck />, title: "Role-Based Access", desc: "Dedicated portals tailored for Admins, Service Advisors, Mechanics, and Customers." },
              { icon: <BsFileEarmarkText />, title: "Compliant GST Invoicing", desc: "Professional tax invoices featuring SAC/HSN codes, itemized parts, and labour charges." },
              { icon: <BsLightningCharge />, title: "Payroll & Attendance", desc: "Daily biometric attendance logging, LOP calculations, and auto-generated payslips." },
              { icon: <BsCloudCheck />, title: "Real-time Analytics", desc: "Executive KPI summaries, revenue trends, service breakdown, and mechanic workload analytics." }
            ].map((feature, idx) => (
              <div className="col-md-6 col-lg-4" key={idx}>
                <div className="enterprise-card enterprise-value-card">
                  <div className="icon-box icon-box-blue flex-shrink-0 mb-0">
                    {feature.icon}
                  </div>
                  <div>
                    <h5 className="fw-bold text-navy fs-6 mb-1">{feature.title}</h5>
                    <p className="text-muted small mb-0 lh-base">{feature.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 7: System Modules */}
      <section id="modules" className="py-5 bg-white">
        <div className="container py-4">
          <div className="text-center mb-5" style={{ maxWidth: '680px', margin: '0 auto' }}>
            <span className="section-tag">All-In-One Platform</span>
            <h2 className="section-title">Core ERP Modules</h2>
            <p className="text-muted lead fs-6">Every component you need to operate a profitable automotive service facility.</p>
          </div>

          <div className="row g-4">
            {[
              { title: "Customer & Fleet CRM", icon: <FaUsers size={24} className="text-primary" />, desc: "Maintain owner profiles, contact details, and multi-vehicle garage portfolios." },
              { title: "Workshop Job Cards", icon: <FaWrench size={24} className="text-warning" />, desc: "Full digital work orders with common service selector and status lifecycles." },
              { title: "Spare Parts Inventory", icon: <BsBox size={24} className="text-success" />, desc: "Track stock, reorder thresholds, supplier pricing, and parts usage." },
              { title: "Financials & Billing", icon: <FaFileInvoiceDollar size={24} className="text-info" />, desc: "Tax invoices, digital payment gateway integration, and balance tracking." },
              { title: "Staff & Attendance", icon: <BsClock size={24} className="text-danger" />, desc: "IST-based check-in/out logging, mechanic bay status, and payroll calculations." },
              { title: "Reports & Insights", icon: <BsClipboardData size={24} className="text-purple" />, desc: "Revenue analytics, service volume, parts consumption, and free service trends." }
            ].map((mod, idx) => (
              <div className="col-md-6 col-lg-4" key={idx}>
                <div className="enterprise-card border-top border-4 border-orange">
                  <div className="mb-3">{mod.icon}</div>
                  <h5 className="fw-bold text-navy fs-6 mb-2">{mod.title}</h5>
                  <p className="text-muted small mb-0">{mod.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 8: FAQ */}
      <section id="faq" className="py-5" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="container py-4" style={{ maxWidth: '860px' }}>
          <div className="text-center mb-5">
            <span className="section-tag">Frequently Asked Questions</span>
            <h2 className="section-title">Got Questions? We Have Answers</h2>
          </div>

          <div className="accordion" id="faqAccordion">
            {[
              { q: "How does the mechanic capacity booking work?", a: "The ERP automatically calculates available bay slots per hour based on mechanics checked in today. When capacity is fully booked, customers can join the live waiting queue." },
              { q: "Can customers track their vehicle repair status online?", a: "Yes. Customers have a dedicated portal where they can view live job card status, diagnostic notes, advisor recommendations, and past service history." },
              { q: "Does the billing module support online payments?", a: "Yes. Invoices support integrated Razorpay payment gateway checkout (UPI, cards, net banking) with instant verification and printable tax invoices." },
              { q: "How does the system handle employee attendance and payroll?", a: "Attendance is recorded in Indian Standard Time (IST). Staff members not explicitly marked check-in default to Present without fake work hours. Monthly payroll calculates earned salary accurately without penalizing future dates." }
            ].map((item, idx) => (
              <div className="accordion-item shadow-sm" key={idx}>
                <h2 className="accordion-header" id={`heading${idx}`}>
                  <button 
                    className={`accordion-button ${idx !== 0 ? 'collapsed' : ''}`} 
                    type="button" 
                    data-bs-toggle="collapse" 
                    data-bs-target={`#collapse${idx}`} 
                    aria-expanded={idx === 0 ? 'true' : 'false'} 
                    aria-controls={`collapse${idx}`}
                  >
                    {item.q}
                  </button>
                </h2>
                <div 
                  id={`collapse${idx}`} 
                  className={`accordion-collapse collapse ${idx === 0 ? 'show' : ''}`} 
                  aria-labelledby={`heading${idx}`} 
                  data-bs-parent="#faqAccordion"
                >
                  <div className="accordion-body">
                    {item.a}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 9: Contact & CTA */}
      <section id="contact" className="py-5 bg-white">
        <div className="container py-4">
          <div className="bg-navy p-4 p-md-5 rounded-4 text-white text-center position-relative overflow-hidden">
            <div className="position-relative z-1" style={{ maxWidth: '640px', margin: '0 auto' }}>
              <h2 className="display-6 fw-bold mb-3 text-white">Ready to Modernize Your Automotive Workshop?</h2>
              <p className="lead text-light opacity-75 mb-4 fs-6">
                Start managing appointments, job cards, mechanics, inventory, and billing seamlessly today.
              </p>
              <div className="d-flex justify-content-center gap-3 flex-wrap">
                <button className="btn btn-orange btn-lg px-4" onClick={() => navigate('/register')}>
                  Create Free Account
                </button>
                <button className="btn btn-outline-light btn-lg px-4" onClick={() => navigate('/login')}>
                  Access Console
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 10: Footer */}
      <footer className="footer-section">
        <div className="container">
          <div className="row g-4 mb-5">
            <div className="col-lg-4">
              <div className="d-flex align-items-center gap-2 mb-3">
                <div className="bg-orange p-2 rounded-2 text-white d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
                  <FaCar size={16} />
                </div>
                <h5 className="mb-0 text-white fw-bold">GARAGE ERP</h5>
              </div>
              <p className="text-muted small pe-lg-4 mb-4">
                Enterprise workshop management software empowering automotive garages and dealerships to deliver premier service efficiency.
              </p>
              <div className="d-flex gap-2">
                <a href="#home" className="social-btn" aria-label="Facebook"><BsFacebook /></a>
                <a href="#home" className="social-btn" aria-label="Twitter"><BsTwitter /></a>
                <a href="#home" className="social-btn" aria-label="Instagram"><BsInstagram /></a>
                <a href="#home" className="social-btn" aria-label="LinkedIn"><BsLinkedin /></a>
              </div>
            </div>

            <div className="col-6 col-lg-2">
              <h5>Navigation</h5>
              <a href="#home">Home</a>
              <a href="#features">Features</a>
              <a href="#workflow">Workflow</a>
              <a href="#enterprise-value">Enterprise</a>
              <a href="#modules">ERP Modules</a>
            </div>

            <div className="col-6 col-lg-3">
              <h5>System Portals</h5>
              <Link to="/login">Administrator Console</Link>
              <Link to="/login">Service Advisor Desk</Link>
              <Link to="/login">Technician Workbench</Link>
              <Link to="/login">Customer Portal</Link>
              <Link to="/register">Create Account</Link>
            </div>

            <div className="col-lg-3">
              <h5>Support & Garage HQ</h5>
              <p className="text-muted small mb-2 d-flex align-items-center gap-2">
                <BsTelephone className="text-orange" /> +91 (800) 123-4567
              </p>
              <p className="text-muted small mb-2 d-flex align-items-center gap-2">
                <BsEnvelope className="text-orange" /> support@garageerp.com
              </p>
              <p className="text-muted small mb-0 d-flex align-items-center gap-2">
                <BsClock className="text-orange" /> Mon - Sat: 8:00 AM - 7:00 PM
              </p>
            </div>
          </div>

          <div className="pt-4 border-top border-secondary border-opacity-25 d-flex flex-column flex-md-row justify-content-between align-items-center gap-3 text-muted small">
            <div>
              &copy; {new Date().getFullYear()} Garage ERP. All rights reserved. Professional Automotive ERP.
            </div>
            <div className="d-flex gap-3">
              <a href="#home" className="text-muted">Privacy Policy</a>
              <a href="#home" className="text-muted">Terms of Service</a>
              <a href="#home" className="text-muted">Security</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
