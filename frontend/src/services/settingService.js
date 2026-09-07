import api from './api';

const API_URL = '/settings/';

const getSettings = async () => {
  const response = await api.get(API_URL);
  return response.data;
};

const updateSettings = async (data) => {
  const response = await api.put(API_URL, data);
  return response.data;
};

const getPublicSettings = async () => {
  const response = await api.get(`${API_URL}public`);
  return response.data;
};

const changePassword = async (passwordData) => {
  const response = await api.post('/auth/change-password', passwordData);
  return response.data;
};

const settingService = {
  getSettings,
  updateSettings,
  getPublicSettings,
  changePassword
};

export default settingService;
