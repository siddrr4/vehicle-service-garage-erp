import React, { useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ForgotPassword from './components/Auth/ForgotPassword';
import ResetPassword from './components/Auth/ResetPassword';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import Layout from './components/Layout/Layout';
import { AuthContext } from './context/AuthContext';

// Pages
import LandingPage from './pages/LandingPage';
import CustomerList from './pages/Customer/CustomerList';
import AddCustomer from './pages/Customer/AddCustomer';
import EditCustomer from './pages/Customer/EditCustomer';
import CustomerProfile from './pages/Customer/CustomerProfile';
import VehicleList from './pages/Vehicle/VehicleList';
import VehicleRegistration from './pages/Vehicle/VehicleRegistration';
import EditVehicle from './pages/Vehicle/EditVehicle';
import VehicleDetails from './pages/Vehicle/VehicleDetails';
import AdminDashboard from './pages/Dashboard/AdminDashboard';
import CustomerDashboard from './pages/Dashboard/CustomerDashboard';
import MechanicDashboard from './pages/Dashboard/MechanicDashboard';
import MyVehicles from './pages/Customer/MyVehicles';
import RequestService from './pages/Customer/RequestService';
import MyRequests from './pages/Customer/MyRequests';
import ServiceRequests from './pages/Appointment/ServiceRequests';

// Appointment Pages
import AppointmentList from './pages/Appointment/AppointmentList';
import BookAppointment from './pages/Appointment/BookAppointment';
import EditAppointment from './pages/Appointment/EditAppointment';
import AppointmentDetails from './pages/Appointment/AppointmentDetails';
import WaitingQueue from './pages/Appointment/WaitingQueue';
import WalkInService from './pages/Appointment/WalkInService';

// Job Card Pages
import JobCardList from './pages/JobCard/JobCardList';
import JobCardForm from './pages/JobCard/JobCardForm';
import MyJobCards from './pages/JobCard/MyJobCards';

// Employee & Attendance Pages
import EmployeeList from './pages/Employee/EmployeeList';
import MechanicAttendance from './pages/Attendance/MechanicAttendance';
import AdminAttendance from './pages/Attendance/AdminAttendance';
import MechanicProfile from './pages/Mechanic/MechanicProfile';

// Salary & Payroll Pages
import SalaryManagement from './pages/Salary/SalaryManagement';
import PayrollList from './pages/Payroll/PayrollList';
import PayslipView from './pages/Payroll/PayslipView';
import MyPayslips from './pages/Payroll/MyPayslips';

// Inventory, Billing & Invoice Pages
import InventoryList from './pages/Inventory/InventoryList';
import SparePartRequestsList from './pages/Inventory/SparePartRequestsList';
import BillingList from './pages/Billing/BillingList';
import InvoiceDetails from './pages/Billing/InvoiceDetails';
import PaymentSuccess from './pages/Billing/PaymentSuccess';
import PaymentFailure from './pages/Billing/PaymentFailure';
import JobCardDetails from './pages/JobCard/JobCardDetails';

// Service History Pages
import ServiceHistoryList from './pages/ServiceHistory/ServiceHistoryList';
import ServiceHistoryDetails from './pages/ServiceHistory/ServiceHistoryDetails';

// Reports
import ReportsDashboard from './pages/Reports/ReportsDashboard';
import SettingsPage from './pages/Settings/SettingsPage';
import Notifications from './pages/Notifications';
import InsuranceRenewal from './pages/Insurance/InsuranceRenewal';

const DashboardRedirect = () => {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin-dashboard" replace />;
  if (user.role === 'advisor') return <Navigate to="/admin-dashboard" replace />;
  if (user.role === 'mechanic') return <Navigate to="/mechanic-dashboard" replace />;
  return <Navigate to="/customer-dashboard" replace />;
};

const PlaceholderPage = ({ title }) => (
  <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
    <div className="text-center">
      <h3 className="fw-bold text-muted mb-3">{title}</h3>
      <p className="text-secondary">This page is currently under construction.</p>
    </div>
  </div>
);

function App() {
  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/" element={<LandingPage />} />

        {/* Protected Routes inside Layout */}
        <Route element={<Layout />}>
          {/* Base Protected Route (Logged in users only) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardRedirect />} />
            <Route path="/customer-dashboard" element={<CustomerDashboard />} />
            <Route path="/my-vehicles" element={<MyVehicles />} />
            <Route path="/request-service" element={<RequestService />} />
            <Route path="/my-requests" element={<MyRequests />} />
            <Route path="/vehicles/:id" element={<VehicleDetails />} />
            <Route path="/my-job-cards" element={<MyJobCards />} />
            <Route path="/job-cards/:id" element={<JobCardDetails />} />
            <Route path="/billing/invoice/:id" element={<InvoiceDetails />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/payment-failure" element={<PaymentFailure />} />
            <Route path="/service-history" element={<ServiceHistoryList />} />
            <Route path="/service-history/:id" element={<ServiceHistoryDetails />} />
            <Route path="/payslips/:id" element={<PayslipView />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/insurance-renewal/:vehicleId" element={<InsuranceRenewal />} />
          </Route>
          
          {/* Mechanic Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['mechanic', 'admin', 'advisor']} />}>
            <Route path="/mechanic-dashboard" element={<MechanicDashboard />} />
            <Route path="/mechanic-attendance" element={<MechanicAttendance />} />
            <Route path="/mechanic-jobs" element={<MechanicDashboard />} />
            <Route path="/mechanic-completed-jobs" element={<MechanicDashboard />} />
            <Route path="/mechanic-profile" element={<MechanicProfile />} />
            <Route path="/my-payslips" element={<MyPayslips />} />
          </Route>

          {/* Admin & Advisor Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin', 'advisor']} />}>
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            
            {/* Customer Routes */}
            <Route path="/customers" element={<CustomerList />} />
            <Route path="/customers/add" element={<AddCustomer />} />
            <Route path="/customers/edit/:id" element={<EditCustomer />} />
            <Route path="/customers/:id" element={<CustomerProfile />} />
            
            {/* Vehicle Routes */}
            <Route path="/vehicles" element={<VehicleList />} />
            <Route path="/vehicles/add" element={<VehicleRegistration />} />
            <Route path="/vehicles/edit/:id" element={<EditVehicle />} />
 
            {/* Appointment Routes */}
            <Route path="/appointments" element={<AppointmentList />} />
            <Route path="/walk-in" element={<WalkInService />} />
            <Route path="/waiting-queue" element={<WaitingQueue />} />
            <Route path="/service-requests" element={<ServiceRequests />} />
            <Route path="/appointments/book" element={<BookAppointment />} />
            <Route path="/appointments/edit/:id" element={<EditAppointment />} />
            <Route path="/appointments/:id" element={<AppointmentDetails />} />

            {/* Job Card Routes */}
            <Route path="/job-cards" element={<JobCardList />} />
            <Route path="/job-cards/add" element={<JobCardForm />} />
            <Route path="/job-cards/edit/:id" element={<JobCardForm />} />

            {/* Employee Management Routes */}
            <Route path="/employees" element={<EmployeeList />} />
            <Route path="/admin-attendance" element={<AdminAttendance />} />
            <Route path="/salary" element={<SalaryManagement />} />
            <Route path="/payroll" element={<PayrollList />} />

            {/* Inventory Routes */}
            <Route path="/inventory" element={<InventoryList />} />
            <Route path="/parts-requests" element={<SparePartRequestsList />} />

            {/* Billing Routes */}
            <Route path="/billing" element={<BillingList />} />

            {/* Sidebar Items */}
            <Route path="/reports" element={<ReportsDashboard />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}

export default App;
