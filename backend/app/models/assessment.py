from app.extensions import db
from datetime import datetime

class PatientAssessment(db.Model):
    """Clinical assessment records"""
    __tablename__ = 'patient_assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    assessed_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    assessment_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Vital Signs
    systolic_bp = db.Column(db.Integer)
    diastolic_bp = db.Column(db.Integer)
    heart_rate = db.Column(db.Integer)
    respiratory_rate = db.Column(db.Integer)
    temperature = db.Column(db.Float)
    oxygen_saturation = db.Column(db.Integer)
    
    # Lab Results
    fasting_glucose = db.Column(db.Float)
    random_glucose = db.Column(db.Float)
    hba1c = db.Column(db.Float)
    total_cholesterol = db.Column(db.Float)
    ldl_cholesterol = db.Column(db.Float)
    hdl_cholesterol = db.Column(db.Float)
    triglycerides = db.Column(db.Float)
    creatinine = db.Column(db.Float)
    egfr = db.Column(db.Float)
    
    # Anthropometrics
    weight_kg = db.Column(db.Float)
    height_cm = db.Column(db.Float)
    bmi = db.Column(db.Float)
    
    # Lifestyle
    smoker = db.Column(db.String(10))
    alcohol_consumption = db.Column(db.String(50))
    exercise_frequency = db.Column(db.String(50))
    
    # Clinical Assessment
    chief_complaint = db.Column(db.Text)
    symptoms = db.Column(db.Text)
    assessment_notes = db.Column(db.Text)
    diagnosis = db.Column(db.Text)
    
    # AI Recommendation
    ai_recommended_drug = db.Column(db.String(100))
    ai_confidence = db.Column(db.Float)
    ai_alternatives = db.Column(db.Text)
    ai_explanation = db.Column(db.Text)
    ai_model_version = db.Column(db.String(20))
    
    # Clinician Decision
    clinician_decision = db.Column(db.String(50))
    clinician_selected_drug = db.Column(db.String(100))
    clinician_notes = db.Column(db.Text)
    follow_up_date = db.Column(db.Date)
    
    # Metadata
    is_completed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships - FIXED: Use back_populates to match user.py
    patient = db.relationship('Patient', back_populates='assessments')
    assessor = db.relationship('User', back_populates='assessments_performed', foreign_keys=[assessed_by])
    reports = db.relationship('ClinicalReport', back_populates='assessment', lazy=True)
    
    @property
    def bp_category(self):
        if not self.systolic_bp or not self.diastolic_bp:
            return "Unknown"
        if self.systolic_bp < 120 and self.diastolic_bp < 80:
            return "Normal"
        elif self.systolic_bp < 130 and self.diastolic_bp < 80:
            return "Elevated"
        elif self.systolic_bp < 140 or self.diastolic_bp < 90:
            return "Stage 1 Hypertension"
        else:
            return "Stage 2 Hypertension"
    
    @property
    def glucose_category(self):
        if not self.fasting_glucose:
            return "Unknown"
        if self.fasting_glucose < 100:
            return "Normal"
        elif self.fasting_glucose < 126:
            return "Prediabetes"
        else:
            return "Diabetes"
    
    @property
    def bmi_category(self):
        if not self.bmi:
            return "Unknown"
        if self.bmi < 18.5:
            return "Underweight"
        elif self.bmi < 25:
            return "Normal"
        elif self.bmi < 30:
            return "Overweight"
        else:
            return "Obese"
    
    @property
    def heart_rate_category(self):
        if not self.heart_rate:
            return "Unknown"
        if self.heart_rate < 60:
            return "Bradycardia"
        elif self.heart_rate <= 100:
            return "Normal"
        else:
            return "Tachycardia"
    
    @property
    def oxygen_category(self):
        if not self.oxygen_saturation:
            return "Unknown"
        if self.oxygen_saturation >= 95:
            return "Normal"
        elif self.oxygen_saturation >= 90:
            return "Mild Hypoxia"
        else:
            return "Severe Hypoxia"
    
    def to_dict(self):
        """Return assessment data as dictionary for API responses"""
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'assessed_by_id': self.assessed_by,
            'assessor_name': self.assessor.full_name if self.assessor else None,
            'assessment_date': self.assessment_date.isoformat() if self.assessment_date else None,
            
            # Vital Signs
            'systolic_bp': self.systolic_bp,
            'diastolic_bp': self.diastolic_bp,
            'heart_rate': self.heart_rate,
            'respiratory_rate': self.respiratory_rate,
            'temperature': self.temperature,
            'oxygen_saturation': self.oxygen_saturation,
            
            # Categories
            'bp_category': self.bp_category,
            'heart_rate_category': self.heart_rate_category,
            'oxygen_category': self.oxygen_category,
            
            # Lab Results
            'fasting_glucose': self.fasting_glucose,
            'random_glucose': self.random_glucose,
            'hba1c': self.hba1c,
            'total_cholesterol': self.total_cholesterol,
            'ldl_cholesterol': self.ldl_cholesterol,
            'hdl_cholesterol': self.hdl_cholesterol,
            'triglycerides': self.triglycerides,
            'creatinine': self.creatinine,
            'egfr': self.egfr,
            
            # Anthropometrics
            'weight_kg': self.weight_kg,
            'height_cm': self.height_cm,
            'bmi': self.bmi,
            'bmi_category': self.bmi_category,
            
            # Lifestyle
            'smoker': self.smoker,
            'alcohol_consumption': self.alcohol_consumption,
            'exercise_frequency': self.exercise_frequency,
            
            # Clinical
            'chief_complaint': self.chief_complaint,
            'symptoms': self.symptoms,
            'assessment_notes': self.assessment_notes,
            'diagnosis': self.diagnosis,
            
            # AI
            'ai_recommended_drug': self.ai_recommended_drug,
            'ai_confidence': self.ai_confidence,
            'ai_alternatives': self.ai_alternatives,
            'ai_explanation': self.ai_explanation,
            'ai_model_version': self.ai_model_version,
            
            # Clinician
            'clinician_decision': self.clinician_decision,
            'clinician_selected_drug': self.clinician_selected_drug,
            'clinician_notes': self.clinician_notes,
            'follow_up_date': self.follow_up_date.isoformat() if self.follow_up_date else None,
            
            # Status
            'is_completed': self.is_completed,
            'glucose_category': self.glucose_category,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def to_summary_dict(self):
        """Return minimal assessment data for list views"""
        return {
            'id': self.id,
            'assessment_date': self.assessment_date.isoformat() if self.assessment_date else None,
            'systolic_bp': self.systolic_bp,
            'diastolic_bp': self.diastolic_bp,
            'heart_rate': self.heart_rate,
            'bmi': self.bmi,
            'fasting_glucose': self.fasting_glucose,
            'ai_recommended_drug': self.ai_recommended_drug,
            'ai_confidence': self.ai_confidence,
            'clinician_decision': self.clinician_decision,
            'is_completed': self.is_completed,
            'assessor_name': self.assessor.full_name if self.assessor else None
        }
    
    def __repr__(self):
        return f"Assessment(Patient: {self.patient_id}, Date: {self.assessment_date})"

