from app.extensions import db
from datetime import datetime
from flask import request

class AuditLog(db.Model):
    """System audit trail for compliance and security"""
    __tablename__ = 'audit_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Action details
    action = db.Column(db.String(100), nullable=False)  
    resource_type = db.Column(db.String(50))  
    resource_id = db.Column(db.Integer)  
    
    # Request metadata
    ip_address = db.Column(db.String(45))  
    user_agent = db.Column(db.String(200))
    
    # Outcome
    success = db.Column(db.Boolean, default=True)
    details = db.Column(db.Text)  
    
    
    user = db.relationship('User', back_populates='audit_entries', foreign_keys=[user_id])
    
    def __repr__(self):
        return f"<AuditLog {self.id}: {self.action} by User {self.user_id} at {self.timestamp}>"
    
    def to_dict(self):
        """Return audit log data as dictionary for API responses"""
        return {
            'id': self.id,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'user': {
                'id': self.user.id,
                'full_name': self.user.full_name
            } if self.user else None,
            'user_id': self.user_id,
            'action': self.action,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'success': self.success,
            'details': self.details
        }
    
    def to_csv_row(self):
        """Return audit log data as CSV row"""
        return [
            self.id,
            self.timestamp.isoformat() if self.timestamp else '',
            self.user.full_name if self.user else f'User {self.user_id}',
            self.action,
            self.resource_type or '',
            self.resource_id or '',
            self.ip_address or '',
            self.user_agent or '',
            'Success' if self.success else 'Failed',
            self.details or ''
        ]
    
    @staticmethod
    def get_csv_headers():
        """Return CSV headers for export"""
        return ['ID', 'Timestamp', 'User', 'Action', 'Resource Type', 
                'Resource ID', 'IP Address', 'User Agent', 'Status', 'Details']


# Audit logging helper function
def log_audit(user_id=None, action=None, resource_type=None, resource_id=None, 
              success=True, details=None, ip_address=None, user_agent=None):
    """
    Helper function to create audit log entries
    """
    from flask import has_request_context, request
    
   
    if has_request_context():
        if ip_address is None:
            ip_address = request.remote_addr
        if user_agent is None:
            user_agent = request.user_agent.string if request.user_agent else None
    
    
    if not action:
        print("Warning: Attempted to create audit log without action")
        return None
    
    log = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        success=success,
        details=details,
        ip_address=ip_address,
        user_agent=user_agent,
        timestamp=datetime.utcnow()
    )
    
    try:
        db.session.add(log)
        db.session.commit()
        return log
    except Exception as e:
        db.session.rollback()
        print(f"Failed to create audit log: {e}")
        return None


# Common audit action constants
class AuditActions:
    # Authentication
    LOGIN_SUCCESS = 'LOGIN_SUCCESS'
    LOGIN_FAILED = 'LOGIN_FAILED'
    LOGOUT = 'LOGOUT'
    PASSWORD_RESET_REQUEST = 'PASSWORD_RESET_REQUEST'
    PASSWORD_RESET_COMPLETE = 'PASSWORD_RESET_COMPLETE'
    
    # User management
    ACCOUNT_CREATED = 'ACCOUNT_CREATED'
    USER_VERIFIED = 'USER_VERIFIED'
    USER_REJECTED = 'USER_REJECTED'
    USER_STATUS_TOGGLED = 'USER_STATUS_TOGGLED'
    ROLE_CHANGED = 'ROLE_CHANGED'
    
    # Patient management
    PATIENT_CREATED = 'PATIENT_CREATED'
    PATIENT_UPDATED = 'PATIENT_UPDATED'
    PATIENT_VIEWED = 'PATIENT_VIEWED'
    
    # Assessments
    ASSESSMENT_CREATED = 'ASSESSMENT_CREATED'
    ASSESSMENT_VIEWED = 'ASSESSMENT_VIEWED'
    ASSESSMENT_FINALIZED = 'ASSESSMENT_FINALIZED'
    
    # Reports
    REPORT_GENERATED = 'REPORT_GENERATED'
    REPORT_VIEWED = 'REPORT_VIEWED'
    REPORT_PRINTED = 'REPORT_PRINTED'
    REPORT_DOWNLOADED = 'REPORT_DOWNLOADED'
    
    # Admin actions
    SYSTEM_CONFIG_CHANGED = 'SYSTEM_CONFIG_CHANGED'
    DATA_EXPORTED = 'DATA_EXPORTED'

