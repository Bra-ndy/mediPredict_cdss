from app.extensions import db
from datetime import datetime
import secrets

class ClinicalReport(db.Model):
    """Generated clinical reports"""
    __tablename__ = 'clinical_reports'
    
    id = db.Column(db.Integer, primary_key=True)
    report_id = db.Column(db.String(50), unique=True, nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    assessment_id = db.Column(db.Integer, db.ForeignKey('patient_assessments.id'), nullable=True)
    generated_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    generated_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    report_type = db.Column(db.String(50))  
    report_format = db.Column(db.String(20))  
    report_content = db.Column(db.Text)  
    report_file_path = db.Column(db.String(500))  
    
    # Sharing and status
    is_printed = db.Column(db.Boolean, default=False)
    printed_at = db.Column(db.DateTime)
    shared_with_patient = db.Column(db.Boolean, default=False)
    shared_at = db.Column(db.DateTime)
    
    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships - FIXED: Use back_populates instead of backref for consistency
    patient = db.relationship('Patient', foreign_keys=[patient_id], back_populates='reports')
    assessment = db.relationship('PatientAssessment', foreign_keys=[assessment_id], back_populates='reports')
    generator = db.relationship('User', foreign_keys=[generated_by], back_populates='reports_generated')
    
    def __init__(self, **kwargs):
        super(ClinicalReport, self).__init__(**kwargs)
        if not self.report_id:
            self.report_id = self.generate_report_id()
    
    @staticmethod
    def generate_report_id():
        """Generate a unique report ID"""
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        random_part = secrets.token_hex(3).upper()
        return f"RPT-{timestamp}-{random_part}"
    
    def mark_as_printed(self):
        """Mark report as printed"""
        self.is_printed = True
        self.printed_at = datetime.utcnow()
        db.session.commit()
    
    def mark_as_shared(self):
        """Mark report as shared with patient"""
        self.shared_with_patient = True
        self.shared_at = datetime.utcnow()
        db.session.commit()
    
    @property
    def file_extension(self):
        """Get file extension based on format"""
        if self.report_format == 'PDF':
            return '.pdf'
        return '.html'
    
    @property
    def filename(self):
        """Generate filename for download"""
        return f"report_{self.report_id}{self.file_extension}"
    
    def to_dict(self):
        """Return report data as dictionary for API responses"""
        return {
            'id': self.id,
            'report_id': self.report_id,
            'patient_id': self.patient_id,
            'assessment_id': self.assessment_id,
            'generated_by_id': self.generated_by,
            'generated_by_user': {
                'id': self.generator.id,
                'full_name': self.generator.full_name
            } if self.generator else None,
            'generated_at': self.generated_at.isoformat() if self.generated_at else None,
            'report_type': self.report_type,
            'report_format': self.report_format,
            'is_printed': self.is_printed,
            'printed_at': self.printed_at.isoformat() if self.printed_at else None,
            'shared_with_patient': self.shared_with_patient,
            'shared_at': self.shared_at.isoformat() if self.shared_at else None,
            'filename': self.filename
        }
    
    def to_detail_dict(self):
        """Return detailed report data including content"""
        data = self.to_dict()
        data['report_content'] = self.report_content
        data['report_file_path'] = self.report_file_path
        return data
    
    def __repr__(self):
        return f"Report('{self.report_id}', '{self.report_type}')"
