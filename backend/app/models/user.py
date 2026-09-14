# app/models/user.py
from app.extensions import db, bcrypt
from flask_login import UserMixin
from datetime import datetime, timedelta
import secrets

class User(db.Model, UserMixin):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    
    # Professional verification
    license_number = db.Column(db.String(50), unique=True, nullable=True)
    institution = db.Column(db.String(200), nullable=True)
    specialization = db.Column(db.String(100), nullable=True)
    professional_id = db.Column(db.String(50), nullable=True)
    is_verified = db.Column(db.Boolean, default=False)
    verified_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    verified_at = db.Column(db.DateTime, nullable=True)
    
    # Account status
    is_active = db.Column(db.Boolean, default=True)
    role = db.Column(db.String(50), default='pending')
    
    # Security fields
    failed_login_attempts = db.Column(db.Integer, default=0)
    locked_until = db.Column(db.DateTime, nullable=True)
    last_login_ip = db.Column(db.String(45), nullable=True)
    last_login_at = db.Column(db.DateTime, nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Password reset
    reset_token = db.Column(db.String(100), unique=True, nullable=True)
    reset_token_expiry = db.Column(db.DateTime, nullable=True)
    
   
    verified_users = db.relationship('User', 
                                     foreign_keys='User.verified_by',
                                     backref=db.backref('verifier', remote_side=[id]),
                                     lazy=True)
    
    # Patients registered by this user
    patients_registered = db.relationship('Patient', 
                                         back_populates='registrar', 
                                         lazy=True,
                                         foreign_keys='Patient.created_by')
    
    
    assessments_performed = db.relationship('PatientAssessment', 
                                           back_populates='assessor', 
                                           lazy=True,
                                           foreign_keys='PatientAssessment.assessed_by')
    
    
    reports_generated = db.relationship('ClinicalReport', 
                                       back_populates='generator', 
                                       lazy=True,
                                       foreign_keys='ClinicalReport.generated_by')
    
    # Audit entries for this user
    audit_entries = db.relationship('AuditLog', back_populates='user', lazy=True)
    
    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    
    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)
    
    def generate_reset_token(self, expires_in=3600):
        self.reset_token = secrets.token_urlsafe(32)
        self.reset_token_expiry = datetime.utcnow() + timedelta(seconds=expires_in)
        db.session.commit()
        return self.reset_token
    
    def verify_reset_token(self, token):
        if self.reset_token != token:
            return False
        if datetime.utcnow() > self.reset_token_expiry:
            return False
        return True
    
    def clear_reset_token(self):
        self.reset_token = None
        self.reset_token_expiry = None
        db.session.commit()
    
    def record_failed_login(self):
        self.failed_login_attempts += 1
        if self.failed_login_attempts >= 5:
            self.locked_until = datetime.utcnow() + timedelta(minutes=15)
        db.session.commit()
    
    def reset_failed_login(self):
        self.failed_login_attempts = 0
        self.locked_until = None
        db.session.commit()
    
    def is_locked(self):
        if self.locked_until and self.locked_until > datetime.utcnow():
            return True
        return False
    
    def verify_professional(self, admin_user):
        self.is_verified = True
        self.is_active = True
        self.role = 'clinician'
        self.verified_by = admin_user.id
        self.verified_at = datetime.utcnow()
        db.session.commit()
    
    @property
    def name(self):
        return self.full_name
    
    @property
    def verifier(self):
        """Get the user who verified this user"""
        if self.verified_by:
            return User.query.get(self.verified_by)
        return None
    
    def to_dict(self):
        """Return user data as dictionary for API responses"""
        return {
            'id': self.id,
            'full_name': self.full_name,
            'email': self.email,
            'role': self.role,
            'specialization': self.specialization,
            'license_number': self.license_number,
            'institution': self.institution,
            'is_verified': self.is_verified,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login_at': self.last_login_at.isoformat() if self.last_login_at else None,
            'verified_by': self.verified_by,
            'verified_at': self.verified_at.isoformat() if self.verified_at else None
        }
    
    def __repr__(self):
        return f"User('{self.email}', '{self.full_name}', '{self.role}')"
