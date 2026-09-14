import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import './BaseLayout.css';

const BaseLayout = ({ children, title = 'MediPredict CDSS' }) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [flashMessages, setFlashMessages] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
        setIsAuthenticated(true);
        
        // If user is admin, fetch pending count
        if (user.role === 'admin') {
          fetchPendingCount();
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    } else {
      setCurrentUser(null);
      setIsAuthenticated(false);
      setPendingCount(0);
    }
  }, [location.pathname]);

  // Fetch pending users count for admin with better error handling
  const fetchPendingCount = async () => {
    try {
      setLoading(true);
      console.log('📡 Fetching pending count...');
      
      // Try to get pending count
      const response = await api.get('/admin/pending-count');
      console.log('Pending count response:', response.data);
      setPendingCount(response.data.count || 0);
      
    } catch (err) {
      console.error(' Error fetching pending count:', err);
      
      // Fallback: Try to fetch actual pending users
      try {
        console.log('📡 Falling back to fetch pending users...');
        const usersResponse = await api.get('/admin/pending-users');
        console.log(' Pending users response:', usersResponse.data);
        
        if (usersResponse.data && Array.isArray(usersResponse.data)) {
          setPendingCount(usersResponse.data.length);
          console.log(`Found ${usersResponse.data.length} pending users`);
        } else {
          setPendingCount(0);
        }
      } catch (fallbackErr) {
        console.error(' Fallback also failed:', fallbackErr);
        
        // For development/testing, use mock data
        if (process.env.NODE_ENV === 'development') {
          console.log(' Using mock data for development');
          setPendingCount(3); // Mock 3 pending users
        } else {
          setPendingCount(0);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Refresh pending count when on pending-users page
  useEffect(() => {
    if (currentUser?.role === 'admin' && location.pathname.includes('/admin/pending-users')) {
      fetchPendingCount();
    }
  }, [location.pathname]);

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    setCurrentUser(null);
    setIsAuthenticated(false);
    setPendingCount(0);
    addFlashMessage('You have been logged out successfully', 'success');
    navigate('/');
  };

  const addFlashMessage = (message, category = 'info') => {
    const id = Date.now();
    setFlashMessages(prev => [...prev, { id, message, category }]);
    
    setTimeout(() => {
      removeFlashMessage(id);
    }, 5000);
  };

  const removeFlashMessage = (id) => {
    setFlashMessages(prev => prev.filter(msg => msg.id !== id));
  };

  const getFlashIcon = (category) => {
    switch(category) {
      case 'success': return 'check-circle';
      case 'error':
      case 'danger': return 'exclamation-circle';
      case 'warning': return 'exclamation-triangle';
      default: return 'info-circle';
    }
  };

  const getUserInitials = () => {
    if (!currentUser?.full_name) return 'U';
    return currentUser.full_name.charAt(0).toUpperCase();
  };

  const getDashboardLink = () => {
    if (!currentUser) return '/';
    if (currentUser.role === 'pending') return '/pending-verification';
    return currentUser.role === 'admin' ? '/admin/dashboard' : '/clinical/dashboard';
  };

  const getDashboardIcon = () => {
    if (!currentUser) return 'fa-home';
    if (currentUser.role === 'pending') return 'fa-clock';
    return currentUser.role === 'admin' ? 'fa-shield-alt' : 'fa-tachometer-alt';
  };

  const getDashboardText = () => {
    if (!currentUser) return 'Home';
    if (currentUser.role === 'pending') return 'Pending';
    return currentUser.role === 'admin' ? 'Admin Dashboard' : 'Dashboard';
  };

  // Don't show navigation for pending users except pending page
  if (currentUser?.role === 'pending' && !location.pathname.includes('/pending-verification')) {
    return (
      <div className="base-layout">
        <header>
          <div className="container">
            <div className="header-content">
              <Link to="/" className="logo">
                <div className="logo-text">
                  <div className="title-container">
                    <h1>MediPredict</h1>
                    <span className="logo-badge">CDSS</span>
                  </div>
                  <p>Clinical Decision Support System</p>
                </div>
              </Link>
              <button onClick={handleLogout} className="btn-logout">
                <i className="fas fa-sign-out-alt"></i> Logout
              </button>
            </div>
          </div>
        </header>
        <main className="main-content">
          <div className="container">
            {children}
          </div>
        </main>
        <footer className="app-footer">
          <div className="container">
            <div className="footer-content">
              <div className="footer-left">
                <h3>MediPredict CDSS</h3>
                <p>Clinical Decision Support System for Healthcare Professionals</p>
              </div>
              <div className="footer-right">
                <p>&copy; 2026 MediPredict. All rights reserved.</p>
                <p>For professional medical use only</p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="base-layout">
      <header>
        <div className="container">
          <div className="header-content">
            <Link to="/" className="logo">
              <div className="logo-text">
                <div className="title-container">
                  <h1>MediPredict</h1>
                  <span className="logo-badge">CDSS</span>
                </div>
                <p>Clinical Decision Support System</p>
              </div>
            </Link>

            <nav>
              <ul>
                {isAuthenticated && currentUser?.role !== 'pending' ? (
                  <>
                    {/* Dynamic Dashboard Link based on role */}
                    <li>
                      <Link 
                        to={getDashboardLink()} 
                        className={isActive(currentUser?.role === 'admin' ? '/admin/dashboard' : '/clinical/dashboard') ? 'active' : ''}
                        title={getDashboardText()}
                      >
                        <i className={`fas ${getDashboardIcon()}`}></i>
                        <span>{getDashboardText()}</span>
                      </Link>
                    </li>
                    
                    {/* Clinical Links - For clinicians */}
                    {currentUser?.role !== 'admin' && (
                      <>
                        <li>
                          <Link 
                            to="/clinical/patient-search" 
                            className={isActive('/clinical/patient-search') || 
                                     isActive('/clinical/register-patient') || 
                                     isActive('/clinical/view-patient') ? 'active' : ''}
                            title="Patients"
                          >
                            <i className="fas fa-users"></i>
                            <span>Patients</span>
                          </Link>
                        </li>
                        {/* Disease Predictor link removed from navigation */}
                      </>
                    )}

                    {/* Admin Links - Only for admin users */}
                    {currentUser?.role === 'admin' && (
                      <>
                        <li className="nav-item-with-badge">
                          <Link 
                            to="/admin/pending-users" 
                            className={isActive('/admin/pending-users') ? 'active' : ''}
                            title="Pending Verifications"
                          >
                            <i className="fas fa-user-clock"></i>
                            <span>Pending</span>
                            {pendingCount > 0 && (
                              <span className="pending-badge-nav">{pendingCount}</span>
                            )}
                            {loading && (
                              <span className="pending-count-loading"></span>
                            )}
                          </Link>
                        </li>
                        <li>
                          <Link 
                            to="/admin/verified-users" 
                            className={isActive('/admin/verified-users') ? 'active' : ''}
                            title="Manage Users"
                          >
                            <i className="fas fa-users-cog"></i>
                            <span>Users</span>
                          </Link>
                        </li>
                        <li>
                          <Link 
                            to="/admin/contact-messages" 
                            className={isActive('/admin/contact-messages') ? 'active' : ''}
                            title="Contact Messages"
                          >
                            <i className="fas fa-envelope"></i>
                            <span>Messages</span>
                          </Link>
                        </li>
                        <li>
                          <Link 
                            to="/admin/audit-logs" 
                            className={isActive('/admin/audit-logs') ? 'active' : ''}
                            title="Audit Logs"
                          >
                            <i className="fas fa-history"></i>
                            <span>Audit</span>
                          </Link>
                        </li>
                        {/* Disease Predictor link removed from navigation for admin as well */}
                      </>
                    )}

                    {/* About Link - Always visible for authenticated users */}
                    <li>
                      <Link 
                        to="/about" 
                        className={isActive('/about') ? 'active' : ''}
                        title="About"
                      >
                        <i className="fas fa-info-circle"></i>
                        <span>About</span>
                      </Link>
                    </li>
                    
                    {/* Contact Link - Only show for non-admin users */}
                    {currentUser?.role !== 'admin' && (
                      <li>
                        <Link 
                          to="/contact" 
                          className={isActive('/contact') ? 'active' : ''}
                          title="Contact"
                        >
                          <i className="fas fa-envelope"></i>
                          <span>Contact</span>
                        </Link>
                      </li>
                    )}

                    {/* User Menu */}
                    <li className="user-menu">
                      <div 
                        className="user-avatar"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      >
                        {getUserInitials()}
                        {currentUser?.role === 'admin' && pendingCount > 0 && (
                          <span className="avatar-badge">{pendingCount}</span>
                        )}
                      </div>
                      {isDropdownOpen && (
                        <div className="user-dropdown">
                          <div className="user-info-dropdown">
                            <strong>{currentUser?.full_name || 'User'}</strong>
                            <span className="user-role-badge">{currentUser?.role}</span>
                          </div>
                          <div className="dropdown-divider"></div>
                          <Link to="/profile" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                            <i className="fas fa-user"></i> Profile
                          </Link>
                          {/* Disease Predictor link removed from dropdown menu */}
                          {currentUser?.role === 'admin' && (
                            <>
                              <Link to="/admin/pending-users" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                                <i className="fas fa-user-clock"></i> 
                                Pending Verifications
                                {pendingCount > 0 && (
                                  <span className="dropdown-badge">{pendingCount}</span>
                                )}
                              </Link>
                              <Link to="/admin/contact-messages" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                                <i className="fas fa-envelope"></i> Contact Messages
                              </Link>
                              <Link to="/admin/settings" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                                <i className="fas fa-cog"></i> Settings
                              </Link>
                            </>
                          )}
                          <div className="dropdown-divider"></div>
                          <button onClick={handleLogout} className="dropdown-item text-danger">
                            <i className="fas fa-sign-out-alt"></i> Logout
                          </button>
                        </div>
                      )}
                    </li>
                  </>
                ) : !isAuthenticated ? (
                  // Non-authenticated menu
                  <>
                    <li>
                      <Link 
                        to="/" 
                        className={isActive('/') ? 'active' : ''}
                        title="Home"
                      >
                        <i className="fas fa-home"></i>
                        <span>Home</span>
                      </Link>
                    </li>
                    <li>
                      <Link 
                        to="/about" 
                        className={isActive('/about') ? 'active' : ''}
                        title="About"
                      >
                        <i className="fas fa-info-circle"></i>
                        <span>About</span>
                      </Link>
                    </li>
                    <li>
                      <Link 
                        to="/contact" 
                        className={isActive('/contact') ? 'active' : ''}
                        title="Contact"
                      >
                        <i className="fas fa-envelope"></i>
                        <span>Contact</span>
                      </Link>
                    </li>
                    
                    <li className="auth-buttons">
                      <Link to="/login" className="btn-login">
                        <i className="fas fa-sign-in-alt"></i> Login
                      </Link>
                      <Link to="/signup" className="btn-signup">
                        <i className="fas fa-user-plus"></i> Sign Up
                      </Link>
                    </li>
                  </>
                ) : null}
              </ul>
            </nav>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="container">
          {flashMessages.length > 0 && (
            <div className="flash-messages">
              {flashMessages.map(msg => (
                <div 
                  key={msg.id} 
                  className={`flash-message flash-${msg.category}`}
                  onClick={() => removeFlashMessage(msg.id)}
                >
                  <i className={`fas fa-${getFlashIcon(msg.category)}`}></i>
                  {msg.message}
                </div>
              ))}
            </div>
          )}

          {/* REMOVED: <h1 className="page-title">{title}</h1> */}

          {children}
        </div>
      </main>

      <footer className="app-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-left">
              <h3>MediPredict CDSS</h3>
              <p>Clinical Decision Support System for Healthcare Professionals</p>
            </div>
            <div className="footer-right">
              <p>&copy; 2026 MediPredict. All rights reserved.</p>
              <p>For professional medical use only</p>
            </div>
          </div>
        </div>
      </footer>

      {isDropdownOpen && (
        <div 
          className="dropdown-overlay" 
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  );
};

export default BaseLayout;