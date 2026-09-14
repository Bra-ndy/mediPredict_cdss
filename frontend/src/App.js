// App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { getWelcomeMessage } from './services/api';

// Auth Components
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';

// Admin Components
import AdminDashboard from './components/admin/AdminDashboard';
import PendingUsers from './components/admin/PendingUsers';
import VerifiedUsers from './components/admin/VerifiedUsers';
import UserDetails from './components/admin/UserDetails';
import AuditLogs from './components/admin/AuditLogs';
import AdminSettings from './components/admin/AdminSettings';
import ContactMessages from './components/admin/ContactMessages';

// Clinical Components
import ClinicalDashboard from './components/clinical/ClinicalDashboard';
import RegisterPatient from './components/clinical/RegisterPatient';
import PatientSearch from './components/clinical/PatientSearch';
import PatientAssessment from './components/clinical/PatientAssessment';
import PatientReports from './components/clinical/PatientReports';
import ViewPatient from './components/clinical/ViewPatient';
import ViewAssessment from './components/clinical/ViewAssessment';
import ViewReport from './components/clinical/ViewReport';
import EditPatient from './components/clinical/EditPatient';
import DiseasePredictor from './components/clinical/DiseasePredictor';

// Public Pages
import Home from './components/Home';
import About from './components/About';
import Contact from './components/Contact';
import Profile from './components/Profile';
import PendingVerification from './components/PendingVerification';

// Layout Component
import BaseLayout from './components/BaseLayout';

// Auth Guard Component
const RequireAuth = ({ children, allowedRoles = [] }) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  
  console.log(' Auth Guard Check:', {
    path: window.location.pathname,
    hasToken: !!token,
    user: user,
    allowedRoles: allowedRoles
  });

  // Not logged in
  if (!token) {
    console.log(' No token, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // No user data
  if (!user) {
    console.log(' No user data, redirecting to login');
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    return <Navigate to="/login" replace />;
  }

  // Special handling for pending users
  if (user.role === 'pending') {
    console.log(' Pending user - redirecting to pending verification page');
    if (window.location.pathname !== '/pending-verification') {
      return <Navigate to="/pending-verification" replace />;
    }
    return children;
  }

  // Check role if specific roles are required
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    console.log(` Role ${user.role} not allowed. Required: ${allowedRoles.join(', ')}`);
    
    // Redirect based on user's actual role
    if (user.role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else {
      return <Navigate to="/clinical/dashboard" replace />;
    }
  }

  console.log(' Access granted');
  return children;
};

function App() {
  const [apiData, setApiData] = useState({ message: '', version: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await getWelcomeMessage();
        console.log('API Response:', response.data);
        setApiData({
          message: response.data.message,
          version: response.data.version
        });
      } catch (error) {
        console.error('Error fetching data:', error);
        setApiData({
          message: 'Error connecting to backend',
          version: 'N/A'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  return (
    <Router>
      <BaseLayout>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          
          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          
          {/* Pending Verification Route */}
          <Route path="/pending-verification" element={
            <RequireAuth>
              <PendingVerification />
            </RequireAuth>
          } />
          
          {/* Protected Routes */}
          <Route path="/profile" element={
            <RequireAuth allowedRoles={['clinician', 'admin', 'supervisor']}>
              <Profile />
            </RequireAuth>
          } />
          
          {/* Clinical Routes */}
          <Route path="/clinical/dashboard" element={
            <RequireAuth allowedRoles={['clinician', 'admin', 'supervisor']}>
              <ClinicalDashboard />
            </RequireAuth>
          } />
          <Route path="/clinical/register-patient" element={
            <RequireAuth allowedRoles={['clinician', 'admin', 'supervisor']}>
              <RegisterPatient />
            </RequireAuth>
          } />
          <Route path="/clinical/patient-search" element={
            <RequireAuth allowedRoles={['clinician', 'admin', 'supervisor']}>
              <PatientSearch />
            </RequireAuth>
          } />
          <Route path="/clinical/assess-patient/:patientId" element={
            <RequireAuth allowedRoles={['clinician', 'admin', 'supervisor']}>
              <PatientAssessment />
            </RequireAuth>
          } />
          <Route path="/clinical/patient-reports/:patientId" element={
            <RequireAuth allowedRoles={['clinician', 'admin', 'supervisor']}>
              <PatientReports />
            </RequireAuth>
          } />
          <Route path="/clinical/view-patient/:patientId" element={
            <RequireAuth allowedRoles={['clinician', 'admin', 'supervisor']}>
              <ViewPatient />
            </RequireAuth>
          } />
          <Route path="/clinical/view-assessment/:patientId/:assessmentId" element={
            <RequireAuth allowedRoles={['clinician', 'admin', 'supervisor']}>
              <ViewAssessment />
            </RequireAuth>
          } />
          <Route path="/clinical/view-report/:patientId/:reportId" element={
            <RequireAuth allowedRoles={['clinician', 'admin', 'supervisor']}>
              <ViewReport />
            </RequireAuth>
          } />
          <Route path="/clinical/edit-patient/:patientId" element={
            <RequireAuth allowedRoles={['clinician', 'admin', 'supervisor']}>
              <EditPatient />
            </RequireAuth>
          } />
          
          {/* Disease Predictor Route - Now with authentication */}
          <Route path="/disease-predictor" element={
            <RequireAuth allowedRoles={['clinician', 'admin', 'supervisor']}>
              <DiseasePredictor />
            </RequireAuth>
          } />
          
          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={
            <RequireAuth allowedRoles={['admin']}>
              <AdminDashboard />
            </RequireAuth>
          } />
          <Route path="/admin/pending-users" element={
            <RequireAuth allowedRoles={['admin']}>
              <PendingUsers />
            </RequireAuth>
          } />
          <Route path="/admin/verified-users" element={
            <RequireAuth allowedRoles={['admin']}>
              <VerifiedUsers />
            </RequireAuth>
          } />
          <Route path="/admin/user-details/:userId" element={
            <RequireAuth allowedRoles={['admin']}>
              <UserDetails />
            </RequireAuth>
          } />
          <Route path="/admin/audit-logs" element={
            <RequireAuth allowedRoles={['admin']}>
              <AuditLogs />
            </RequireAuth>
          } />
          <Route path="/admin/settings" element={
            <RequireAuth allowedRoles={['admin']}>
              <AdminSettings />
            </RequireAuth>
          } />
          <Route path="/admin/contact-messages" element={
            <RequireAuth allowedRoles={['admin']}>
              <ContactMessages />
            </RequireAuth>
          } />
          
          {/* Redirects */}
          <Route path="/dashboard" element={<Navigate to="/clinical/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BaseLayout>
    </Router>
  );
}

export default App;