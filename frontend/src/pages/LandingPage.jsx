import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  BsCarFront, BsCalendarCheck, BsClockHistory, BsCardText, BsReceipt, BsJournalText,
  BsShieldCheck, BsLightningCharge, BsGeoAlt, BsFileEarmarkText, BsCalendarPlus, BsCloudCheck,
  BsPeople, BsBox, BsClipboardData, BsBell, BsStarFill, BsTelephone, BsEnvelope,
  BsClock, BsFacebook, BsTwitter, BsInstagram, BsLinkedin, BsArrowRight, BsCheckCircleFill
} from 'react-icons/bs';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  return (
    <div className="landing-page cyber-bg-black cyber-grid">
      {/* SECTION 1: Navbar */}
      <nav className={`navbar navbar-expand-lg fixed-top modern-navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="container">
          <Link className="navbar-brand fw-bold fs-4 d-flex align-items-center gap-2 text-white" to="/">
            <span>//</span> GarageERP
          </Link>
          <button className="navbar-toggler border-0 text-white" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
            <span className="navbar-toggler-icon" style={{filter: 'invert(1)'}}></span>
          </button>
          
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav mx-auto">
              <li className="nav-item"><a className="nav-link" href="#home">Home</a></li>
              <li className="nav-item"><a className="nav-link" href="#services">Services</a></li>
              <li className="nav-item"><a className="nav-link" href="#features">Features</a></li>
              <li className="nav-item"><a className="nav-link" href="#about">About</a></li>
              <li className="nav-item"><a className="nav-link" href="#contact">Contact</a></li>
            </ul>
            <div className="d-flex gap-3 align-items-center">
              <button className="btn btn-cyber-outline py-2 px-4" onClick={() => navigate('/login')}>Login</button>
              <button className="btn btn-cyber-solid py-2 px-4" onClick={() => navigate('/register')}>Register</button>
            </div>
          </div>
        </div>
      </nav>

      {/* SECTION 2: Hero */}
      <section id="home" className="hero-section position-relative overflow-hidden cyber-bg-black">
        <div className="container position-relative z-1">
          <div className="row align-items-center min-vh-100 pt-5">
            <div className="col-lg-6 mb-5 mb-lg-0 hero-content text-start">
              <h1 className="display-4 fw-black text-white mb-4 hero-title">
                Smart Vehicle Service &<br/>
                Garage Management ERP
              </h1>
              <p className="lead text-secondary mb-5 pe-lg-5">
                Manage your vehicles, appointments, repairs, billing, service history and customer communication from one powerful, high-contrast digital console.
              </p>
              <div className="d-flex flex-wrap gap-3">
                <button className="btn btn-cyber-solid btn-lg" onClick={() => navigate('/register')}>
                  Get Started _
                </button>
                <button className="btn btn-cyber-outline btn-lg" onClick={() => navigate('/register')}>
                  Book Service
                </button>
              </div>
            </div>
            <div className="col-lg-6 text-center">
              <div className="position-relative p-2 hero-image-wrapper">
                <img 
                  src="https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                  alt="Minimal Cyber Garage" 
                  className="img-fluid hero-main-img"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: Statistics */}
      <section className="stats-section py-5 cyber-bg-black position-relative z-2">
        <div className="container">
          <div className="row g-4 text-center">
            {[
              { num: "5000+", label: "Services Completed" },
              { num: "3000+", label: "Customers" },
              { num: "1500+", label: "Vehicles Managed" },
              { num: "99%", label: "Satisfaction" }
            ].map((stat, index) => (
              <div className="col-6 col-md-3" key={index}>
                <div className="stat-card p-4">
                  <h2 className="display-5 fw-bold text-white mb-2 mono">{stat.num}</h2>
                  <p className="text-secondary fw-medium mb-0 text-uppercase tracking-wider small">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4: Our Services */}
      <section id="services" className="services-section py-6 cyber-bg-dark">
        <div className="container">
          <div className="text-center mb-5 max-w-700 mx-auto">
            <div className="mono text-white tracking-wider mb-2">// CORE OPERATIONS</div>
            <h2 className="display-5 fw-black text-white mb-3">Our Services</h2>
            <p className="text-secondary lead">Robust system models optimized for absolute digital utility.</p>
          </div>
          
          <div className="row g-4">
            {[
              { icon: <BsCarFront />, title: "Vehicle Registration", desc: "Easily register and manage customer vehicles with complete details." },
              { icon: <BsCalendarCheck />, title: "Appointment Booking", desc: "Seamlessly book services and track real-time status updates." },
              { icon: <BsCardText />, title: "Job Card Management", desc: "Digital job cards to track repairs, mechanics, and parts used." },
              { icon: <BsClockHistory />, title: "Vehicle Repair Tracking", desc: "Monitor repair progress in real-time and notify customers." },
              { icon: <BsReceipt />, title: "Billing & Invoice", desc: "Automated and accurate billing with instant digital invoices." },
              { icon: <BsJournalText />, title: "Service History", desc: "Complete historical records of all vehicle repairs and maintenance." }
            ].map((service, idx) => (
              <div className="col-md-6 col-lg-4" key={idx}>
                <div className="cyber-card p-4 h-100 text-center text-white">
                  <div className="text-white mb-4 fs-1">
                    {service.icon}
                  </div>
                  <h4 className="fw-bold mb-3 text-white text-uppercase tracking-wider small">{service.title}</h4>
                  <p className="text-secondary mb-0 small">{service.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5: How It Works */}
      <section className="workflow-section py-6 cyber-bg-black">
        <div className="container">
          <div className="text-center mb-5">
            <div className="mono text-white tracking-wider mb-2">// PIPELINE LOG</div>
            <h2 className="display-5 fw-black text-white mb-3">How It Works</h2>
            <p className="text-secondary lead max-w-700 mx-auto">Step-by-step telemetry from registration to service output.</p>
          </div>

          <div className="horizontal-timeline px-3 py-5 position-relative">
            <div className="timeline-line"></div>
            <div className="d-flex flex-nowrap overflow-auto pb-4 custom-scrollbar gap-4 justify-content-between">
              {[
                { title: "Customer Register", icon: <BsPeople /> },
                { title: "Login", icon: <BsShieldCheck /> },
                { title: "Register Vehicle", icon: <BsCarFront /> },
                { title: "Book Appointment", icon: <BsCalendarPlus /> },
                { title: "Admin Approval", icon: <BsCheckCircleFill /> },
                { title: "Job Card", icon: <BsCardText /> },
                { title: "Repair", icon: <BsBox /> },
                { title: "Billing", icon: <BsReceipt /> },
                { title: "Service History", icon: <BsJournalText /> }
              ].map((step, idx) => (
                <div className="timeline-step text-center position-relative" key={idx}>
                  <div className="timeline-icon-box d-flex align-items-center justify-content-center mx-auto mb-3 fs-4">
                    {step.icon}
                  </div>
                  <h6 className="fw-bold text-white mb-0 text-nowrap px-2 small tracking-wider mono">{step.title}</h6>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: Why Choose Us */}
      <section id="features" className="why-choose-section py-6 cyber-bg-dark">
        <div className="container">
          <div className="text-center mb-5">
            <div className="mono text-white tracking-wider mb-2">// SPECIFICATIONS</div>
            <h2 className="display-5 fw-black text-white mb-3">Why Choose Us</h2>
          </div>
          <div className="row g-4">
            {[
              { icon: <BsCalendarPlus />, title: "Online Appointment" },
              { icon: <BsGeoAlt />, title: "Real-time Tracking" },
              { icon: <BsShieldCheck />, title: "Secure Login" },
              { icon: <BsFileEarmarkText />, title: "Digital Records" },
              { icon: <BsLightningCharge />, title: "Fast Billing" },
              { icon: <BsCloudCheck />, title: "Cloud Database" }
            ].map((feature, idx) => (
              <div className="col-md-6 col-lg-4" key={idx}>
                <div className="cyber-card d-flex align-items-center p-4 gap-4 text-white">
                  <div className="text-white fs-3 d-flex">
                    {feature.icon}
                  </div>
                  <h5 className="fw-bold mb-0 text-uppercase tracking-wider small">{feature.title}</h5>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 7: ERP Modules */}
      <section className="modules-section py-6 cyber-bg-black position-relative overflow-hidden">
        <div className="container position-relative z-1">
          <div className="text-center mb-5">
            <h2 className="display-5 fw-black mb-3 text-white">System Modules</h2>
            <p className="lead text-secondary max-w-700 mx-auto">Explore targeted system consoles for maximum enterprise coordination.</p>
          </div>
          
          <div className="row g-4">
            {[
              { icon: <BsPeople />, title: "Customer Management" },
              { icon: <BsCarFront />, title: "Vehicle Management" },
              { icon: <BsCalendarCheck />, title: "Appointment Management" },
              { icon: <BsCardText />, title: "Job Cards" },
              { icon: <BsPeople />, title: "Mechanic Management" },
              { icon: <BsBox />, title: "Inventory" },
              { icon: <BsReceipt />, title: "Billing" },
              { icon: <BsClipboardData />, title: "Reports" },
              { icon: <BsBell />, title: "Notifications" }
            ].map((module, idx) => (
              <div className="col-md-6 col-lg-4" key={idx}>
                <div className="module-card p-4 text-center h-100 transition-all cyber-card">
                  <div className="text-white fs-1 mb-3">{module.icon}</div>
                  <h4 className="fw-bold mb-0 text-white text-uppercase tracking-wider small">{module.title}</h4>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 8: Customer Testimonials */}
      <section className="testimonials-section py-6 cyber-bg-dark">
        <div className="container">
          <div className="text-center mb-5">
            <div className="mono text-white tracking-wider mb-2">// LOGS: USER_FEEDBACK</div>
            <h2 className="display-5 fw-black text-white mb-3">User Testimonials</h2>
          </div>
          
          <div className="row g-4">
            {[
              { text: "This ERP has completely revolutionized how we run our garage. The job card management is flawless.", name: "Alex Turner", role: "Garage Owner" },
              { text: "Billing used to take hours, now it's done in clicks. Excellent system and great customer support.", name: "Samantha Lee", role: "Service Manager" },
              { text: "Our customers love the real-time tracking feature. It builds trust and keeps everyone informed.", name: "David Johnson", role: "Lead Mechanic" }
            ].map((review, idx) => (
              <div className="col-md-4" key={idx}>
                <div className="cyber-card p-5 h-100 text-white">
                  <div className="text-white mb-3 fs-6">
                    <BsStarFill/><BsStarFill/><BsStarFill/><BsStarFill/><BsStarFill/>
                  </div>
                  <p className="fst-italic text-secondary mb-4 small">"{review.text}"</p>
                  <div className="d-flex align-items-center gap-3">
                    <div className="avatar bg-white text-dark d-flex align-items-center justify-content-center fw-bold fs-6" style={{width:'40px', height:'40px'}}>
                      {review.name.charAt(0)}
                    </div>
                    <div>
                      <h6 className="fw-bold mb-0 text-white text-uppercase small">{review.name}</h6>
                      <small className="text-muted tracking-wider mono small" style={{fontSize: '0.75rem'}}>{review.role}</small>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 9: Frequently Asked Questions */}
      <section className="faq-section py-6 cyber-bg-black" id="about">
        <div className="container max-w-800" style={{maxWidth: '800px', margin: '0 auto'}}>
          <div className="text-center mb-5">
            <div className="mono text-white tracking-wider mb-2">// KNOWLEDGE_BASE</div>
            <h2 className="display-5 fw-black text-white mb-3">FAQ Accordion</h2>
          </div>
          <div className="accordion custom-accordion" id="faqAccordion">
            {[
              { q: "How secure is the cloud database?", a: "We use enterprise-grade encryption and secure servers to ensure all your customer and business data is completely safe and backed up daily." },
              { q: "Can I manage multiple mechanics?", a: "Yes, our Mechanic Management module allows you to assign mechanics to specific job cards and track their performance easily." },
              { q: "Is the billing system customizable?", a: "Absolutely. You can add your logo, custom tax rates, and specific terms to all generated invoices." },
              { q: "Does it support mobile devices?", a: "Our platform is fully responsive and can be accessed from any smartphone, tablet, or desktop computer." }
            ].map((faq, idx) => (
              <div className="accordion-item mb-3" key={idx}>
                <h2 className="accordion-header">
                  <button 
                    className={`accordion-button fw-bold bg-transparent shadow-none ${activeFaq === idx ? '' : 'collapsed'}`} 
                    type="button" 
                    onClick={() => toggleFaq(idx)}
                  >
                    {faq.q}
                  </button>
                </h2>
                <div className={`accordion-collapse collapse ${activeFaq === idx ? 'show' : ''}`}>
                  <div className="accordion-body text-secondary fs-6 pt-0 pb-4 px-4">
                    {faq.a}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 10: Contact */}
      <section id="contact" className="contact-section py-6 cyber-bg-dark">
        <div className="container">
          <div className="row g-5 align-items-center">
            <div className="col-lg-5 text-start">
              <h2 className="display-5 fw-black text-white mb-4">Get In Touch</h2>
              <p className="lead text-secondary mb-5">Have questions or need custom integrations? Contact our command center.</p>
              
              <div className="d-flex flex-column gap-4">
                <div className="d-flex gap-4 align-items-center p-3 cyber-card text-white">
                  <div className="text-white fs-4 d-flex"><BsGeoAlt/></div>
                  <div>
                    <h5 className="fw-bold mb-1 tracking-wider small">Address</h5>
                    <p className="text-secondary mb-0 small">123 Garage Ave, Auto City, AC 10001</p>
                  </div>
                </div>
                <div className="d-flex gap-4 align-items-center p-3 cyber-card text-white">
                  <div className="text-white fs-4 d-flex"><BsTelephone/></div>
                  <div>
                    <h5 className="fw-bold mb-1 tracking-wider small">Phone</h5>
                    <p className="text-secondary mb-0 small">+1 (555) 123-4567</p>
                  </div>
                </div>
                <div className="d-flex gap-4 align-items-center p-3 cyber-card text-white">
                  <div className="text-white fs-4 d-flex"><BsClock/></div>
                  <div>
                    <h5 className="fw-bold mb-1 tracking-wider small">Working Hours</h5>
                    <p className="text-secondary mb-0 small">Mon - Fri: 8 AM - 6 PM</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-7">
              <div className="p-5 cyber-card text-white">
                <form className="row g-4">
                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-uppercase tracking-wider">Full Name</label>
                    <input type="text" className="form-control form-control-lg px-4" placeholder="John Doe" />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-uppercase tracking-wider">Email Address</label>
                    <input type="email" className="form-control form-control-lg px-4" placeholder="john@example.com" />
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-bold small text-uppercase tracking-wider">Subject</label>
                    <input type="text" className="form-control form-control-lg px-4" placeholder="Request details..." />
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-bold small text-uppercase tracking-wider">Message</label>
                    <textarea className="form-control form-control-lg px-4" rows="4" placeholder="Enter transmission..."></textarea>
                  </div>
                  <div className="col-12 mt-4">
                    <button type="button" className="btn btn-cyber-solid btn-lg w-100">Send Transmission</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 11: Footer */}
      <footer className="footer-section cyber-bg-black text-white pt-6 pb-4 position-relative">
        <div className="container">
          <div className="row g-5 mb-5">
            <div className="col-lg-4 text-start">
              <Link className="navbar-brand fw-bold fs-3 d-flex align-items-center gap-2 text-white mb-4 text-decoration-none" to="/">
                <span>//</span> GarageERP
              </Link>
              <p className="text-secondary pe-lg-4 lh-lg small">
                Enterprise telemetry system to manage your garage operations with terminal-grade precision.
              </p>
              <div className="d-flex gap-3 mt-4">
                <a href="#" className="social-circle d-flex align-items-center justify-content-center text-decoration-none transition-all"><BsFacebook/></a>
                <a href="#" className="social-circle d-flex align-items-center justify-content-center text-decoration-none transition-all"><BsTwitter/></a>
                <a href="#" className="social-circle d-flex align-items-center justify-content-center text-decoration-none transition-all"><BsInstagram/></a>
                <a href="#" className="social-circle d-flex align-items-center justify-content-center text-decoration-none transition-all"><BsLinkedin/></a>
              </div>
            </div>
            <div className="col-lg-2 col-md-4 text-start">
              <h5 className="fw-bold mb-4 text-white text-uppercase tracking-wider small">Quick Links</h5>
              <ul className="list-unstyled d-flex flex-column gap-3 small">
                <li><a href="#home" className="text-secondary text-decoration-none hover-white transition-all">Home</a></li>
                <li><a href="#about" className="text-secondary text-decoration-none hover-white transition-all">About Us</a></li>
                <li><a href="#features" className="text-secondary text-decoration-none hover-white transition-all">Features</a></li>
                <li><a href="#contact" className="text-secondary text-decoration-none hover-white transition-all">Contact</a></li>
              </ul>
            </div>
            <div className="col-lg-2 col-md-4 text-start">
              <h5 className="fw-bold mb-4 text-white text-uppercase tracking-wider small">Services</h5>
              <ul className="list-unstyled d-flex flex-column gap-3 small">
                <li><a href="#" className="text-secondary text-decoration-none hover-white transition-all">Job Cards</a></li>
                <li><a href="#" className="text-secondary text-decoration-none hover-white transition-all">Appointments</a></li>
                <li><a href="#" className="text-secondary text-decoration-none hover-white transition-all">Billing</a></li>
                <li><a href="#" className="text-secondary text-decoration-none hover-white transition-all">Inventory</a></li>
              </ul>
            </div>
            <div className="col-lg-4 col-md-4 text-start">
              <h5 className="fw-bold mb-4 text-white text-uppercase tracking-wider small">Newsletter</h5>
              <p className="text-secondary mb-4 lh-lg small">Receive scheduled system updates.</p>
              <div className="input-group">
                <input type="email" className="form-control border-0" placeholder="Console Email" />
                <button className="btn btn-cyber-solid px-4" type="button">Subscribe</button>
              </div>
            </div>
          </div>
          <div className="border-top border-secondary pt-4 mt-4 d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
            <p className="text-secondary mb-0 small">&copy; {new Date().getFullYear()} GarageERP. Core Terminals Activated.</p>
            <div className="d-flex gap-4 small">
              <a href="#" className="text-secondary text-decoration-none hover-white transition-all">Privacy Policy</a>
              <a href="#" className="text-secondary text-decoration-none hover-white transition-all">Terms & Conditions</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
