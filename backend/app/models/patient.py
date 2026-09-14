from app.extensions import db
from datetime import datetime

class Patient(db.Model):
    """Patient model for clinical records"""
    __tablename__ = 'patients'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.String(20), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # Personal Details
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    date_of_birth = db.Column(db.Date, nullable=False)
    gender = db.Column(db.String(20))
    marital_status = db.Column(db.String(20))
    occupation = db.Column(db.String(100))
    
    # Contact Information
    phone_number = db.Column(db.String(20), nullable=False)
    alternate_phone = db.Column(db.String(20))
    email = db.Column(db.String(120))
    
    # Address
    address_line1 = db.Column(db.String(200), nullable=False)
    address_line2 = db.Column(db.String(200))
    city = db.Column(db.String(100), nullable=False)
    state = db.Column(db.String(100))
    postal_code = db.Column(db.String(20))
    country = db.Column(db.String(100), default='Kenya')
    
    # Emergency Contact
    emergency_contact_name = db.Column(db.String(100))
    emergency_contact_phone = db.Column(db.String(20))
    emergency_contact_relation = db.Column(db.String(50))
    
    # Medical Information
    blood_type = db.Column(db.String(5))
    allergies = db.Column(db.Text)
    chronic_conditions = db.Column(db.Text)
    current_medications = db.Column(db.Text)
    past_surgeries = db.Column(db.Text)
    family_history = db.Column(db.Text)
    
    # Identification
    national_id = db.Column(db.String(20))
    insurance_provider = db.Column(db.String(100))
    insurance_number = db.Column(db.String(50))
    
    # Status
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationships
    assessments = db.relationship('PatientAssessment', back_populates='patient', lazy=True, cascade='all, delete-orphan')
    reports = db.relationship('ClinicalReport', back_populates='patient', lazy=True, cascade='all, delete-orphan')
    # FIXED: Add the missing registrar relationship to match User model
    registrar = db.relationship('User', back_populates='patients_registered', foreign_keys=[created_by])
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
    
    @property
    def age(self):
        today = datetime.now().date()
        return today.year - self.date_of_birth.year - ((today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day))
    
    @property
    def address_full(self):
        addr = self.address_line1
        if self.address_line2:
            addr += f", {self.address_line2}"
        addr += f", {self.city}"
        if self.state:
            addr += f", {self.state}"
        addr += f" {self.postal_code}, {self.country}"
        return addr
    
    def to_dict(self):
        """Return patient data as dictionary for API responses"""
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'full_name': self.full_name,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'age': self.age,
            'gender': self.gender,
            'date_of_birth': self.date_of_birth.strftime('%Y-%m-%d') if self.date_of_birth else None,
            'date_of_birth_display': self.date_of_birth.strftime('%d/%m/%Y') if self.date_of_birth else None,
            'marital_status': self.marital_status,
            'occupation': self.occupation,
            'phone_number': self.phone_number,
            'alternate_phone': self.alternate_phone,
            'email': self.email,
            'national_id': self.national_id,
            'address_line1': self.address_line1,
            'address_line2': self.address_line2,
            'city': self.city,
            'state': self.state,
            'postal_code': self.postal_code,
            'country': self.country,
            'address_full': self.address_full,
            'emergency_contact_name': self.emergency_contact_name,
            'emergency_contact_phone': self.emergency_contact_phone,
            'emergency_contact_relation': self.emergency_contact_relation,
            'blood_type': self.blood_type,
            'allergies': self.allergies,
            'chronic_conditions': self.chronic_conditions,
            'current_medications': self.current_medications,
            'past_surgeries': self.past_surgeries,
            'family_history': self.family_history,
            'insurance_provider': self.insurance_provider,
            'insurance_number': self.insurance_number,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'created_by': self.created_by
        }
    
    def to_summary_dict(self):
        """Return minimal patient data for list views"""
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'full_name': self.full_name,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'age': self.age,
            'gender': self.gender,
            'phone_number': self.phone_number,
            'email': self.email,
            'city': self.city,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f"Patient('{self.patient_id}', '{self.full_name}')"

