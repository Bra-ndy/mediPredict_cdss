import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './ContactMessages.css';

const ContactMessages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await api.get('/contact/messages');
      if (response.data.success) {
        setMessages(response.data.messages);
      }
      setError('');
    } catch (err) {
      setError('Failed to load messages');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageId) => {
    try {
      await api.post(`/contact/messages/${messageId}/mark-read`);
      setMessages(messages.map(msg => 
        msg.id === messageId ? { ...msg, status: 'read' } : msg
      ));
    } catch (err) {
      console.error('Error marking message as read:', err);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-KE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Africa/Nairobi'
    });
  };

  const filteredMessages = messages.filter(msg => {
    if (filter === 'unread') return msg.status === 'unread';
    if (filter === 'read') return msg.status === 'read';
    return true;
  });

  const unreadCount = messages.filter(msg => msg.status === 'unread').length;

  if (loading) {
    return (
      <div className="contact-messages-loading">
        <div className="loading-spinner"></div>
        <p>Loading messages...</p>
      </div>
    );
  }

  return (
    <div className="contact-messages">
      <div className="page-header">
        <h1>
          <i className="fas fa-envelope"></i>
          Contact Messages
        </h1>
        <div className="stats-badge">
          <i className="fas fa-envelope-open-text"></i>
          {unreadCount} unread
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <i className="fas fa-exclamation-circle"></i>
          {error}
        </div>
      )}

      <div className="filters-bar">
        <div className="filter-buttons">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({messages.length})
          </button>
          <button 
            className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            Unread ({unreadCount})
          </button>
          <button 
            className={`filter-btn ${filter === 'read' ? 'active' : ''}`}
            onClick={() => setFilter('read')}
          >
            Read ({messages.length - unreadCount})
          </button>
        </div>
        <button className="btn-refresh" onClick={fetchMessages}>
          <i className="fas fa-sync-alt"></i> Refresh
        </button>
      </div>

      {filteredMessages.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-inbox empty-icon"></i>
          <h3>No messages found</h3>
          <p>Contact messages from users will appear here</p>
        </div>
      ) : (
        <div className="messages-grid">
          {filteredMessages.map((message) => (
            <div 
              key={message.id} 
              className={`message-card ${message.status === 'unread' ? 'unread' : 'read'}`}
              onClick={() => {
                setSelectedMessage(message);
                if (message.status === 'unread') {
                  markAsRead(message.id);
                }
              }}
            >
              <div className="message-header">
                <div className="sender-info">
                  <div className="sender-name">
                    <i className={`fas ${message.status === 'unread' ? 'fa-envelope' : 'fa-envelope-open'}`}></i>
                    <strong>{message.name}</strong>
                  </div>
                  <div className="sender-email">{message.email}</div>
                </div>
                <div className="message-date">{formatDate(message.timestamp)}</div>
              </div>
              <div className="message-subject">
                <span className="subject-label">Subject:</span> {message.subject}
              </div>
              <div className="message-preview">
                {message.message.substring(0, 100)}...
              </div>
              {message.status === 'unread' && (
                <div className="unread-badge">New</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Message Details Modal */}
      {selectedMessage && (
        <div className="modal-overlay" onClick={() => setSelectedMessage(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <i className="fas fa-envelope"></i>
                Message Details
              </h3>
              <button className="modal-close" onClick={() => setSelectedMessage(null)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <label>From:</label>
                <div>
                  <strong>{selectedMessage.name}</strong>
                  <span className="detail-email"> ({selectedMessage.email})</span>
                </div>
              </div>
              <div className="detail-row">
                <label>Date:</label>
                <div>{formatDate(selectedMessage.timestamp)}</div>
              </div>
              <div className="detail-row">
                <label>Subject:</label>
                <div className="detail-subject">{selectedMessage.subject}</div>
              </div>
              <div className="detail-row">
                <label>Message:</label>
                <div className="detail-message">{selectedMessage.message}</div>
              </div>
            </div>
            <div className="modal-footer">
              <a 
                href={`mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.subject}`}
                className="btn-reply"
              >
                <i className="fas fa-reply"></i> Reply via Email
              </a>
              <button className="btn-outline" onClick={() => setSelectedMessage(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactMessages;