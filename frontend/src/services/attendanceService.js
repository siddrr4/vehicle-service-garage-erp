import api from './api';

const checkIn = async (employeeId = null) => {
  const data = employeeId ? { employeeId } : {};
  const response = await api.post('/attendance/check-in', data);
  return response.data;
};

const checkOut = async (employeeId = null) => {
  const data = employeeId ? { employeeId } : {};
  const response = await api.post('/attendance/check-out', data);
  return response.data;
};

const getTodayAttendance = async (params = {}) => {
  const response = await api.get('/attendance/today', { params });
  return response.data;
};

const getMechanicAttendanceHistory = async () => {
  const response = await api.get('/attendance/my-history');
  return response.data;
};

const getAdminAttendanceSummary = async (date) => {
  const response = await api.get('/attendance/admin-summary', {
    params: { date },
  });
  return response.data;
};

const getTodayMechanicAvailability = async () => {
  const response = await api.get('/attendance/mechanic-availability');
  return response.data;
};

const markAttendance = async (data) => {
  const response = await api.post('/attendance/mark', data);
  return response.data;
};

const attendanceService = {
  checkIn,
  checkOut,
  getTodayAttendance,
  getMechanicAttendanceHistory,
  getAdminAttendanceSummary,
  getTodayMechanicAvailability,
  markAttendance,
};

export default attendanceService;
