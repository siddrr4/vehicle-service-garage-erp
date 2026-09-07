import React, { useState, useEffect, useMemo } from 'react';
import { 
  FaDownload, FaExclamationTriangle, FaSearch, FaAngleRight, 
  FaRegFrownOpen, FaCheckCircle, FaTools, FaFileInvoiceDollar,
  FaSyncAlt, FaCar, FaUserPlus, FaUsers, FaBoxes, FaGift,
  FaClock, FaCheckDouble, FaExclamationCircle, FaShieldAlt
} from 'react-icons/fa';
import reportService from '../../services/reportService';
import { toast } from 'react-toastify';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import './ReportsDashboard.css';

// Helper to format currency in Indian numbering (e.g. ₹1,20,000)
const formatCurrency = (val) => {
  const num = Number(val);
  if (isNaN(num) || num === null || num === undefined) return '₹0';
  return `₹${Math.max(0, Math.round(num)).toLocaleString('en-IN')}`;
};

// Subcomponents for Empty and Loading States
const Skeleton = ({ height = '20px', width = '100%', className = '' }) => (
  <div className={`skeleton-pulse rounded ${className}`} style={{ height, width }}></div>
);

const EmptyState = ({ title = "No data available", message = "There is no data for the selected period." }) => (
  <div className="empty-state-box">
    <div className="empty-state-icon"><FaRegFrownOpen size={36} /></div>
    <h6 className="fw-bold mb-1">{title}</h6>
    <small style={{ maxWidth: '300px' }}>{message}</small>
  </div>
);

const ErrorState = ({ onRetry }) => (
  <div className="empty-state-box">
    <div className="empty-state-icon text-danger"><FaExclamationTriangle size={36} /></div>
    <h6 className="fw-bold mb-1 text-danger">Unable to load report data</h6>
    <small className="text-muted mb-2">Please check your network connection or server status.</small>
    {onRetry && <button className="btn btn-sm btn-outline-danger mt-1" onClick={onRetry}>Retry</button>}
  </div>
);

const ReportsDashboard = () => {
  // Filters - Default to 'thisYear' so all services and invoices completed in the current year show immediately
  const [dateRange, setDateRange] = useState('thisYear');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [activeTab, setActiveTab] = useState('revenue');
  const [searchTerm, setSearchTerm] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  // Data State
  const initialState = { data: null, loading: true, error: false };
  const [summary, setSummary] = useState({ ...initialState, data: {} });
  const [revenue, setRevenue] = useState(initialState);
  const [services, setServices] = useState(initialState);
  const [mechanics, setMechanics] = useState({ ...initialState, data: [] });
  const [inventory, setInventory] = useState(initialState);
  const [freeServices, setFreeServices] = useState({ ...initialState, data: {} });
  const [payments, setPayments] = useState({ ...initialState, data: {} });
  const [customersVehicles, setCustomersVehicles] = useState(initialState);

  const STATUS_COLORS = {
    'Pending': '#f59e0b',
    'Assigned': '#3b82f6',
    'In Progress': '#e65c00',
    'Waiting for Parts': '#dc2626',
    'Completed': '#10b981',
    'Delivered': '#059669',
    'Cancelled': '#64748b'
  };

  const PIE_COLORS = ['#1A237E', '#10b981', '#f59e0b', '#dc2626', '#3b82f6', '#8b5cf6', '#059669', '#64748b'];

  // Calculate Start and End dates based on selected range
  const calculateDateRange = () => {
    const now = new Date();
    let start = new Date(now);
    let end = new Date(now);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (dateRange === 'today') {
      return { start: start.toISOString(), end: end.toISOString() };
    }
    if (dateRange === 'thisWeek') {
      const dayOfWeek = start.getDay(); // 0 is Sunday
      const diff = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday
      start.setDate(diff);
      return { start: start.toISOString(), end: end.toISOString() };
    }
    if (dateRange === 'thisMonth') {
      start.setDate(1);
      return { start: start.toISOString(), end: end.toISOString() };
    }
    if (dateRange === 'lastMonth') {
      // First day of last month
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      // Last day of last month
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { start: firstDayLastMonth.toISOString(), end: lastDayLastMonth.toISOString() };
    }
    if (dateRange === 'thisYear') {
      start.setMonth(0, 1);
      return { start: start.toISOString(), end: end.toISOString() };
    }
    if (dateRange === 'allTime') {
      return { start: null, end: null };
    }
    if (dateRange === 'custom') {
      if (customStart && customEnd) {
        const cStart = new Date(customStart);
        cStart.setHours(0, 0, 0, 0);
        const cEnd = new Date(customEnd);
        cEnd.setHours(23, 59, 59, 999);
        return { start: cStart.toISOString(), end: cEnd.toISOString() };
      }
    }
    return { start: null, end: null };
  };

  const fetchSection = async (fetchFn, setFn, start, end) => {
    try {
      setFn(prev => ({ ...prev, loading: true, error: false }));
      const result = await fetchFn(start, end);
      setFn({ data: result, loading: false, error: false });
    } catch (error) {
      console.error('Error fetching report section:', error);
      setFn(prev => ({ ...prev, loading: false, error: true }));
    }
  };

  const fetchReports = () => {
    const { start, end } = calculateDateRange();
    if (dateRange === 'custom' && (!start || !end)) return;
    
    fetchSection(reportService.getSummary, setSummary, start, end);
    fetchSection(reportService.getRevenueAnalytics, setRevenue, start, end);
    fetchSection(reportService.getServiceAnalytics, setServices, start, end);
    fetchSection(reportService.getMechanicAnalytics, setMechanics, start, end);
    fetchSection(reportService.getInventoryAnalytics, setInventory, start, end);
    fetchSection(reportService.getFreeServiceAnalytics, setFreeServices, start, end);
    fetchSection(reportService.getPaymentAnalytics, setPayments, start, end);
    fetchSection(reportService.getCustomerVehicleAnalytics, setCustomersVehicles, start, end);
  };

  useEffect(() => {
    if (dateRange !== 'custom' || (customStart && customEnd)) {
      fetchReports();
    }
  }, [dateRange, customStart, customEnd]);

  // CSV Export Functionality (Requirement 13)
  const handleExportCSV = (reportType) => {
    let targetData = [];
    let headers = [];
    let filename = '';

    if (reportType === 'revenue') {
      const rows = revenue.data?.detailedData || [];
      if (!rows.length) return toast.warning('No revenue data available for export');
      
      headers = [
        'Date',
        'Invoice Number',
        'Customer',
        'Vehicle',
        'Labour Charges',
        'Washing Charges',
        'Parts Charges',
        'Invoice Total (Billed)',
        'Amount Paid (Collected)',
        'Balance Due (Pending)',
        'Payment Status'
      ];
      
      targetData = rows.map(inv => [
        new Date(inv.createdAt).toLocaleDateString(),
        inv.invoiceNumber || 'N/A',
        `"${inv.customer?.fullName || 'N/A'}"`,
        `"${inv.vehicle?.vehicleNumber || 'N/A'}"`,
        inv.totalLabour || 0,
        inv.totalWashing || 0,
        inv.totalParts || 0,
        inv.grandTotal || 0,
        inv.amountPaid || 0,
        inv.balanceDue || 0,
        inv.status || 'Unpaid'
      ]);
      filename = 'Revenue_and_Billing_Report';

    } else if (reportType === 'services') {
      const rows = services.data?.detailedData || [];
      if (!rows.length) return toast.warning('No service data available for export');
      
      headers = [
        'Job Number',
        'Date',
        'Customer',
        'Vehicle',
        'Service Type',
        'Mechanic',
        'Priority',
        'Status'
      ];
      
      targetData = rows.map(srv => [
        srv.jobNumber || 'N/A',
        new Date(srv.createdAt).toLocaleDateString(),
        `"${srv.customer?.fullName || 'N/A'}"`,
        `"${srv.vehicle?.vehicleNumber || 'N/A'}"`,
        `"${srv.serviceType || 'General'}"`,
        `"${srv.assignedMechanic?.fullName || 'Unassigned'}"`,
        srv.priority || 'Medium',
        srv.status || 'Pending'
      ]);
      filename = 'Service_Status_Report';

    } else if (reportType === 'inventory') {
      const parts = inventory.data?.lowStockParts || [];
      const outParts = inventory.data?.outOfStockParts || [];
      const combined = [...outParts.map(p => ({ ...p, status: 'Out of Stock' })), ...parts.map(p => ({ ...p, status: 'Low Stock' }))];
      
      if (!combined.length) return toast.warning('No stock alert items to export');
      
      headers = ['Part Number', 'Part Name', 'Category', 'Current Stock', 'Min Stock Level', 'Selling Price', 'Status'];
      targetData = combined.map(p => [
        p.partNumber || 'N/A',
        `"${p.partName || 'N/A'}"`,
        `"${p.category || 'General'}"`,
        p.quantityAvailable || 0,
        p.minimumStockLevel || 5,
        p.sellingPrice || 0,
        p.status
      ]);
      filename = 'Inventory_Stock_Alerts';

    } else if (reportType === 'free-services') {
      const rows = freeServices.data?.freeServiceList || [];
      if (!rows.length) return toast.warning('No free service records available for export');

      headers = [
        'Invoice Number',
        'Job Card',
        'Free Service Stage',
        'Date',
        'Customer',
        'Vehicle',
        'Labour & Washing',
        'Parts Charged (₹)',
        'Grand Total (₹)',
        'Payment Status'
      ];

      targetData = rows.map(fs => [
        fs.invoiceNumber || 'N/A',
        fs.jobCard?.jobNumber || 'N/A',
        `Free Service #${fs.freeServiceNumber || 1} of 3`,
        new Date(fs.createdAt).toLocaleDateString(),
        `"${fs.customer?.fullName || 'N/A'}"`,
        `"${fs.vehicle?.vehicleNumber || 'N/A'}"`,
        'FREE (Waived)',
        fs.totalParts || 0,
        fs.grandTotal || 0,
        fs.status || 'Unpaid'
      ]);
      filename = 'Free_Services_Report';
    }

    const csvRows = [headers.join(",")];
    targetData.forEach(row => csvRows.push(row.join(",")));
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Report exported successfully");
  };

  // Safe KPI values (Requirement 1)
  const totalBilledVal = summary.data?.totalBilled || 0;
  const amountCollectedVal = summary.data?.amountCollected || 0;
  const pendingPaymentsVal = summary.data?.pendingPayments || 0;
  const totalServicesVal = summary.data?.totalServices || 0;
  const vehiclesServicedVal = summary.data?.vehiclesServiced || 0;
  const newCustomersVal = summary.data?.newCustomers || 0;
  const freeServicesVal = summary.data?.freeServicesUsed || 0;
  const lowStockVal = summary.data?.lowStockItems || 0;

  // Revenue analytics summary
  const revSummary = revenue.data?.summary || {
    totalBilled: totalBilledVal,
    amountCollected: amountCollectedVal,
    pendingAmount: pendingPaymentsVal,
    collectionRate: totalBilledVal > 0 ? ((amountCollectedVal / totalBilledVal) * 100).toFixed(1) : 0
  };

  // Payment overview breakdown
  const paymentSummary = payments.data?.summary || {
    totalBilled: totalBilledVal,
    totalCollected: amountCollectedVal,
    totalOutstanding: pendingPaymentsVal,
    paidCount: 0,
    partiallyPaidCount: 0,
    unpaidCount: 0,
    collectionRate: 0
  };

  // Custom chart tooltip
  const CustomChartTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border shadow rounded small" style={{ minWidth: '160px', zIndex: 1000 }}>
          <p className="fw-bold mb-2 text-dark border-bottom pb-1">{label}</p>
          {payload.map((entry, index) => (
            <div key={`item-${index}`} className="d-flex justify-content-between gap-3 mb-1" style={{ color: entry.color }}>
              <span>{entry.name}:</span>
              <span className="fw-bold">
                {entry.name.toLowerCase().includes('billed') || 
                 entry.name.toLowerCase().includes('collected') || 
                 entry.name.toLowerCase().includes('pending') || 
                 entry.name.toLowerCase().includes('amount') || 
                 entry.name.toLowerCase().includes('revenue') 
                  ? formatCurrency(entry.value) 
                  : entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Filtered detailed table rows based on search
  const filteredRevenueRows = useMemo(() => {
    const rows = revenue.data?.detailedData || [];
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.toLowerCase();
    return rows.filter(r => 
      (r.invoiceNumber && r.invoiceNumber.toLowerCase().includes(term)) ||
      (r.customer?.fullName && r.customer.fullName.toLowerCase().includes(term)) ||
      (r.vehicle?.vehicleNumber && r.vehicle.vehicleNumber.toLowerCase().includes(term)) ||
      (r.status && r.status.toLowerCase().includes(term))
    );
  }, [revenue.data, searchTerm]);

  const filteredServiceRows = useMemo(() => {
    const rows = services.data?.detailedData || [];
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.toLowerCase();
    return rows.filter(r => 
      (r.jobNumber && r.jobNumber.toLowerCase().includes(term)) ||
      (r.customer?.fullName && r.customer.fullName.toLowerCase().includes(term)) ||
      (r.vehicle?.vehicleNumber && r.vehicle.vehicleNumber.toLowerCase().includes(term)) ||
      (r.assignedMechanic?.fullName && r.assignedMechanic.fullName.toLowerCase().includes(term)) ||
      (r.status && r.status.toLowerCase().includes(term))
    );
  }, [services.data, searchTerm]);

  const filteredFreeServiceRows = useMemo(() => {
    const rows = freeServices.data?.freeServiceList || [];
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.toLowerCase();
    return rows.filter(r => 
      (r.invoiceNumber && r.invoiceNumber.toLowerCase().includes(term)) ||
      (r.jobCard?.jobNumber && r.jobCard.jobNumber.toLowerCase().includes(term)) ||
      (r.customer?.fullName && r.customer.fullName.toLowerCase().includes(term)) ||
      (r.vehicle?.vehicleNumber && r.vehicle.vehicleNumber.toLowerCase().includes(term)) ||
      (r.status && r.status.toLowerCase().includes(term))
    );
  }, [freeServices.data, searchTerm]);

  return (
    <div className="enterprise-dashboard">
      
      {/* 1. HEADER & DATE RANGE FILTER */}
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h2>Reports & Analytics</h2>
          <p className="dashboard-subtitle">Real-time garage operations, billing, revenue, and inventory intelligence</p>
        </div>
        
        <div className="header-actions">
          {/* Refresh Button */}
          <button 
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 shadow-sm"
            onClick={fetchReports}
            title="Refresh Data"
          >
            <FaSyncAlt className={summary.loading ? 'fa-spin' : ''} />
            <span className="d-none d-sm-inline">Refresh</span>
          </button>

          {/* Date Range Selector */}
          <select 
            className="form-select form-select-sm shadow-sm"
            style={{ width: '150px', fontWeight: 600 }}
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="thisYear">This Year</option>
            <option value="thisMonth">This Month</option>
            <option value="lastMonth">Last Month</option>
            <option value="today">Today</option>
            <option value="thisWeek">This Week</option>
            <option value="allTime">All Time</option>
            <option value="custom">Custom Range</option>
          </select>

          {dateRange === 'custom' && (
            <div className="d-flex gap-1 align-items-center">
              <input 
                type="date" 
                className="form-control form-control-sm shadow-sm" 
                style={{ width: '135px' }} 
                value={customStart} 
                onChange={(e) => setCustomStart(e.target.value)} 
              />
              <span className="text-muted small">to</span>
              <input 
                type="date" 
                className="form-control form-control-sm shadow-sm" 
                style={{ width: '135px' }} 
                value={customEnd} 
                onChange={(e) => setCustomEnd(e.target.value)} 
              />
            </div>
          )}
          
          {/* Export Report Dropdown */}
          <div className="dropdown position-relative">
            <button 
              className="btn btn-sm btn-primary dropdown-toggle d-flex align-items-center shadow-sm" 
              type="button" 
              id="exportDropdown" 
              onClick={() => setShowExportMenu(prev => !prev)}
              style={{ backgroundColor: 'var(--navy-primary)', borderColor: 'var(--navy-primary)' }}
            >
              <FaDownload className="me-1" /> Export Report
            </button>
            {showExportMenu && (
              <ul className="dropdown-menu dropdown-menu-end shadow border-0 show" style={{ display: 'block', position: 'absolute', right: 0, top: '100%', zIndex: 1050 }}>
                <li><button className="dropdown-item small py-2" onClick={() => { handleExportCSV('revenue'); setShowExportMenu(false); }}>Revenue & Billing CSV</button></li>
                <li><button className="dropdown-item small py-2" onClick={() => { handleExportCSV('services'); setShowExportMenu(false); }}>Service Status CSV</button></li>
                <li><button className="dropdown-item small py-2" onClick={() => { handleExportCSV('free-services'); setShowExportMenu(false); }}>Free Services CSV</button></li>
                <li><button className="dropdown-item small py-2" onClick={() => { handleExportCSV('inventory'); setShowExportMenu(false); }}>Inventory Stock Alerts CSV</button></li>
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* 2. TOP 8 KPI CARDS (Requirement 1) */}
      <div className="kpi-grid">
        {/* Card 1: Total Billed */}
        <div className="kpi-card kpi-billed">
          <div className="kpi-icon-wrap"><FaFileInvoiceDollar /></div>
          <div className="kpi-info">
            <div className="kpi-label">Total Billed</div>
            <div className="kpi-value text-navy">
              {summary.loading ? <Skeleton width="80px" height="26px" /> : formatCurrency(totalBilledVal)}
            </div>
            <div className="kpi-sub">All generated invoices</div>
          </div>
        </div>

        {/* Card 2: Amount Collected */}
        <div className="kpi-card kpi-collected">
          <div className="kpi-icon-wrap"><FaCheckDouble /></div>
          <div className="kpi-info">
            <div className="kpi-label">Amount Collected</div>
            <div className="kpi-value text-success">
              {summary.loading ? <Skeleton width="80px" height="26px" /> : formatCurrency(amountCollectedVal)}
            </div>
            <div className="kpi-sub">Received payments</div>
          </div>
        </div>

        {/* Card 3: Pending Payments */}
        <div className="kpi-card kpi-pending">
          <div className="kpi-icon-wrap"><FaClock /></div>
          <div className="kpi-info">
            <div className="kpi-label">Pending Payments</div>
            <div className="kpi-value text-danger">
              {summary.loading ? <Skeleton width="80px" height="26px" /> : formatCurrency(pendingPaymentsVal)}
            </div>
            <div className="kpi-sub">Balance outstanding</div>
          </div>
        </div>

        {/* Card 4: Total Services */}
        <div className="kpi-card kpi-services">
          <div className="kpi-icon-wrap"><FaTools /></div>
          <div className="kpi-info">
            <div className="kpi-label">Total Services</div>
            <div className="kpi-value text-orange">
              {summary.loading ? <Skeleton width="60px" height="26px" /> : totalServicesVal}
            </div>
            <div className="kpi-sub">Completed jobs</div>
          </div>
        </div>

        {/* Card 5: Vehicles Serviced */}
        <div className="kpi-card kpi-vehicles">
          <div className="kpi-icon-wrap"><FaCar /></div>
          <div className="kpi-info">
            <div className="kpi-label">Vehicles Serviced</div>
            <div className="kpi-value" style={{ color: '#0284c7' }}>
              {summary.loading ? <Skeleton width="60px" height="26px" /> : vehiclesServicedVal}
            </div>
            <div className="kpi-sub">Unique vehicles completed</div>
          </div>
        </div>

        {/* Card 6: New Customers */}
        <div className="kpi-card kpi-customers">
          <div className="kpi-icon-wrap"><FaUserPlus /></div>
          <div className="kpi-info">
            <div className="kpi-label">New Customers</div>
            <div className="kpi-value" style={{ color: '#8b5cf6' }}>
              {summary.loading ? <Skeleton width="60px" height="26px" /> : newCustomersVal}
            </div>
            <div className="kpi-sub">Registered in period</div>
          </div>
        </div>

        {/* Card 7: Free Services */}
        <div className="kpi-card kpi-free">
          <div className="kpi-icon-wrap"><FaGift /></div>
          <div className="kpi-info">
            <div className="kpi-label">Free Services</div>
            <div className="kpi-value text-success">
              {summary.loading ? <Skeleton width="60px" height="26px" /> : freeServicesVal}
            </div>
            <div className="kpi-sub">Free services redeemed</div>
          </div>
        </div>

        {/* Card 8: Low Stock Items */}
        <div className="kpi-card kpi-lowstock">
          <div className="kpi-icon-wrap"><FaBoxes /></div>
          <div className="kpi-info">
            <div className="kpi-label">Low Stock Items</div>
            <div className="kpi-value text-warning">
              {summary.loading ? <Skeleton width="60px" height="26px" /> : lowStockVal}
            </div>
            <div className="kpi-sub">Below minimum reorder</div>
          </div>
        </div>
      </div>

      {/* 3. REVENUE ANALYTICS COMPARISON (Requirement 3) */}
      <div className="row mb-4">
        <div className="col-12 col-xl-8 mb-4 mb-xl-0">
          <div className="panel h-100 d-flex flex-column">
            <div className="panel-header">
              <div className="d-flex align-items-center gap-2">
                <FaFileInvoiceDollar className="text-navy" />
                <span>Revenue Analytics: Billed vs Collected vs Pending</span>
              </div>
              <div className="small text-muted fw-normal">Actual Invoice & Payment Data</div>
            </div>

            <div className="panel-body flex-grow-1 d-flex flex-column">
              {/* Mini Period Summary Strip */}
              <div className="panel-kpi-row">
                <div className="panel-kpi-box">
                  <div className="lbl">Total Billed</div>
                  <div className="val text-navy">{formatCurrency(revSummary.totalBilled)}</div>
                </div>
                <div className="panel-kpi-box">
                  <div className="lbl">Amount Collected</div>
                  <div className="val text-success">{formatCurrency(revSummary.amountCollected)}</div>
                </div>
                <div className="panel-kpi-box">
                  <div className="lbl">Pending Amount</div>
                  <div className="val text-danger">{formatCurrency(revSummary.pendingAmount)}</div>
                </div>
                <div className="panel-kpi-box">
                  <div className="lbl">Collection Rate</div>
                  <div className="val text-primary">{revSummary.collectionRate || 0}%</div>
                </div>
              </div>

              {/* Chart */}
              <div className="flex-grow-1" style={{ minHeight: '320px' }}>
                {revenue.loading ? (
                  <Skeleton height="320px" />
                ) : revenue.error ? (
                  <ErrorState onRetry={() => fetchSection(reportService.getRevenueAnalytics, setRevenue, ...Object.values(calculateDateRange()))} />
                ) : revenue.data?.chartData?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={revenue.data.chartData} margin={{ top: 15, right: 15, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis 
                        tick={{ fontSize: 11 }} 
                        axisLine={false} 
                        tickLine={false} 
                        tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`} 
                      />
                      <RechartsTooltip content={<CustomChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Bar dataKey="totalBilled" name="Total Billed" fill="#1A237E" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      <Bar dataKey="amountCollected" name="Amount Collected" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      <Bar dataKey="pendingAmount" name="Pending Balance" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState 
                    title="No revenue transactions found" 
                    message="No invoices or payments were created during the selected date range." 
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 4. PAYMENT OVERVIEW SECTION (Requirement 4) */}
        <div className="col-12 col-xl-4">
          <div className="panel h-100 d-flex flex-column">
            <div className="panel-header">
              <div className="d-flex align-items-center gap-2">
                <FaCheckCircle className="text-success" />
                <span>Payment Overview</span>
              </div>
            </div>

            <div className="panel-body flex-grow-1 d-flex flex-column justify-content-between">
              {payments.loading ? (
                <Skeleton height="350px" />
              ) : payments.error ? (
                <ErrorState onRetry={() => fetchSection(reportService.getPaymentAnalytics, setPayments, ...Object.values(calculateDateRange()))} />
              ) : (
                <>
                  {/* Status Breakdown Cards */}
                  <div className="d-flex flex-column gap-2 mb-3">
                    <div className="d-flex justify-content-between align-items-center p-2 rounded border bg-light">
                      <div>
                        <span className="badge badge-paid me-2">Paid</span>
                        <small className="text-muted">{payments.data?.statusMap?.['Paid']?.count || 0} Invoices</small>
                      </div>
                      <span className="fw-bold text-success">{formatCurrency(payments.data?.statusMap?.['Paid']?.amountCollected || 0)}</span>
                    </div>

                    <div className="d-flex justify-content-between align-items-center p-2 rounded border bg-light">
                      <div>
                        <span className="badge badge-partial me-2">Partially Paid</span>
                        <small className="text-muted">{payments.data?.statusMap?.['Partially Paid']?.count || 0} Invoices</small>
                      </div>
                      <div className="text-end">
                        <div className="fw-bold text-warning">{formatCurrency(payments.data?.statusMap?.['Partially Paid']?.amountCollected || 0)}</div>
                        <div className="text-danger" style={{ fontSize: '0.72rem' }}>Bal: {formatCurrency(payments.data?.statusMap?.['Partially Paid']?.pendingAmount || 0)}</div>
                      </div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center p-2 rounded border bg-light">
                      <div>
                        <span className="badge badge-unpaid me-2">Unpaid</span>
                        <small className="text-muted">{payments.data?.statusMap?.['Unpaid']?.count || 0} Invoices</small>
                      </div>
                      <span className="fw-bold text-danger">{formatCurrency(payments.data?.statusMap?.['Unpaid']?.pendingAmount || 0)}</span>
                    </div>
                  </div>

                  {/* Total Collected vs Total Outstanding Progress */}
                  <div className="payment-summary-box mb-3">
                    <div className="d-flex justify-content-between small text-muted mb-1">
                      <span>Total Collected: <strong className="text-success">{formatCurrency(paymentSummary.totalCollected)}</strong></span>
                      <span>Outstanding: <strong className="text-danger">{formatCurrency(paymentSummary.totalOutstanding)}</strong></span>
                    </div>
                    <div className="payment-progress-bar">
                      <div 
                        className="payment-progress-fill" 
                        style={{ width: `${Math.min(100, Math.max(0, paymentSummary.collectionRate || 0))}%` }}
                        title={`Collected: ${paymentSummary.collectionRate}%`}
                      ></div>
                    </div>
                    <div className="text-end mt-1 text-muted" style={{ fontSize: '0.72rem' }}>
                      Recovery Rate: {paymentSummary.collectionRate}%
                    </div>
                  </div>

                  {/* Payment Methods */}
                  <div>
                    <div className="text-uppercase fw-bold text-muted mb-2" style={{ fontSize: '0.72rem' }}>Payment Methods Used</div>
                    <div className="d-flex gap-2 flex-wrap">
                      {payments.data?.paymentMethods?.length > 0 ? (
                        payments.data.paymentMethods.map((m, idx) => (
                          <span key={idx} className="badge bg-light text-dark border px-2 py-1 small">
                            {m.method}: <strong>{formatCurrency(m.amount)}</strong> ({m.count})
                          </span>
                        ))
                      ) : (
                        <small className="text-muted">No method breakdown recorded</small>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. SERVICE STATUS ANALYTICS (Requirement 5) */}
      <div className="panel mb-4">
        <div className="panel-header">
          <div className="d-flex align-items-center gap-2">
            <FaTools className="text-orange" />
            <span>Service Status Analytics</span>
          </div>
          <div className="small text-muted">Total Jobs: {services.data?.totalJobs || 0}</div>
        </div>

        <div className="panel-body">
          {/* Status Badges Grid */}
          <div className="status-cards-grid">
            {services.data?.statusChart?.map((item, idx) => (
              <div key={idx} className="status-badge-card">
                <div className="st-name">
                  <span className="status-dot" style={{ backgroundColor: STATUS_COLORS[item.status] || '#64748b' }}></span>
                  {item.displayName}
                </div>
                <div className="st-count" style={{ color: STATUS_COLORS[item.status] || 'var(--navy-primary)' }}>
                  {services.loading ? '...' : item.count}
                </div>
              </div>
            ))}
          </div>

          <div className="row mt-3">
            {/* Status Pie Chart */}
            <div className="col-12 col-md-6 mb-3 mb-md-0" style={{ height: '240px' }}>
              {services.loading ? (
                <Skeleton height="240px" />
              ) : services.data?.statusChart?.some(s => s.count > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={services.data.statusChart.filter(s => s.count > 0)}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={80}
                      paddingAngle={4}
                      dataKey="count" nameKey="displayName"
                    >
                      {services.data.statusChart.filter(s => s.count > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState title="No service jobs found" message="No job cards exist for the selected date range." />
              )}
            </div>

            {/* Service Type Bar Chart */}
            <div className="col-12 col-md-6" style={{ height: '240px' }}>
              {services.loading ? (
                <Skeleton height="240px" />
              ) : services.data?.typeChart?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={services.data.typeChart} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="_id" type="category" tick={{ fontSize: 11 }} width={90} />
                    <RechartsTooltip content={<CustomChartTooltip />} />
                    <Bar dataKey="count" name="Jobs" fill="var(--orange-accent)" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState title="No service types" message="No type classification recorded for this period." />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 6. MECHANIC PERFORMANCE & 7. INVENTORY ANALYTICS (Requirements 6 & 7) */}
      <div className="row mb-4">
        {/* Mechanic Performance */}
        <div className="col-12 col-lg-7 mb-4 mb-lg-0">
          <div className="panel h-100 d-flex flex-column">
            <div className="panel-header">
              <div className="d-flex align-items-center gap-2">
                <FaUsers className="text-navy" />
                <span>Mechanic Performance</span>
              </div>
              <small className="text-muted">Jobs Assigned vs Completed</small>
            </div>

            <div className="panel-body no-padding flex-grow-1" style={{ maxHeight: '380px', overflowY: 'auto' }}>
              {mechanics.loading ? (
                <div className="p-3"><Skeleton height="200px" /></div>
              ) : mechanics.error ? (
                <ErrorState onRetry={() => fetchSection(reportService.getMechanicAnalytics, setMechanics, ...Object.values(calculateDateRange()))} />
              ) : mechanics.data?.length > 0 ? (
                <table className="enterprise-table">
                  <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr>
                      <th>Mechanic</th>
                      <th className="text-center">Assigned</th>
                      <th className="text-center">Completed</th>
                      <th className="text-center">In Progress</th>
                      <th className="text-center">Waiting Parts</th>
                      <th style={{ width: '130px' }}>Completion Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mechanics.data.map((m, idx) => (
                      <tr key={idx}>
                        <td>
                          <div className="fw-bold text-navy">{m.mechanicName}</div>
                          <small className="text-muted">{m.specialization}</small>
                        </td>
                        <td className="text-center fw-bold">{m.totalAssigned}</td>
                        <td className="text-center text-success fw-bold">{m.completed}</td>
                        <td className="text-center text-orange">{m.inProgress}</td>
                        <td className="text-center text-danger">{m.waitingForParts}</td>
                        <td>
                          <div className="d-flex align-items-center">
                            <span className="me-2 fw-bold small">{m.completionRate}%</span>
                            <div className="mini-progress flex-grow-1">
                              <div 
                                className="mini-progress-bar" 
                                style={{ 
                                  width: `${Math.min(100, m.completionRate)}%`, 
                                  backgroundColor: m.completionRate >= 75 ? '#10b981' : (m.completionRate >= 40 ? '#f59e0b' : '#ef4444') 
                                }}
                              ></div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyState title="No mechanic jobs assigned" message="No jobs were assigned to mechanics during this period." />
              )}
            </div>
          </div>
        </div>

        {/* Inventory Monitor & Stock Alerts */}
        <div className="col-12 col-lg-5">
          <div className="panel h-100 d-flex flex-column">
            <div className="panel-header">
              <div className="d-flex align-items-center gap-2">
                <FaBoxes className="text-orange" />
                <span>Inventory Analytics & Stock Alerts</span>
              </div>
            </div>

            {/* Inventory Status Strip */}
            <div className="d-flex border-bottom text-center bg-light">
              <div className="flex-fill p-3 border-end">
                <div className="text-muted small fw-bold text-uppercase mb-1">Total Parts</div>
                <div className="fs-4 fw-bold text-navy">{inventory.loading ? '-' : inventory.data?.totalParts || 0}</div>
              </div>
              <div className="flex-fill p-3 border-end">
                <div className="text-muted small fw-bold text-uppercase mb-1">Low Stock</div>
                <div className="fs-4 fw-bold text-warning">{inventory.loading ? '-' : inventory.data?.lowStockCount || 0}</div>
              </div>
              <div className="flex-fill p-3">
                <div className="text-muted small fw-bold text-uppercase mb-1">Out of Stock</div>
                <div className="fs-4 fw-bold text-danger">{inventory.loading ? '-' : inventory.data?.outOfStockCount || 0}</div>
              </div>
            </div>

            {/* Stock Alerts Table */}
            <div className="panel-body no-padding flex-grow-1" style={{ maxHeight: '250px', overflowY: 'auto' }}>
              {inventory.loading ? (
                <div className="p-3"><Skeleton height="150px" /></div>
              ) : inventory.error ? (
                <ErrorState onRetry={() => fetchSection(reportService.getInventoryAnalytics, setInventory, ...Object.values(calculateDateRange()))} />
              ) : (inventory.data?.outOfStockParts?.length > 0 || inventory.data?.lowStockParts?.length > 0) ? (
                <table className="enterprise-table">
                  <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr>
                      <th>Part Name</th>
                      <th className="text-center">Available</th>
                      <th className="text-center">Min Level</th>
                      <th className="text-end">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.data.outOfStockParts?.map((p, idx) => (
                      <tr key={`out-${idx}`}>
                        <td>
                          <div className="fw-bold">{p.partName}</div>
                          <small className="text-muted">{p.partNumber}</small>
                        </td>
                        <td className="text-center text-danger fw-bold">{p.quantityAvailable}</td>
                        <td className="text-center text-muted">{p.minimumStockLevel || 5}</td>
                        <td className="text-end"><span className="badge bg-danger">Out of Stock</span></td>
                      </tr>
                    ))}
                    {inventory.data.lowStockParts?.map((p, idx) => (
                      <tr key={`low-${idx}`}>
                        <td>
                          <div className="fw-bold">{p.partName}</div>
                          <small className="text-muted">{p.partNumber}</small>
                        </td>
                        <td className="text-center text-warning fw-bold">{p.quantityAvailable}</td>
                        <td className="text-center text-muted">{p.minimumStockLevel || 5}</td>
                        <td className="text-end"><span className="badge bg-warning text-dark">Low Stock</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-4 text-center text-success">
                  <FaCheckCircle size={32} className="mb-2 text-success opacity-75" />
                  <h6 className="fw-bold mb-1">Inventory is Healthy</h6>
                  <small className="text-muted">All parts are above their minimum reorder stock level.</small>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 8. CUSTOMER & VEHICLE ANALYTICS & 9. FREE SERVICE ANALYTICS (Requirements 8 & 9) */}
      <div className="row mb-4">
        {/* Customer & Vehicle Analytics */}
        <div className="col-12 col-lg-7 mb-4 mb-lg-0">
          <div className="panel h-100 d-flex flex-column">
            <div className="panel-header">
              <div className="d-flex align-items-center gap-2">
                <FaCar className="text-navy" />
                <span>Customer & Vehicle Analytics</span>
              </div>
            </div>

            <div className="panel-body flex-grow-1">
              {customersVehicles.loading ? (
                <Skeleton height="200px" />
              ) : customersVehicles.error ? (
                <ErrorState onRetry={() => fetchSection(reportService.getCustomerVehicleAnalytics, setCustomersVehicles, ...Object.values(calculateDateRange()))} />
              ) : (
                <div className="row">
                  {/* Customer Metrics */}
                  <div className="col-12 col-md-6 border-end-md pb-3 pb-md-0">
                    <div className="text-uppercase fw-bold text-muted mb-3" style={{ fontSize: '0.72rem' }}>Customer Intelligence</div>
                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <div className="p-2 border rounded bg-light">
                          <small className="text-muted d-block">Total Customers</small>
                          <span className="fs-5 fw-bold text-navy">{customersVehicles.data?.customers?.total || 0}</span>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="p-2 border rounded bg-light">
                          <small className="text-muted d-block">New Customers</small>
                          <span className="fs-5 fw-bold text-success">+{customersVehicles.data?.customers?.new || 0}</span>
                        </div>
                      </div>
                    </div>

                    <div className="small fw-bold text-muted mb-1">Top Customer (by spend):</div>
                    {customersVehicles.data?.customers?.top?.[0] ? (
                      <div className="p-2 rounded border bg-light small">
                        <div className="fw-bold text-navy">{customersVehicles.data.customers.top[0].name}</div>
                        <div className="text-muted">Total Spent: <strong className="text-success">{formatCurrency(customersVehicles.data.customers.top[0].totalSpent)}</strong> ({customersVehicles.data.customers.top[0].servicesCount} visits)</div>
                      </div>
                    ) : (
                      <small className="text-muted">No spenders in this period</small>
                    )}
                  </div>

                  {/* Vehicle Metrics */}
                  <div className="col-12 col-md-6 pt-3 pt-md-0">
                    <div className="text-uppercase fw-bold text-muted mb-3" style={{ fontSize: '0.72rem' }}>Vehicle Intelligence</div>
                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <div className="p-2 border rounded bg-light">
                          <small className="text-muted d-block">Total Fleet</small>
                          <span className="fs-5 fw-bold text-navy">{customersVehicles.data?.vehicles?.total || 0}</span>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="p-2 border rounded bg-light">
                          <small className="text-muted d-block">Serviced in Period</small>
                          <span className="fs-5 fw-bold text-primary">{customersVehicles.data?.vehicles?.serviced || 0}</span>
                        </div>
                      </div>
                    </div>

                    <div className="small fw-bold text-muted mb-1">Most Serviced Model:</div>
                    {customersVehicles.data?.vehicles?.mostServiced?.[0] ? (
                      <div className="p-2 rounded border bg-light small">
                        <div className="fw-bold text-navy">
                          {customersVehicles.data.vehicles.mostServiced[0].brand} {customersVehicles.data.vehicles.mostServiced[0].model}
                        </div>
                        <div className="text-muted">
                          Completed Services: <strong>{customersVehicles.data.vehicles.mostServiced[0].servicesCount}</strong>
                        </div>
                      </div>
                    ) : (
                      <small className="text-muted">No completed vehicle jobs in this period</small>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Free Service Tracker (Requirement 9) */}
        <div className="col-12 col-lg-5">
          <div className="panel h-100 d-flex flex-column">
            <div className="panel-header">
              <div className="d-flex align-items-center gap-2">
                <FaGift className="text-success" />
                <span>Free Service Analytics (First 3 Free)</span>
              </div>
            </div>

            <div className="panel-body flex-grow-1 d-flex flex-column justify-content-between">
              {freeServices.loading ? (
                <Skeleton height="180px" />
              ) : freeServices.error ? (
                <ErrorState onRetry={() => fetchSection(reportService.getFreeServiceAnalytics, setFreeServices, ...Object.values(calculateDateRange()))} />
              ) : (
                <>
                  {/* 3-Stage Visual Flow */}
                  <div className="free-service-flow mb-3">
                    <div className="fs-stage-card">
                      <div className="fs-stage-num">{freeServices.data?.stage1Count || 0}</div>
                      <div className="fs-stage-title">1st Free Service</div>
                    </div>
                    <div className="fs-arrow-icon"><FaAngleRight /></div>
                    <div className="fs-stage-card">
                      <div className="fs-stage-num">{freeServices.data?.stage2Count || 0}</div>
                      <div className="fs-stage-title">2nd Free Service</div>
                    </div>
                    <div className="fs-arrow-icon"><FaAngleRight /></div>
                    <div className="fs-stage-card">
                      <div className="fs-stage-num">{freeServices.data?.stage3Count || 0}</div>
                      <div className="fs-stage-title">3rd Free Service</div>
                    </div>
                  </div>

                  {/* Financial Stats on Free Services */}
                  <div className="p-3 bg-light rounded border mb-3">
                    <div className="d-flex justify-content-between small mb-1">
                      <span className="text-muted">Free Service Invoices:</span>
                      <strong className="text-navy">{freeServices.data?.financial?.totalFreeInvoices || 0}</strong>
                    </div>
                    <div className="d-flex justify-content-between small">
                      <span className="text-muted">Spare Parts Billed on Free Services:</span>
                      <strong className="text-success">{formatCurrency(freeServices.data?.financial?.partsChargedOnFreeServices || 0)}</strong>
                    </div>
                  </div>

                  {/* Policy Reminder Banner */}
                  <div className="alert alert-primary py-2 px-3 mb-0 small text-center border-0 bg-primary bg-opacity-10 text-primary fw-bold">
                    <FaShieldAlt className="me-1" />
                    Free: Labour & Washing &nbsp;|&nbsp; <span className="text-danger">Chargeable: Spare Parts & Taxes</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 10. DETAILED REPORTS & TABBED VIEWS (Requirement 12) */}
      <div className="panel mb-0">
        <div className="panel-header d-flex align-items-center bg-white border-bottom-0 pb-0 flex-wrap gap-2">
          <span className="fs-5">Detailed Reports</span>
          <div className="d-flex align-items-center bg-light border rounded px-2 ms-auto" style={{ maxWidth: '280px' }}>
            <FaSearch className="text-muted small me-2" />
            <input 
              type="text" 
              className="form-control form-control-sm border-0 bg-transparent shadow-none" 
              placeholder="Search table rows..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <div className="enterprise-tabs mt-3">
          <button className={`enterprise-tab ${activeTab === 'revenue' ? 'active' : ''}`} onClick={() => setActiveTab('revenue')}>
            Revenue & Billing ({filteredRevenueRows.length})
          </button>
          <button className={`enterprise-tab ${activeTab === 'services' ? 'active' : ''}`} onClick={() => setActiveTab('services')}>
            Services ({filteredServiceRows.length})
          </button>
          <button className={`enterprise-tab ${activeTab === 'free-services' ? 'active' : ''}`} onClick={() => setActiveTab('free-services')}>
            Free Services ({filteredFreeServiceRows.length})
          </button>
          <button className={`enterprise-tab ${activeTab === 'customers' ? 'active' : ''}`} onClick={() => setActiveTab('customers')}>
            Customers
          </button>
          <button className={`enterprise-tab ${activeTab === 'mechanics' ? 'active' : ''}`} onClick={() => setActiveTab('mechanics')}>
            Mechanics
          </button>
          <button className={`enterprise-tab ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => setActiveTab('inventory')}>
            Inventory Stock Alerts
          </button>
        </div>
        
        {/* Tab Content Table */}
        <div className="panel-body no-padding" style={{ minHeight: '260px', maxHeight: '420px', overflowY: 'auto' }}>
          
          {/* REVENUE TAB */}
          {activeTab === 'revenue' && (
            revenue.loading ? (
              <div className="p-4"><Skeleton height="200px" /></div>
            ) : filteredRevenueRows.length > 0 ? (
              <table className="enterprise-table">
                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr>
                    <th>Invoice No</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Vehicle</th>
                    <th className="text-end">Labour</th>
                    <th className="text-end">Parts</th>
                    <th className="text-end">Grand Total</th>
                    <th className="text-end">Paid</th>
                    <th className="text-end">Balance</th>
                    <th className="text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRevenueRows.map((inv, idx) => (
                    <tr key={idx}>
                      <td className="fw-bold text-navy">
                        {inv.invoiceNumber}
                        {inv.isFreeService && (
                          <span className="badge bg-success bg-opacity-10 text-success border border-success ms-2" style={{ fontSize: '0.72rem' }}>
                            Free Service #{inv.freeServiceNumber || ''}
                          </span>
                        )}
                      </td>
                      <td>{new Date(inv.createdAt).toLocaleDateString()}</td>
                      <td>{inv.customer?.fullName || 'N/A'}</td>
                      <td>{inv.vehicle?.vehicleNumber || 'N/A'}</td>
                      <td className="text-end text-muted">
                        {inv.isFreeService && inv.totalLabour === 0 ? <span className="text-success fw-semibold">FREE</span> : formatCurrency(inv.totalLabour)}
                      </td>
                      <td className="text-end text-muted">{formatCurrency(inv.totalParts)}</td>
                      <td className="text-end fw-bold text-navy">{formatCurrency(inv.grandTotal)}</td>
                      <td className="text-end text-success fw-bold">{formatCurrency(inv.amountPaid)}</td>
                      <td className="text-end text-danger">{formatCurrency(inv.balanceDue)}</td>
                      <td className="text-center">
                        <span className={`badge ${inv.status === 'Paid' ? 'badge-paid' : (inv.status === 'Partially Paid' ? 'badge-partial' : 'badge-unpaid')}`}>
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState title="No invoice records found" message="No invoices match the selected period and search filter." />
            )
          )}

          {/* SERVICES TAB */}
          {activeTab === 'services' && (
            services.loading ? (
              <div className="p-4"><Skeleton height="200px" /></div>
            ) : filteredServiceRows.length > 0 ? (
              <table className="enterprise-table">
                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr>
                    <th>Job Number</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Vehicle</th>
                    <th>Service Type</th>
                    <th>Assigned Mechanic</th>
                    <th className="text-center">Priority</th>
                    <th className="text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredServiceRows.map((srv, idx) => (
                    <tr key={idx}>
                      <td className="fw-bold text-navy">
                        {srv.jobNumber}
                        {srv.isFreeService && (
                          <span className="badge bg-success bg-opacity-10 text-success border border-success ms-2" style={{ fontSize: '0.72rem' }}>
                            Free Service #{srv.freeServiceNumber || ''}
                          </span>
                        )}
                      </td>
                      <td>{new Date(srv.createdAt).toLocaleDateString()}</td>
                      <td>{srv.customer?.fullName || 'N/A'}</td>
                      <td>{srv.vehicle?.vehicleNumber || 'N/A'}</td>
                      <td>
                        <div>{srv.serviceType || 'General Service'}</div>
                        {srv.isFreeService && <small className="text-success fw-semibold d-block">Labour & Washing Waived</small>}
                      </td>
                      <td>{srv.assignedMechanic?.fullName || 'Unassigned'}</td>
                      <td className="text-center">
                        <span className="badge bg-light text-dark border">{srv.priority || 'Medium'}</span>
                      </td>
                      <td className="text-center">
                        <span 
                          className="badge" 
                          style={{ 
                            backgroundColor: STATUS_COLORS[srv.status] || '#64748b', 
                            color: '#ffffff' 
                          }}
                        >
                          {srv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState title="No service jobs found" message="No jobs match the selected period and search filter." />
            )
          )}

          {/* FREE SERVICES TAB */}
          {activeTab === 'free-services' && (
            freeServices.loading ? (
              <div className="p-4"><Skeleton height="200px" /></div>
            ) : filteredFreeServiceRows.length > 0 ? (
              <table className="enterprise-table">
                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr>
                    <th>Invoice No</th>
                    <th>Job Card</th>
                    <th>Free Service Stage</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Vehicle</th>
                    <th className="text-center">Labour & Washing</th>
                    <th className="text-end">Parts Charged</th>
                    <th className="text-end">Grand Total</th>
                    <th className="text-center">Payment Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFreeServiceRows.map((fs, idx) => (
                    <tr key={idx}>
                      <td className="fw-bold text-navy">{fs.invoiceNumber}</td>
                      <td>
                        <span className="fw-semibold text-secondary">{fs.jobCard?.jobNumber || 'N/A'}</span>
                      </td>
                      <td>
                        <span className="badge bg-success text-white px-2 py-1">
                          Free Service #{fs.freeServiceNumber || 1} of 3
                        </span>
                      </td>
                      <td>{new Date(fs.createdAt).toLocaleDateString()}</td>
                      <td>{fs.customer?.fullName || 'N/A'}</td>
                      <td>{fs.vehicle?.vehicleNumber || 'N/A'}</td>
                      <td className="text-center">
                        <span className="badge bg-success bg-opacity-10 text-success border border-success px-2 py-1">
                          FREE (Waived)
                        </span>
                      </td>
                      <td className="text-end fw-semibold text-dark">{formatCurrency(fs.totalParts)}</td>
                      <td className="text-end fw-bold text-navy">{formatCurrency(fs.grandTotal)}</td>
                      <td className="text-center">
                        <span className={`badge ${fs.status === 'Paid' ? 'badge-paid' : 'badge-unpaid'}`}>
                          {fs.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState title="No free service records found" message="No free service invoices match the selected period and search filter." />
            )
          )}

          {/* CUSTOMERS TAB */}
          {activeTab === 'customers' && (
            customersVehicles.loading ? (
              <div className="p-4"><Skeleton height="200px" /></div>
            ) : customersVehicles.data?.customers?.top?.length > 0 ? (
              <table className="enterprise-table">
                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr>
                    <th>Customer Name</th>
                    <th>Phone</th>
                    <th>City</th>
                    <th className="text-center">Completed Visits</th>
                    <th className="text-end">Total Billed</th>
                    <th className="text-end">Total Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {customersVehicles.data.customers.top.map((c, idx) => (
                    <tr key={idx}>
                      <td className="fw-bold text-navy">{c.name}</td>
                      <td>{c.phone}</td>
                      <td>{c.city}</td>
                      <td className="text-center">{c.servicesCount}</td>
                      <td className="text-end text-muted">{formatCurrency(c.totalBilled)}</td>
                      <td className="text-end fw-bold text-success">{formatCurrency(c.totalSpent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState title="No customer spenders found" message="No customer invoices exist for this period." />
            )
          )}

          {/* MECHANICS TAB */}
          {activeTab === 'mechanics' && (
            mechanics.loading ? (
              <div className="p-4"><Skeleton height="200px" /></div>
            ) : mechanics.data?.length > 0 ? (
              <table className="enterprise-table">
                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr>
                    <th>Mechanic Name</th>
                    <th>Employee ID</th>
                    <th>Specialization</th>
                    <th className="text-center">Assigned</th>
                    <th className="text-center">In Progress</th>
                    <th className="text-center">Waiting for Parts</th>
                    <th className="text-center">Completed</th>
                    <th className="text-end">Completion Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {mechanics.data.map((m, idx) => (
                    <tr key={idx}>
                      <td className="fw-bold text-navy">{m.mechanicName}</td>
                      <td>{m.employeeId}</td>
                      <td>{m.specialization}</td>
                      <td className="text-center fw-bold">{m.totalAssigned}</td>
                      <td className="text-center text-orange">{m.inProgress}</td>
                      <td className="text-center text-danger">{m.waitingForParts}</td>
                      <td className="text-center text-success fw-bold">{m.completed}</td>
                      <td className="text-end fw-bold">{m.completionRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState title="No mechanic performance records" message="No jobs were assigned during this period." />
            )
          )}

          {/* INVENTORY TAB */}
          {activeTab === 'inventory' && (
            inventory.loading ? (
              <div className="p-4"><Skeleton height="200px" /></div>
            ) : (inventory.data?.outOfStockParts?.length > 0 || inventory.data?.lowStockParts?.length > 0) ? (
              <table className="enterprise-table">
                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr>
                    <th>Part Number</th>
                    <th>Part Name</th>
                    <th>Category</th>
                    <th className="text-center">Available Stock</th>
                    <th className="text-center">Minimum Required</th>
                    <th className="text-end">Unit Price</th>
                    <th className="text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.data.outOfStockParts?.map((p, idx) => (
                    <tr key={`out-tab-${idx}`}>
                      <td className="fw-bold">{p.partNumber}</td>
                      <td>{p.partName}</td>
                      <td>{p.category}</td>
                      <td className="text-center text-danger fw-bold">{p.quantityAvailable}</td>
                      <td className="text-center text-muted">{p.minimumStockLevel || 5}</td>
                      <td className="text-end">{formatCurrency(p.sellingPrice)}</td>
                      <td className="text-center"><span className="badge bg-danger">Out of Stock</span></td>
                    </tr>
                  ))}
                  {inventory.data.lowStockParts?.map((p, idx) => (
                    <tr key={`low-tab-${idx}`}>
                      <td className="fw-bold">{p.partNumber}</td>
                      <td>{p.partName}</td>
                      <td>{p.category}</td>
                      <td className="text-center text-warning fw-bold">{p.quantityAvailable}</td>
                      <td className="text-center text-muted">{p.minimumStockLevel || 5}</td>
                      <td className="text-end">{formatCurrency(p.sellingPrice)}</td>
                      <td className="text-center"><span className="badge bg-warning text-dark">Low Stock</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState title="All inventory is well-stocked" message="No parts are currently low or out of stock." />
            )
          )}

        </div>
      </div>

    </div>
  );
};

export default ReportsDashboard;
