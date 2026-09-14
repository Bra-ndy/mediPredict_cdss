import axios from 'axios';

const API_URL = 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // Set to true if you need cookies
});

// Add token to requests if it exists
api.interceptors.request.use(
  (config) => {
    // Check both localStorage and sessionStorage for token
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    console.log('🔑 Token in storage:', token ? 'Present' : 'Missing');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log(' Added Authorization header');
    } else {
      console.log(' No token found in storage');
    }
    
    console.log(` Making ${config.method.toUpperCase()} request to: ${config.url}`);
    return config;
  },
  (error) => {
    console.error(' Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors and token expiration
api.interceptors.response.use(
  (response) => {
    console.log(` Response from ${response.config.url}:`, response.status);
    return response;
  },
  (error) => {
    console.error(` Error from ${error.config?.url}:`, {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });

    // Handle CORS errors
    if (error.message === 'Network Error') {
      console.log(' CORS or Network Error - Check if backend is running and CORS is configured');
    }

    // Handle 401 Unauthorized errors (token expired or invalid)
    if (error.response?.status === 401) {
      console.log(' Token expired or invalid, redirecting to login...');
      
      // Clear all storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('token');
      
      // Redirect to login page if not already there
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    // Handle 403 Forbidden errors
    if (error.response?.status === 403) {
      console.log(' Access forbidden - insufficient permissions');
    }

    // Handle 404 Not Found errors
    if (error.response?.status === 404) {
      console.log(' Endpoint not found:', error.config?.url);
    }

    return Promise.reject(error);
  }
);


export const login = (credentials) => api.post('/auth/login', credentials);
export const register = (userData) => api.post('/auth/register', userData);
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  sessionStorage.removeItem('token');
  return api.post('/auth/logout');
};
export const getCurrentUser = () => api.get('/auth/me');
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email });
export const resetPassword = (token, password) => api.post(`/auth/reset-password/${token}`, { password });


// Dashboard and Stats
export const getDashboard = () => api.get('/admin/dashboard');
export const getStats = () => api.get('/admin/stats');

// User Management
export const getUsers = () => api.get('/admin/users');
export const getUserDetails = (userId) => api.get(`/admin/user-details/${userId}`);
export const updateUser = (userId, userData) => api.put(`/admin/users/${userId}`, userData);
export const deleteUser = (userId) => api.delete(`/admin/users/${userId}`);

// Pending User Verification
export const getPendingUsers = () => api.get('/admin/pending-users');
export const getPendingCount = () => api.get('/admin/pending-count');
export const verifyUser = (userId) => api.post(`/admin/verify-user/${userId}`);
export const rejectUser = (userId) => api.post(`/admin/reject-user/${userId}`);

// User Roles
export const getRoles = () => api.get('/admin/roles');
export const updateUserRole = (userId, role) => api.put(`/admin/users/${userId}/role`, { role });

// Audit Logs
export const getAuditLogs = (params) => api.get('/admin/audit-logs', { params });
export const getRecentAudits = (limit = 5) => api.get(`/admin/recent-audits?limit=${limit}`);

// System Status
export const getSystemStatus = () => api.get('/admin/system-status');

// Settings
export const getSettings = () => api.get('/admin/settings');
export const updateSettings = (settings) => api.put('/admin/settings', settings);

// ==================== CLINICAL ENDPOINTS ====================
// Dashboard
export const getClinicalDashboard = () => api.get('/clinical/dashboard');
export const getClinicalStats = () => api.get('/clinical/stats');

// Patients
export const getPatients = () => api.get('/clinical/patients');
export const getPatient = (patientId) => api.get(`/clinical/patients/${patientId}`);
export const createPatient = (patientData) => api.post('/clinical/patients', patientData);
export const updatePatient = (patientId, patientData) => api.put(`/clinical/patients/${patientId}`, patientData);
export const deletePatient = (patientId) => api.delete(`/clinical/patients/${patientId}`);
export const searchPatients = (query) => api.get(`/clinical/patients/search?q=${query}`);
export const getRecentPatients = (limit = 3) => api.get(`/clinical/recent-patients?limit=${limit}`);

// Assessments
export const getAssessments = () => api.get('/clinical/assessments');
export const getPatientAssessments = (patientId) => api.get(`/clinical/patients/${patientId}/assessments`);
export const getAssessment = (assessmentId) => api.get(`/clinical/assessments/${assessmentId}`);
export const createAssessment = (patientId, assessmentData) => api.post(`/clinical/patients/${patientId}/assessments`, assessmentData);
export const updateAssessment = (assessmentId, assessmentData) => api.put(`/clinical/assessments/${assessmentId}`, assessmentData);
export const deleteAssessment = (assessmentId) => api.delete(`/clinical/assessments/${assessmentId}`);
export const getRecentAssessments = (limit = 3) => api.get(`/clinical/recent-assessments?limit=${limit}`);

// Reports
export const getReports = () => api.get('/clinical/reports');
export const getPatientReports = (patientId) => api.get(`/clinical/patients/${patientId}/reports`);
export const getReport = (reportId) => api.get(`/clinical/reports/${reportId}`);
export const createReport = (patientId, reportData) => api.post(`/clinical/patients/${patientId}/reports`, reportData);
export const updateReport = (reportId, reportData) => api.put(`/clinical/reports/${reportId}`, reportData);
export const deleteReport = (reportId) => api.delete(`/clinical/reports/${reportId}`);

// Drugs/Medications
export const getDrugs = () => api.get('/clinical/drugs');
export const getDrug = (drugId) => api.get(`/clinical/drugs/${drugId}`);
export const searchDrugs = (query) => api.get(`/clinical/drugs/search?q=${query}`);

// ML Model endpoints
export const predictDrug = (patientData) => api.post('/clinical/predict/drug', patientData);
export const getModelInfo = () => api.get('/clinical/model/info');

// ==================== PUBLIC ENDPOINTS ====================
export const getWelcomeMessage = () => api.get('/');
export const getAbout = () => api.get('/about');
export const getContact = () => api.get('/contact');
export const sendContactMessage = (messageData) => api.post('/contact', messageData);

export default api;