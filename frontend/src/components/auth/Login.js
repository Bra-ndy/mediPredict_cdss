import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';

const Login = () => {
  const navigate = useNavigate();
  
  // State for form data
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: false
  });
  
  // State for loading and errors
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Debug effect
  useEffect(() => {
    console.log('📝 Login Page Mounted');
    console.log('Current pathname:', window.location.pathname);
    checkExistingLogin();
  }, []);

  const checkExistingLogin = () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    
    if (token && user) {
      console.log(' User already logged in:', user);
      console.log('User role:', user.role);
      
      if (window.location.pathname === '/login') {
        if (user.role === 'admin') {
          console.log(' Admin user - redirecting to /admin/dashboard');
          window.location.href = '/admin/dashboard';
        } else if (user.role === 'pending') {
          console.log(' Pending user - redirecting to /pending-verification');
          window.location.href = '/pending-verification';
        } else {
          console.log(' Clinician user - redirecting to /clinical/dashboard');
          window.location.href = '/clinical/dashboard';
        }
      }
    }
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    console.log(' Attempting login with:', { email: formData.email });

    try {
      const response = await api.post('/auth/login', {
        email: formData.email,
        password: formData.password
      });

      console.log(' Login response:', response.data);

      if (response.data.token) {
        console.log(' Token received');
        
        const user = response.data.user;
        
        // Check if user is pending
        if (user.role === 'pending') {
          setError('Your account is pending verification. Please wait for admin approval.');
          setLoading(false);
          return;
        }
        
        // Clear any existing tokens
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        
        // Store token based on remember me
        if (formData.remember) {
          localStorage.setItem('token', response.data.token);
        } else {
          sessionStorage.setItem('token', response.data.token);
        }
        
        // Store user data
        localStorage.setItem('user', JSON.stringify(user));
        console.log(' User stored:', user);
        
        setSuccess('Login successful! Redirecting...');
        
        console.log(' User role for redirect:', user.role);
        
        // Redirect based on role - USING DIRECT WINDOW LOCATION
        setTimeout(() => {
          if (user.role === 'admin') {
            console.log(' Redirecting admin to /admin/dashboard');
            window.location.href = '/admin/dashboard';
          } else if (user.role === 'clinician') {
            console.log(' Redirecting clinician to /clinical/dashboard');
            window.location.href = '/clinical/dashboard';
          } else {
            console.log(' Redirecting regular user to /clinical/dashboard');
            window.location.href = '/clinical/dashboard';
          }
        }, 500);
      } else {
        setError('Login failed: No token received from server');
      }
    } catch (err) {
      console.error(' Login error:', err);
      
      // Handle specific error messages
      if (err.response?.status === 403) {
        setError('Your account is pending verification. Please wait for admin approval.');
      } else {
        setError(
          err.response?.data?.message || 
          'Login failed. Please check your credentials and try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Styles object (keeping your existing styles)
  const styles = {
    container: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '70vh',
      padding: '1rem'
    },
    card: {
      maxWidth: '450px',
      width: '100%',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      padding: '2rem'
    },
    title: {
      color: '#2c3e50',
      fontSize: '1.8rem',
      marginBottom: '0.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    subtitle: {
      color: '#7f8c8d',
      marginBottom: '2rem'
    },
    formGroup: {
      marginBottom: '1.5rem'
    },
    label: {
      display: 'block',
      marginBottom: '0.5rem',
      color: '#34495e',
      fontWeight: '500'
    },
    input: {
      width: '100%',
      padding: '0.75rem',
      border: '1px solid #bdc3c7',
      borderRadius: '4px',
      fontSize: '1rem',
      transition: 'border-color 0.3s'
    },
    checkboxContainer: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    checkbox: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    checkboxInput: {
      width: 'auto',
      marginRight: '0.5rem'
    },
    forgotLink: {
      color: '#3498db',
      textDecoration: 'none'
    },
    button: {
      width: '100%',
      padding: '0.75rem',
      backgroundColor: '#3498db',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      fontSize: '1rem',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
      transition: 'background-color 0.3s'
    },
    buttonDisabled: {
      backgroundColor: '#95a5a6',
      cursor: 'not-allowed'
    },
    footer: {
      textAlign: 'center',
      marginTop: '2rem',
      color: '#7f8c8d'
    },
    signupLink: {
      color: '#3498db',
      textDecoration: 'none',
      fontWeight: '600'
    },
    errorAlert: {
      backgroundColor: '#f8d7da',
      color: '#721c24',
      padding: '1rem',
      borderRadius: '4px',
      marginBottom: '1rem',
      border: '1px solid #f5c6cb',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    successAlert: {
      backgroundColor: '#d4edda',
      color: '#155724',
      padding: '1rem',
      borderRadius: '4px',
      marginBottom: '1rem',
      border: '1px solid #c3e6cb',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    icon: {
      marginRight: '0.5rem',
      color: '#3498db'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>
          <i className="fas fa-sign-in-alt" style={styles.icon}></i>
          Login
        </h2>
        <p style={styles.subtitle}>Access your MediPredict CDSS account</p>
        
        {error && (
          <div style={styles.errorAlert}>
            <i className="fas fa-exclamation-circle" style={{marginRight: '0.5rem'}}></i>
            {error}
          </div>
        )}
        
        {success && (
          <div style={styles.successAlert}>
            <i className="fas fa-check-circle" style={{marginRight: '0.5rem'}}></i>
            {success}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label htmlFor="email" style={styles.label}>
              <i className="fas fa-envelope" style={styles.icon}></i>
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
              style={styles.input}
              disabled={loading}
            />
          </div>
          
          <div style={styles.formGroup}>
            <label htmlFor="password" style={styles.label}>
              <i className="fas fa-lock" style={styles.icon}></i>
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
              style={styles.input}
              disabled={loading}
            />
          </div>
          
          <div style={{...styles.formGroup, ...styles.checkboxContainer}}>
            <div style={styles.checkbox}>
              <input
                type="checkbox"
                id="remember"
                name="remember"
                checked={formData.remember}
                onChange={handleChange}
                style={styles.checkboxInput}
                disabled={loading}
              />
              <label htmlFor="remember" style={{fontWeight: 'normal'}}>Remember me</label>
            </div>
            <Link to="/forgot-password" style={styles.forgotLink}>
              Forgot Password?
            </Link>
          </div>
          
          <button 
            type="submit" 
            style={{
              ...styles.button,
              ...(loading ? styles.buttonDisabled : {})
            }}
            disabled={loading}
          >
            <i className="fas fa-sign-in-alt"></i>
            {loading ? 'Logging in...' : 'Login to Account'}
          </button>
        </form>
        
        <div style={styles.footer}>
          <p>
            Don't have an account?{' '}
            <Link to="/signup" style={styles.signupLink}>
              Sign up here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;