import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  BsCalendarCheck, BsSpeedometer2, BsBoxSeam, BsReceipt, BsBuildings,
  BsCarFront, BsClockHistory, BsCardText, BsJournalText,
  BsShieldCheck, BsLightningCharge, BsGeoAlt, BsFileEarmarkText, BsCalendarPlus, BsCloudCheck,
  BsTelephone, BsEnvelope, BsClock, BsFacebook, BsTwitter, BsInstagram, BsLinkedin,
  BsArrowRight, BsChevronDown, BsCheckCircleFill
} from 'react-icons/bs';
import { FaCar, FaWrench, FaFileInvoiceDollar, FaUsers, FaBars, FaTimes, FaShieldAlt } from 'react-icons/fa';
import workshopHeroImg from '../assets/workshop_hero.jpg';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="landing-page">
      {/* SECTION 1: Top Navigation Bar */}
      <nav className={`navbar navbar-expand-lg fixed-top modern-navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="container">
          <Link className="navbar-brand d-flex align-items-center gap-2" to="/" onClick={closeMobileMenu}>
            <div className="brand-logo-icon">
              <FaCar size={17} />
            </div>
            <span className="brand-text">
              GARAGE <span className="brand-text-gold">ERP</span>
            </span>
          </Link>

          {/* Mobile Hamburger Toggle */}
          <button 
            className="navbar-toggler mobile-toggle-btn border-0 text-white" 
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
          </button>

          {/* Navigation Links & Action Buttons */}
          <div className={`collapse navbar-collapse ${mobileMenuOpen ? 'show' : ''}`} id="navbarNav">
            <ul className="navbar-nav mx-auto">
              <li className="nav-item">
                <a className="nav-link" href="#home" onClick={closeMobileMenu}>Home</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#features" onClick={closeMobileMenu}>Features</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#workflow" onClick={closeMobileMenu}>Workflow</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#enterprise-value" onClick={closeMobileMenu}>Enterprise</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#modules" onClick={closeMobileMenu}>ERP Modules</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#faq" onClick={closeMobileMenu}>FAQ</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#contact" onClick={closeMobileMenu}>Contact</a>
              </li>
            </ul>

            <div className="nav-action-buttons d-flex gap-2 align-items-center">
              <button 
                className="btn btn-ghost-dark btn-sm px-3" 
                onClick={() => { closeMobileMenu(); navigate('/login'); }}
              >
                Sign In
              </button>
              <button 
                className="btn btn-gold btn-sm px-3" 
                onClick={() => { closeMobileMenu(); navigate('/register'); }}
              >
                Register
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* SECTION 2: Hero Section */}
      <section id="home" className="hero-section">
        <div className="container">
          {/* Main Hero Outer Frame */}
          <div className="hero-outer-card">
            <div className="row g-0 align-items-stretch">
              {/* Left Column: Heading, Supporting Text, and CTA Buttons */}
              <div className="col-lg-7 col-xl-7 hero-content-col d-flex flex-column justify-content-center">
                <div className="hero-inner-padding">
                  <div className="hero-badge">
                    <span className="badge-dot"></span>
                    Automotive Service & Workshop ERP
                  </div>

                  <h1 className="hero-title">
                    Powering Modern <br />
                    <span className="hero-title-gold">Vehicle Workshops</span>
                  </h1>

                  <p className="hero-lead">
                    Streamline operations, improve efficiency, and deliver better service with our all-in-one garage ERP system.
                  </p>

                  <div className="hero-cta-group d-flex flex-wrap gap-3">
                    <button 
                      className="btn btn-gold btn-lg px-4 d-inline-flex align-items-center gap-2"
                      onClick={() => navigate('/register')}
                    >
                      <span>Get Started</span>
                      <BsArrowRight className="hero-arrow-icon" />
                    </button>
                    <button 
                      className="btn btn-outline-gold btn-lg px-4"
                      onClick={() => navigate('/login')}
                    >
                      Book Service
                    </button>
                  </div>

                  {/* Trust Micro-Metrics */}
                  <div className="hero-micro-metrics d-flex flex-wrap gap-4 pt-4 mt-3">
                    <div className="micro-metric-item">
                      <span className="micro-metric-val">5,000+</span>
                      <span className="micro-metric-lbl">Services Completed</span>
                    </div>
                    <div className="micro-metric-divider"></div>
                    <div className="micro-metric-item">
                      <span className="micro-metric-val">100%</span>
                      <span className="micro-metric-lbl">GST-Ready Invoicing</span>
                    </div>
                    <div className="micro-metric-divider"></div>
                    <div className="micro-metric-item">
                      <span className="micro-metric-val">99.4%</span>
                      <span className="micro-metric-lbl">Workshop Uptime</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Mechanic Working on Vehicle Image + Diagonal Separation + Vertical Message */}
              <div className="col-lg-5 col-xl-5 hero-visual-col position-relative">
                <div className="hero-image-wrapper">
                  <img 
                    src={workshopHeroImg} 
                    alt="Mechanic working on vehicle engine bay" 
                    className="hero-mechanic-img"
                  />
                  {/* Subtle Cinematic Overlays & Diagonal Gold Separator Line */}
                  <div className="hero-image-cinematic-overlay"></div>
                  <div className="hero-image-diagonal-mask"></div>
                  <div className="hero-diagonal-gold-line"></div>

                  {/* Right-Side Vertical Tagline Message */}
                  <div className="hero-vertical-tagline" aria-label="Brand Motto">
                    <div className="tagline-gold-line"></div>
                    <div className="tagline-text-wrap">
                      <span>Smart</span>
                      <span>Service</span>
                      <span>Stronger</span>
                      <span>Business</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Strip (5 Items Integrated Directly Below Hero Content) */}
            <div className="hero-feature-strip">
              <div className="feature-strip-grid">
                {/* 1. Appointment Scheduling */}
                <div className="feature-strip-card">
                  <div className="feature-strip-icon-box">
                    <BsCalendarCheck />
                  </div>
                  <div className="feature-strip-content">
                    <h4 className="feature-strip-title">Appointment Scheduling</h4>
                    <p className="feature-strip-desc">Smart appointment booking and scheduling.</p>
                  </div>
                </div>

                {/* 2. Live Workshop Tracking */}
                <div className="feature-strip-card">
                  <div className="feature-strip-icon-box">
                    <BsSpeedometer2 />
                  </div>
                  <div className="feature-strip-content">
                    <h4 className="feature-strip-title">Live Workshop Tracking</h4>
                    <p className="feature-strip-desc">Track workshop operations and mechanic availability.</p>
                  </div>
                </div>

                {/* 3. Inventory Management */}
                <div className="feature-strip-card">
                  <div className="feature-strip-icon-box">
                    <BsBoxSeam />
                  </div>
                  <div className="feature-strip-content">
                    <h4 className="feature-strip-title">Inventory Management</h4>
                    <p className="feature-strip-desc">Manage spare parts and stock levels.</p>
                  </div>
                </div>

                {/* 4. Tax Invoicing */}
                <div className="feature-strip-card">
                  <div className="feature-strip-icon-box">
                    <BsReceipt />
                  </div>
                  <div className="feature-strip-content">
                    <h4 className="feature-strip-title">Tax Invoicing</h4>
                    <p className="feature-strip-desc">Professional billing and GST-ready invoices.</p>
                  </div>
                </div>

                {/* 5. Multi-branch Support */}
                <div className="feature-strip-card">
                  <div className="feature-strip-icon-box">
                    <BsBuildings />
                  </div>
                  <div className="feature-strip-content">
                    <h4 className="feature-strip-title">Multi-branch Support</h4>
                    <p className="feature-strip-desc">Manage workshop operations efficiently.</p>
                  </div>
                </div>
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
          <div className="section-header-block text-center">
            <span className="section-tag">Workshop Features</span>
            <h2 className="section-title">
              Core Workshop <span className="gold-text">Features</span>
            </h2>
            <p className="section-subtitle">
              Complete end-to-end digital toolset engineered specifically for modern multi-brand garages.
            </p>
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
                  <div className="icon-box">
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
          <div className="section-header-block text-center">
            <span className="section-tag">Operational Flow</span>
            <h2 className="section-title">
              How Garage ERP <span className="gold-text">Works</span>
            </h2>
            <p className="section-subtitle">
              From initial booking to parts fulfillment, inspection, and customer invoice release.
            </p>
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
          <div className="section-header-block text-center">
            <span className="section-tag">Enterprise Value</span>
            <h2 className="section-title">
              Engineered for <span className="gold-text">Efficiency</span>
            </h2>
            <p className="section-subtitle">
              Enterprise-grade capabilities built for maximum uptime, accountability, and customer loyalty.
            </p>
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
                  <div className="icon-box flex-shrink-0 mb-0">
                    {feature.icon}
                  </div>
                  <div>
                    <h5 className="enterprise-value-title">{feature.title}</h5>
                    <p className="enterprise-value-desc">{feature.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 7: System Modules */}
      <section id="modules" className="modules-section">
        <div className="container py-4">
          <div className="section-header-block text-center">
            <span className="section-tag">All-In-One Platform</span>
            <h2 className="section-title">
              Core ERP <span className="gold-text">Modules</span>
            </h2>
            <p className="section-subtitle">
              Every component you need to operate a profitable automotive service facility.
            </p>
          </div>

          <div className="row g-4">
            {[
              { title: "Customer & Fleet CRM", icon: <FaUsers size={22} />, desc: "Maintain owner profiles, contact details, and multi-vehicle garage portfolios." },
              { title: "Workshop Job Cards", icon: <FaWrench size={22} />, desc: "Full digital work orders with common service selector and status lifecycles." },
              { title: "Spare Parts Inventory", icon: <BsBoxSeam size={22} />, desc: "Track stock, reorder thresholds, supplier pricing, and parts usage." },
              { title: "Financials & Billing", icon: <FaFileInvoiceDollar size={22} />, desc: "Tax invoices, digital payment gateway integration, and balance tracking." },
              { title: "Staff & Attendance", icon: <BsClock size={22} />, desc: "IST-based check-in/out logging, mechanic bay status, and payroll calculations." },
              { title: "Reports & Insights", icon: <BsSpeedometer2 size={22} />, desc: "Revenue analytics, service volume, parts consumption, and free service trends." }
            ].map((mod, idx) => (
              <div className="col-md-6 col-lg-4" key={idx}>
                <div className="enterprise-card module-card">
                  <div className="icon-box mb-3">{mod.icon}</div>
                  <h5 className="module-card-title">{mod.title}</h5>
                  <p className="module-card-desc">{mod.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 8: FAQ */}
      <section id="faq" className="faq-section">
        <div className="container" style={{ maxWidth: '880px' }}>
          <div className="section-header-block text-center">
            <span className="section-tag">Frequently Asked Questions</span>
            <h2 className="section-title">
              Got Questions? <span className="gold-text">We Have Answers</span>
            </h2>
          </div>

          <div className="accordion custom-dark-accordion" id="faqAccordion">
            {[
              { q: "How does the mechanic capacity booking work?", a: "The ERP automatically calculates available bay slots per hour based on mechanics checked in today. When capacity is fully booked, customers can join the live waiting queue." },
              { q: "Can customers track their vehicle repair status online?", a: "Yes. Customers have a dedicated portal where they can view live job card status, diagnostic notes, advisor recommendations, and past service history." },
              { q: "Does the billing module support online payments?", a: "Yes. Invoices support integrated Razorpay payment gateway checkout (UPI, cards, net banking) with instant verification and printable tax invoices." },
              { q: "How does the system handle employee attendance and payroll?", a: "Attendance is recorded in Indian Standard Time (IST). Staff members not explicitly marked check-in default to Present without fake work hours. Monthly payroll calculates earned salary accurately without penalizing future dates." }
            ].map((item, idx) => (
              <div className="accordion-item" key={idx}>
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

      {/* SECTION 9: Contact & CTA Banner */}
      <section id="contact" className="contact-cta-section">
        <div className="container">
          <div className="cta-banner-card">
            <div className="cta-banner-content text-center">
              <span className="section-tag mb-3">Get Started Today</span>
              <h2 className="cta-title">
                Ready to Modernize Your <span className="gold-text">Automotive Workshop?</span>
              </h2>
              <p className="cta-lead">
                Start managing appointments, job cards, mechanics, inventory, and billing seamlessly today.
              </p>
              <div className="d-flex justify-content-center gap-3 flex-wrap">
                <button 
                  className="btn btn-gold btn-lg px-4" 
                  onClick={() => navigate('/register')}
                >
                  Create Free Account
                </button>
                <button 
                  className="btn btn-outline-gold btn-lg px-4" 
                  onClick={() => navigate('/login')}
                >
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
                <div className="brand-logo-icon">
                  <FaCar size={16} />
                </div>
                <h5 className="mb-0 text-white fw-bold">
                  GARAGE <span className="gold-text">ERP</span>
                </h5>
              </div>
              <p className="footer-desc pe-lg-4 mb-4">
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
              <h5 className="footer-heading">Navigation</h5>
              <a href="#home" className="footer-link">Home</a>
              <a href="#features" className="footer-link">Features</a>
              <a href="#workflow" className="footer-link">Workflow</a>
              <a href="#enterprise-value" className="footer-link">Enterprise</a>
              <a href="#modules" className="footer-link">ERP Modules</a>
            </div>

            <div className="col-6 col-lg-3">
              <h5 className="footer-heading">System Portals</h5>
              <Link to="/login" className="footer-link">Administrator Console</Link>
              <Link to="/login" className="footer-link">Service Advisor Desk</Link>
              <Link to="/login" className="footer-link">Technician Workbench</Link>
              <Link to="/login" className="footer-link">Customer Portal</Link>
              <Link to="/register" className="footer-link">Create Account</Link>
            </div>

            <div className="col-lg-3">
              <h5 className="footer-heading">Support & Garage HQ</h5>
              <p className="footer-contact-item">
                <BsTelephone className="gold-text" /> +91 (800) 123-4567
              </p>
              <p className="footer-contact-item">
                <BsEnvelope className="gold-text" /> support@garageerp.com
              </p>
              <p className="footer-contact-item">
                <BsClock className="gold-text" /> Mon - Sat: 8:00 AM - 7:00 PM
              </p>
            </div>
          </div>

          <div className="footer-bottom-bar d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
            <div>
              &copy; {new Date().getFullYear()} Garage ERP. All rights reserved. Professional Automotive ERP.
            </div>
            <div className="d-flex gap-4">
              <a href="#home" className="footer-sub-link">Privacy Policy</a>
              <a href="#home" className="footer-sub-link">Terms of Service</a>
              <a href="#home" className="footer-sub-link">Security</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
