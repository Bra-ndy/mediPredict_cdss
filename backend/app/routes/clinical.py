from flask import Blueprint, request, jsonify, current_app, url_for
from app.models import Patient, PatientAssessment, ClinicalReport, User
from app import db
from datetime import datetime, timedelta
from sqlalchemy import or_, and_, func
from flask_jwt_extended import jwt_required, get_jwt_identity
import secrets
import os
import logging

# Import the disease predictor service
from app.services.disease_predictor import DiseasePredictor

bp = Blueprint('clinical', __name__, url_prefix='/clinical')

# Initialize disease predictor globally
disease_predictor = DiseasePredictor()
logger = logging.getLogger(__name__)

def generate_patient_id():
    """Generate a unique patient ID"""
    timestamp = datetime.now().strftime('%Y%m%d')
    random_part = secrets.token_hex(3).upper()
    return f"PAT-{timestamp}-{random_part}"

def extract_symptoms_from_text(symptoms_text):
    """Extract symptom keywords from free-text symptoms description"""
    if not symptoms_text or symptoms_text == '':
        return {}, []
    
    symptoms_text_lower = symptoms_text.lower()
    
    symptom_keywords = {
        'fever': ['fever', 'high temperature', 'feverish'],
        'cough': ['cough', 'coughing'],
        'fatigue': ['fatigue', 'tired', 'exhaustion', 'weakness', 'low energy', 'lethargy'],
        'headache': ['headache', 'head pain', 'migraine'],
        'runny_nose': ['runny nose', 'nasal discharge', 'running nose'],
        'sneezing': ['sneezing', 'sneeze'],
        'sore_throat': ['sore throat', 'throat pain', 'scratchy throat'],
        'muscle_aches': ['muscle ache', 'body ache', 'muscle pain', 'sore muscles'],
        'joint_pain': ['joint pain', 'joint ache'],
        'chest_pain': ['chest pain', 'chest tightness'],
        'shortness_breath': ['shortness of breath', 'dyspnea', 'breathing difficulty'],
        'nausea': ['nausea', 'queasy', 'sick to stomach'],
        'vomiting': ['vomiting', 'vomited', 'threw up', 'emesis'],
        'abdominal_pain': ['abdominal pain', 'stomach pain', 'belly pain'],
        'diarrhea': ['diarrhea', 'loose stool', 'watery stool'],
        'dizziness': ['dizziness', 'dizzy', 'lightheaded'],
        'chills': ['chills', 'shivering', 'rigors'],
        'nasal_congestion': ['nasal congestion', 'blocked nose', 'stuffy nose', 'congested'],
        'loss_smell': ['loss of smell', 'anosmia', "can't smell"],
        'loss_taste': ['loss of taste', 'ageusia', "can't taste"],
        'wheezing': ['wheezing', 'wheeze']
    }
    
    detected_symptoms = {}
    detected_list = []
    
    for symptom, keywords in symptom_keywords.items():
        for keyword in keywords:
            if keyword in symptoms_text_lower:
                detected_symptoms[symptom] = 1
                detected_list.append(symptom)
                break
    
    return detected_symptoms, detected_list

@bp.route('/ai-recommendation', methods=['POST'])
@jwt_required()
def get_ai_recommendation_endpoint():
    """AI recommendation endpoint that uses BOTH vitals AND symptoms"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # Extract parameters
        systolic_bp = data.get('systolic_bp')
        diastolic_bp = data.get('diastolic_bp')
        fasting_glucose = data.get('fasting_glucose')
        hba1c = data.get('hba1c')
        bmi = data.get('bmi')
        total_cholesterol = data.get('total_cholesterol')
        smoker = data.get('smoker', 'no')
        age = data.get('age', 0)
        symptoms_text = data.get('symptoms', '')
        
        print("="*60)
        print(" AI RECOMMENDATION REQUEST")
        print("="*60)
        print(f"Symptoms text: {symptoms_text[:100] if symptoms_text else 'None'}")
        
        # Load disease predictor model if symptoms are provided
        if symptoms_text and symptoms_text.strip():
            if disease_predictor.model is None:
                try:
                    disease_predictor.load_model()
                    print(f" Disease predictor model loaded: {disease_predictor.model is not None}")
                except Exception as e:
                    print(f" Error loading disease predictor: {e}")
        
        # Extract symptoms from text
        detected_symptoms, detected_list = extract_symptoms_from_text(symptoms_text)
        print(f"Extracted symptoms: {detected_list}")
        
        # Get disease prediction from ML model
        ml_predicted_disease = None
        symptom_confidence = 0
        top_predictions = []
        
        if detected_list and disease_predictor.model is not None:
            try:
                # Create symptoms dict for predictor
                symptoms_dict = {}
                for symptom in disease_predictor.symptom_columns or []:
                    symptoms_dict[symptom] = 1 if symptom in detected_list else 0
                
                # Get prediction
                prediction_result = disease_predictor.predict(symptoms_dict)
                if prediction_result:
                    ml_predicted_disease = prediction_result.get('predicted_disease')
                    symptom_confidence = prediction_result.get('confidence', 0) * 100
                    top_predictions = prediction_result.get('top_predictions', [])
                    print(f"✅ ML Model predicted: '{ml_predicted_disease}' ({symptom_confidence:.1f}%)")
            except Exception as e:
                print(f"Error in ML prediction: {e}")
        
        # OVERRIDE: Use symptom-based logic for better accuracy
        predicted_disease = None
        
        if detected_list:
            # Check for Common Cold symptoms
            cold_symptoms = ['runny_nose', 'sneezing', 'sore_throat']
            cold_match_count = sum(1 for s in cold_symptoms if s in detected_list)
            
            # Check for Flu symptoms
            flu_symptoms = ['fever', 'muscle_aches', 'fatigue', 'headache']
            flu_match_count = sum(1 for s in flu_symptoms if s in detected_list)
            
            # Check for COVID symptoms
            covid_symptoms = ['loss_smell', 'loss_taste', 'fever', 'cough']
            covid_match_count = sum(1 for s in covid_symptoms if s in detected_list)
            
            # Check for Gastroenteritis
            gastro_symptoms = ['nausea', 'vomiting', 'diarrhea', 'abdominal_pain']
            gastro_match_count = sum(1 for s in gastro_symptoms if s in detected_list)
            
            # Check for Bronchitis
            bronchitis_symptoms = ['cough', 'wheezing', 'chest_pain', 'shortness_breath']
            bronchitis_match_count = sum(1 for s in bronchitis_symptoms if s in detected_list)
            
            # Check for Pneumonia
            pneumonia_symptoms = ['fever', 'cough', 'chest_pain', 'shortness_breath', 'chills']
            pneumonia_match_count = sum(1 for s in pneumonia_symptoms if s in detected_list)
            
            # Check for Migraine
            migraine_symptoms = ['headache', 'nausea', 'dizziness', 'vomiting']
            migraine_match_count = sum(1 for s in migraine_symptoms if s in detected_list)
            
            # Check for Hypertension
            hypertension_symptoms = ['headache', 'dizziness', 'chest_pain']
            hypertension_match_count = sum(1 for s in hypertension_symptoms if s in detected_list)
            
            # Check for Diabetes
            diabetes_symptoms = ['fatigue', 'frequent_urination', 'thirst', 'weight_loss']
            diabetes_match_count = sum(1 for s in diabetes_symptoms if s in detected_list)
            
            # Check for Arthritis
            arthritis_symptoms = ['joint_pain', 'swelling', 'fatigue']
            arthritis_match_count = sum(1 for s in arthritis_symptoms if s in detected_list)
            
            # Determine disease based on symptom patterns
            if cold_match_count >= 2:
                predicted_disease = 'Common Cold'
                symptom_confidence = 70 + (cold_match_count * 5)
                print(f" Symptom-based override: Common Cold (match count: {cold_match_count})")
            elif flu_match_count >= 3:
                predicted_disease = 'Influenza'
                symptom_confidence = 70 + (flu_match_count * 5)
                print(f" Symptom-based override: Influenza (match count: {flu_match_count})")
            elif covid_match_count >= 2:
                predicted_disease = 'COVID-19'
                symptom_confidence = 70 + (covid_match_count * 5)
                print(f" Symptom-based override: COVID-19 (match count: {covid_match_count})")
            elif gastro_match_count >= 2:
                predicted_disease = 'Gastroenteritis'
                symptom_confidence = 70 + (gastro_match_count * 5)
                print(f" Symptom-based override: Gastroenteritis (match count: {gastro_match_count})")
            elif bronchitis_match_count >= 3:
                predicted_disease = 'Bronchitis'
                symptom_confidence = 70 + (bronchitis_match_count * 5)
                print(f" Symptom-based override: Bronchitis (match count: {bronchitis_match_count})")
            elif pneumonia_match_count >= 3:
                predicted_disease = 'Pneumonia'
                symptom_confidence = 70 + (pneumonia_match_count * 5)
                print(f" Symptom-based override: Pneumonia (match count: {pneumonia_match_count})")
            elif migraine_match_count >= 3:
                predicted_disease = 'Migraine'
                symptom_confidence = 70 + (migraine_match_count * 5)
                print(f" Symptom-based override: Migraine (match count: {migraine_match_count})")
            elif hypertension_match_count >= 2:
                predicted_disease = 'Hypertension'
                symptom_confidence = 70 + (hypertension_match_count * 5)
                print(f" Symptom-based override: Hypertension (match count: {hypertension_match_count})")
            elif diabetes_match_count >= 2:
                predicted_disease = 'Diabetes Type 2'
                symptom_confidence = 70 + (diabetes_match_count * 5)
                print(f" Symptom-based override: Diabetes Type 2 (match count: {diabetes_match_count})")
            elif arthritis_match_count >= 2:
                predicted_disease = 'Arthritis'
                symptom_confidence = 70 + (arthritis_match_count * 5)
                print(f" Symptom-based override: Arthritis (match count: {arthritis_match_count})")
            elif ml_predicted_disease:
                predicted_disease = ml_predicted_disease
                print(f" Using ML prediction: {predicted_disease}")
            else:
                predicted_disease = None
        
        print(f" FINAL PREDICTED DISEASE: '{predicted_disease}'")
        
        # Analyze vital signs
        vital_drugs = []
        vital_dosages = []
        vital_reasoning = []
        
        # HbA1c - Diabetes
        if hba1c and hba1c > 7.0:
            vital_drugs.append('Metformin 1000mg')
            vital_dosages.append('1000mg twice daily with meals')
            vital_reasoning.append(f'HbA1c of {hba1c}% indicates poor glycemic control')
        
        # Cholesterol
        if total_cholesterol and total_cholesterol > 200:
            vital_drugs.append('Atorvastatin 20mg')
            vital_dosages.append('Atorvastatin 20mg once daily at bedtime')
            vital_reasoning.append(f'elevated cholesterol ({total_cholesterol} mg/dL) warrants statin therapy')
        
        # Blood Pressure - Hypertension
        if systolic_bp and diastolic_bp and (systolic_bp >= 140 or diastolic_bp >= 90):
            vital_drugs.append('Amlodipine 5mg')
            vital_dosages.append('5mg once daily')
            vital_reasoning.append(f'Blood pressure {systolic_bp}/{diastolic_bp} mmHg indicates hypertension')
        
        # BMI - Obesity
        if bmi and bmi >= 30:
            vital_drugs.append('Orlistat 120mg')
            vital_dosages.append('120mg three times daily with meals')
            vital_reasoning.append(f'BMI of {bmi} indicates obesity')
        
        # Build response
        recommendation = {
            'recommended_drug': '',
            'dosage': '',
            'reasoning': '',
            'confidence': 85,
            'clinical_indicators': {},
            'symptom_analysis': {
                'detected_symptoms': detected_list,
                'matched_disease': predicted_disease,
                'symptom_confidence': symptom_confidence,
                'top_predictions': top_predictions,
                'symptoms_provided': len(detected_list) > 0
            },
            'predicted_disease': predicted_disease,
            'generated_at': datetime.utcnow().isoformat(),
            'generated_by': current_user_id
        }
        
        # Build reasoning - START with symptom-based disease
        final_reasoning = []
        final_drugs = []
        final_dosages = []
        
        # Add symptom-based disease info FIRST
        if predicted_disease and detected_list:
            symptoms_str = ', '.join(detected_list[:5])
            final_reasoning.append(f"Based on reported symptoms ({symptoms_str}), {predicted_disease} is suspected.")
            print(f" Using predicted disease: {predicted_disease}")
            
            # Add disease-specific drug based on predicted disease
            if predicted_disease == 'Common Cold':
                final_drugs.append('Loratadine 10mg + Pseudoephedrine 60mg')
                final_dosages.append('Loratadine: once daily; Pseudoephedrine: every 4-6 hours as needed')
                final_reasoning.append(f"For {predicted_disease}, rest, hydration, and over-the-counter cold medications are recommended.")
                recommendation['clinical_indicators']['common_cold'] = True
                print("  Added Common Cold medications")
                
            elif predicted_disease == 'Influenza':
                final_drugs.append('Oseltamivir 75mg')
                final_dosages.append('75mg twice daily for 5 days')
                final_reasoning.append(f"For {predicted_disease}, rest, hydration, and antiviral therapy are recommended.")
                recommendation['clinical_indicators']['influenza'] = True
                print("  Added Influenza medications")
                
            elif predicted_disease == 'Gastroenteritis':
                final_drugs.append('Oral Rehydration Solution + Ondansetron 4mg')
                final_dosages.append('ORS after each loose stool; Ondansetron 4mg as needed for nausea')
                final_reasoning.append(f"For {predicted_disease}, oral rehydration and antiemetics are recommended.")
                recommendation['clinical_indicators']['gastroenteritis'] = True
                print("  Added Gastroenteritis medications")
                
            elif predicted_disease == 'Bronchitis':
                final_drugs.append('Guaifenesin 600mg + Dextromethorphan 20mg')
                final_dosages.append('Every 4-6 hours as needed for cough')
                final_reasoning.append(f"For {predicted_disease}, cough suppressants and expectorants are recommended.")
                recommendation['clinical_indicators']['bronchitis'] = True
                print("  Added Bronchitis medications")
                
            elif predicted_disease == 'Pneumonia':
                final_drugs.append('Amoxicillin 500mg')
                final_dosages.append('500mg three times daily for 7 days')
                final_reasoning.append(f"For {predicted_disease}, antibiotics and rest are recommended.")
                recommendation['clinical_indicators']['pneumonia'] = True
                print("  Added Pneumonia medications")
                
            elif predicted_disease == 'COVID-19':
                final_drugs.append('Symptomatic management + Consider Paxlovid')
                final_dosages.append('As per local guidelines for high-risk patients')
                final_reasoning.append(f"For {predicted_disease}, isolation, monitoring, and symptomatic care are recommended.")
                recommendation['clinical_indicators']['covid19'] = True
                print("  Added COVID-19 management")
                
            elif predicted_disease == 'Migraine':
                final_drugs.append('Sumatriptan 50mg')
                final_dosages.append('At onset of migraine, may repeat once after 2 hours')
                final_reasoning.append(f"For {predicted_disease}, triptans for acute treatment and rest in dark quiet room are recommended.")
                recommendation['clinical_indicators']['migraine'] = True
                print("  Added Migraine medications")
                
            elif predicted_disease == 'Hypertension':
                if 'Amlodipine' not in str(vital_drugs):
                    final_drugs.append('Amlodipine 5mg')
                    final_dosages.append('5mg once daily')
                final_reasoning.append(f"For {predicted_disease}, lifestyle modifications and antihypertensive therapy are recommended.")
                recommendation['clinical_indicators']['hypertension'] = True
                print("  Added Hypertension management")
                
            elif predicted_disease == 'Diabetes Type 2':
                if 'Metformin' not in str(vital_drugs):
                    final_drugs.append('Metformin 500mg')
                    final_dosages.append('500mg twice daily with meals')
                final_reasoning.append(f"For {predicted_disease}, blood glucose monitoring, diet modification, and metformin are recommended.")
                recommendation['clinical_indicators']['diabetes'] = True
                print("  Added Diabetes medications")
                
            elif predicted_disease == 'Arthritis':
                final_drugs.append('Ibuprofen 400mg OR Naproxen 250mg')
                final_dosages.append('As needed for pain, take with food')
                final_reasoning.append(f"For {predicted_disease}, NSAIDs for pain relief and physical therapy are recommended.")
                recommendation['clinical_indicators']['arthritis'] = True
                print("  Added Arthritis medications")
                
            elif predicted_disease == 'Strep Throat':
                final_drugs.append('Amoxicillin 500mg')
                final_dosages.append('500mg twice daily for 10 days')
                final_reasoning.append(f"For {predicted_disease}, antibiotics and analgesics for pain are recommended.")
                recommendation['clinical_indicators']['strep_throat'] = True
                print("  Added Strep Throat medications")
                
            elif predicted_disease == 'Allergic Rhinitis':
                final_drugs.append('Loratadine 10mg OR Cetirizine 10mg')
                final_dosages.append('Once daily as needed')
                final_reasoning.append(f"For {predicted_disease}, antihistamines and nasal saline irrigation are recommended.")
                recommendation['clinical_indicators']['allergic_rhinitis'] = True
                print("  Added Allergic Rhinitis medications")
                
            elif predicted_disease == 'Asthma':
                final_drugs.append('Albuterol MDI (rescue)')
                final_dosages.append('2 puffs every 4-6 hours as needed')
                final_reasoning.append(f"For {predicted_disease}, bronchodilators and avoidance of triggers are recommended.")
                recommendation['clinical_indicators']['asthma'] = True
                print("  Added Asthma medications")
                
            elif predicted_disease == 'Sinusitis':
                final_drugs.append('Amoxicillin 500mg + Nasal corticosteroid')
                final_dosages.append('Amoxicillin: three times daily for 7-10 days; Nasal spray: twice daily')
                final_reasoning.append(f"For {predicted_disease}, antibiotics and nasal decongestants are recommended.")
                recommendation['clinical_indicators']['sinusitis'] = True
                print("  Added Sinusitis medications")
                
            elif predicted_disease == 'Urinary Tract Infection':
                final_drugs.append('Nitrofurantoin 100mg')
                final_dosages.append('Twice daily for 5 days')
                final_reasoning.append(f"For {predicted_disease}, antibiotics and increased fluid intake are recommended.")
                recommendation['clinical_indicators']['uti'] = True
                print("  Added UTI medications")
                
            elif predicted_disease == 'Anemia':
                final_drugs.append('Ferrous sulfate 325mg + Folic acid 1mg')
                final_dosages.append('Ferrous sulfate: three times daily with vitamin C; Folic acid: once daily')
                final_reasoning.append(f"For {predicted_disease}, iron supplementation and dietary changes are recommended.")
                recommendation['clinical_indicators']['anemia'] = True
                print("  Added Anemia medications")
                
            elif predicted_disease == 'Depression':
                final_drugs.append('Sertraline 50mg OR Escitalopram 10mg')
                final_dosages.append('Once daily, may titrate after 2-4 weeks')
                final_reasoning.append(f"For {predicted_disease}, SSRI antidepressants and psychotherapy referral are recommended.")
                recommendation['clinical_indicators']['depression'] = True
                print("  Added Depression medications")
                
            elif predicted_disease == 'Anxiety':
                final_drugs.append('Sertraline 50mg')
                final_dosages.append('Once daily')
                final_reasoning.append(f"For {predicted_disease}, SSRI and anxiety management techniques are recommended.")
                recommendation['clinical_indicators']['anxiety'] = True
                print("  Added Anxiety medications")
        
        # Add vital signs drugs
        if vital_drugs:
            for drug in vital_drugs:
                if drug not in final_drugs:
                    final_drugs.append(drug)
            for dosage in vital_dosages:
                if dosage not in final_dosages:
                    final_dosages.append(dosage)
            for reasoning in vital_reasoning:
                if reasoning not in final_reasoning:
                    final_reasoning.append(reasoning)
            print(f" Added vital drugs: {vital_drugs}")
        
        # Build final recommendation
        if final_drugs:
            recommendation['recommended_drug'] = ' + '.join(final_drugs)
            recommendation['dosage'] = '; '.join(final_dosages)
            recommendation['reasoning'] = ' '.join(final_reasoning)
            
            # Calculate confidence
            if predicted_disease and symptom_confidence > 0:
                recommendation['confidence'] = int((symptom_confidence * 0.4) + (85 * 0.6))
                print(f" Confidence calculation: symptom={symptom_confidence}, vitals=85, result={recommendation['confidence']}")
            else:
                recommendation['confidence'] = 85
        else:
            # No conditions detected
            recommendation['recommended_drug'] = 'Lifestyle Optimization'
            recommendation['dosage'] = 'No medication needed'
            if detected_list:
                symptoms_str = ', '.join(detected_list[:5])
                recommendation['reasoning'] = f'Patient reports symptoms ({symptoms_str}) but all vitals are within normal range. Focus on symptomatic management and preventive care.'
            else:
                recommendation['reasoning'] = 'All vitals are within normal range. Focus on preventive care, regular exercise, and healthy diet.'
            recommendation['confidence'] = 95
        
        recommendation['confidence'] = max(0, min(100, recommendation['confidence']))
        
        print(f"\n FINAL RESPONSE:")
        print(f"   Predicted Disease: {predicted_disease}")
        print(f"   Recommended Drug: {recommendation['recommended_drug']}")
        print(f"   Reasoning: {recommendation['reasoning'][:200]}...")
        print(f"   Confidence: {recommendation['confidence']}%")
        print("="*60)
        
        return jsonify(recommendation), 200
        
    except Exception as e:
        logger.error(f"Error generating AI recommendation: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'message': f'Error generating AI recommendation: {str(e)}'}), 500

@bp.route('/stats', methods=['GET'])
@jwt_required()
def get_stats():
    """Get clinical dashboard statistics"""
    try:
        current_user_id = get_jwt_identity()
        total_patients = Patient.query.count()
        active_patients = Patient.query.filter_by(is_active=True).count()

        # Today's assessments
        today = datetime.now().date()
        today_assessments = PatientAssessment.query.filter(
            func.date(PatientAssessment.assessment_date) == today
        ).count()

        total_assessments = PatientAssessment.query.count()

        # Pending reports (reports not printed)
        pending_reports = ClinicalReport.query.filter_by(is_printed=False).count()

        return jsonify({
            'total_patients': total_patients,
            'active_patients': active_patients,
            'today_assessments': today_assessments,
            'total_assessments': total_assessments,
            'pending_reports': pending_reports
        }), 200

    except Exception as e:
        return jsonify({'message': f'Error fetching stats: {str(e)}'}), 500

@bp.route('/recent-patients', methods=['GET'])
@jwt_required()
def get_recent_patients():
    """Get recently registered patients"""
    try:
        current_user_id = get_jwt_identity()
        limit = request.args.get('limit', 3, type=int)

        recent = Patient.query.order_by(Patient.created_at.desc()).limit(limit).all()

        patients = []
        for patient in recent:
            patients.append({
                'id': patient.id,
                'patient_id': patient.patient_id,
                'first_name': patient.first_name,
                'last_name': patient.last_name,
                'full_name': patient.full_name,
                'created_at': patient.created_at.isoformat() if patient.created_at else None
            })

        return jsonify(patients), 200

    except Exception as e:
        return jsonify({'message': f'Error fetching recent patients: {str(e)}'}), 500

@bp.route('/recent-assessments', methods=['GET'])
@jwt_required()
def get_recent_assessments():
    """Get recent assessments"""
    try:
        current_user_id = get_jwt_identity()
        limit = request.args.get('limit', 3, type=int)

        recent = PatientAssessment.query.order_by(
            PatientAssessment.assessment_date.desc()
        ).limit(limit).all()

        assessments = []
        for assessment in recent:
            patient = Patient.query.get(assessment.patient_id)
            assessments.append({
                'id': assessment.id,
                'patient_id': assessment.patient_id,
                'patient_name': patient.full_name if patient else 'Unknown',
                'created_at': assessment.assessment_date.isoformat() if assessment.assessment_date else None
            })

        return jsonify(assessments), 200

    except Exception as e:
        return jsonify({'message': f'Error fetching recent assessments: {str(e)}'}), 500

@bp.route('/patients', methods=['GET'])
@jwt_required()
def get_patients():
    """Get paginated list of patients with search"""
    try:
        current_user_id = get_jwt_identity()
        page = request.args.get('page', 1, type=int)
        search = request.args.get('search', '')
        per_page = current_app.config.get('ITEMS_PER_PAGE', 10)

        # Base query
        query = Patient.query

        # Apply search filter
        if search:
            query = query.filter(
                or_(
                    Patient.patient_id.ilike(f'%{search}%'),
                    Patient.first_name.ilike(f'%{search}%'),
                    Patient.last_name.ilike(f'%{search}%'),
                    Patient.phone_number.ilike(f'%{search}%'),
                    Patient.email.ilike(f'%{search}%')
                )
            )

        # Get total count before pagination
        total_records = query.count()

        # Paginate
        paginated = query.order_by(Patient.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        patients = []
        for patient in paginated.items:
            # Get latest assessment for last visit date
            latest_assessment = PatientAssessment.query.filter_by(
                patient_id=patient.id
            ).order_by(PatientAssessment.assessment_date.desc()).first()

            patients.append({
                'id': patient.id,
                'patient_id': patient.patient_id,
                'first_name': patient.first_name,
                'last_name': patient.last_name,
                'full_name': patient.full_name,
                'date_of_birth': patient.date_of_birth.isoformat() if patient.date_of_birth else None,
                'gender': patient.gender,
                'phone_number': patient.phone_number,
                'email': patient.email,
                'city': patient.city,
                'is_active': patient.is_active,
                'created_at': patient.created_at.isoformat() if patient.created_at else None,
                'assessments': [{
                    'id': latest_assessment.id,
                    'assessment_date': latest_assessment.assessment_date.isoformat()
                }] if latest_assessment else []
            })

        return jsonify({
            'patients': patients,
            'page': page,
            'total_pages': paginated.pages,
            'total_records': total_records
        }), 200

    except Exception as e:
        return jsonify({'message': f'Error fetching patients: {str(e)}'}), 500

@bp.route('/patients', methods=['POST'])
@jwt_required()
def create_patient():
    """Register a new patient"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()

        # Validate required fields
        required_fields = ['first_name', 'last_name', 'date_of_birth', 'gender',
                          'phone_number', 'address_line1', 'city']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'message': f'{field} is required'}), 400

        # Parse date of birth
        try:
            dob = datetime.strptime(data.get('date_of_birth'), '%Y-%m-%d').date()
        except:
            return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD'}), 400

        # Create new patient
        patient = Patient(
            patient_id=generate_patient_id(),
            first_name=data.get('first_name'),
            last_name=data.get('last_name'),
            date_of_birth=dob,
            gender=data.get('gender'),
            marital_status=data.get('marital_status', ''),
            occupation=data.get('occupation', ''),
            phone_number=data.get('phone_number'),
            alternate_phone=data.get('alternate_phone', ''),
            email=data.get('email', ''),
            national_id=data.get('national_id', ''),
            address_line1=data.get('address_line1'),
            address_line2=data.get('address_line2', ''),
            city=data.get('city'),
            state=data.get('state', ''),
            postal_code=data.get('postal_code', ''),
            country=data.get('country', 'Kenya'),
            emergency_contact_name=data.get('emergency_contact_name', ''),
            emergency_contact_phone=data.get('emergency_contact_phone', ''),
            emergency_contact_relation=data.get('emergency_contact_relation', ''),
            blood_type=data.get('blood_type', ''),
            allergies=data.get('allergies', ''),
            chronic_conditions=data.get('chronic_conditions', ''),
            current_medications=data.get('current_medications', ''),
            insurance_provider=data.get('insurance_provider', ''),
            insurance_number=data.get('insurance_number', ''),
            is_active=True,
            created_by=int(current_user_id)
        )

        db.session.add(patient)
        db.session.commit()

        return jsonify({
            'message': 'Patient registered successfully',
            'patient_id': patient.id,
            'patient_number': patient.patient_id
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error registering patient: {str(e)}'}), 500

@bp.route('/patients/<int:patient_id>', methods=['GET'])
@jwt_required()
def get_patient(patient_id):
    """Get detailed patient information"""
    try:
        current_user_id = get_jwt_identity()
        patient = Patient.query.get_or_404(patient_id)

        # Get creator info
        creator = User.query.get(patient.created_by) if patient.created_by else None

        # Get assessments
        assessments = PatientAssessment.query.filter_by(
            patient_id=patient.id
        ).order_by(PatientAssessment.assessment_date.desc()).all()

        assessment_list = []
        for assessment in assessments:
            assessor = User.query.get(assessment.assessed_by) if assessment.assessed_by else None
            assessment_list.append({
                'id': assessment.id,
                'assessment_date': assessment.assessment_date.isoformat() if assessment.assessment_date else None,
                'assessed_by': {
                    'id': assessor.id,
                    'full_name': assessor.full_name
                } if assessor else None,
                'systolic_bp': assessment.systolic_bp,
                'diastolic_bp': assessment.diastolic_bp,
                'fasting_glucose': assessment.fasting_glucose,
                'bmi': assessment.bmi,
                'ai_recommended_drug': assessment.ai_recommended_drug,
                'ai_confidence': assessment.ai_confidence,
                'is_completed': assessment.is_completed
            })

        return jsonify({
            'id': patient.id,
            'patient_id': patient.patient_id,
            'first_name': patient.first_name,
            'last_name': patient.last_name,
            'full_name': patient.full_name,
            'date_of_birth': patient.date_of_birth.isoformat() if patient.date_of_birth else None,
            'age': patient.age,
            'gender': patient.gender,
            'marital_status': patient.marital_status,
            'occupation': patient.occupation,
            'phone_number': patient.phone_number,
            'alternate_phone': patient.alternate_phone,
            'email': patient.email,
            'national_id': patient.national_id,
            'address_line1': patient.address_line1,
            'address_line2': patient.address_line2,
            'city': patient.city,
            'state': patient.state,
            'postal_code': patient.postal_code,
            'country': patient.country,
            'address_full': patient.address_full,
            'emergency_contact_name': patient.emergency_contact_name,
            'emergency_contact_phone': patient.emergency_contact_phone,
            'emergency_contact_relation': patient.emergency_contact_relation,
            'blood_type': patient.blood_type,
            'allergies': patient.allergies,
            'chronic_conditions': patient.chronic_conditions,
            'current_medications': patient.current_medications,
            'insurance_provider': patient.insurance_provider,
            'insurance_number': patient.insurance_number,
            'is_active': patient.is_active,
            'created_at': patient.created_at.isoformat() if patient.created_at else None,
            'registered_by': creator.full_name if creator else 'Unknown',
            'assessments': assessment_list
        }), 200

    except Exception as e:
        return jsonify({'message': f'Error fetching patient: {str(e)}'}), 500

@bp.route('/patients/<int:patient_id>', methods=['PUT'])
@jwt_required()
def update_patient(patient_id):
    """Update patient information"""
    try:
        current_user_id = get_jwt_identity()
        patient = Patient.query.get_or_404(patient_id)
        data = request.get_json()

        # Update fields (only if provided)
        updatable_fields = [
            'first_name', 'last_name', 'marital_status', 'occupation',
            'phone_number', 'alternate_phone', 'email', 'national_id',
            'address_line1', 'address_line2', 'city', 'state',
            'postal_code', 'country', 'emergency_contact_name',
            'emergency_contact_phone', 'emergency_contact_relation',
            'blood_type', 'allergies', 'chronic_conditions',
            'current_medications', 'insurance_provider', 'insurance_number',
            'is_active'
        ]

        for field in updatable_fields:
            if field in data:
                setattr(patient, field, data.get(field))

        # Update date of birth if provided
        if 'date_of_birth' in data and data.get('date_of_birth'):
            try:
                patient.date_of_birth = datetime.strptime(
                    data.get('date_of_birth'), '%Y-%m-%d'
                ).date()
            except:
                return jsonify({'message': 'Invalid date format'}), 400

        # Update gender if provided
        if 'gender' in data and data.get('gender'):
            patient.gender = data.get('gender')

        db.session.commit()

        return jsonify({'message': 'Patient updated successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error updating patient: {str(e)}'}), 500

@bp.route('/patients/<int:patient_id>/assessments', methods=['GET'])
@jwt_required()
def get_patient_assessments(patient_id):
    """Get all assessments for a patient"""
    try:
        current_user_id = get_jwt_identity()
        # Verify patient exists
        patient = Patient.query.get_or_404(patient_id)

        assessments = PatientAssessment.query.filter_by(
            patient_id=patient_id
        ).order_by(PatientAssessment.assessment_date.desc()).all()

        assessment_list = []
        for assessment in assessments:
            assessor = User.query.get(assessment.assessed_by) if assessment.assessed_by else None
            assessment_list.append({
                'id': assessment.id,
                'assessment_date': assessment.assessment_date.isoformat() if assessment.assessment_date else None,
                'assessed_by': {
                    'id': assessor.id,
                    'full_name': assessor.full_name
                } if assessor else None,
                'systolic_bp': assessment.systolic_bp,
                'diastolic_bp': assessment.diastolic_bp,
                'fasting_glucose': assessment.fasting_glucose,
                'bmi': assessment.bmi,
                'ai_recommended_drug': assessment.ai_recommended_drug,
                'ai_confidence': assessment.ai_confidence,
                'is_completed': assessment.is_completed
            })

        return jsonify(assessment_list), 200

    except Exception as e:
        return jsonify({'message': f'Error fetching assessments: {str(e)}'}), 500

@bp.route('/patients/<int:patient_id>/assessments', methods=['POST'])
@jwt_required()
def create_assessment(patient_id):
    """Create a new patient assessment"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()

        # Debug logging
        print("="*50)
        print("CREATE ASSESSMENT DEBUG")
        print("="*50)
        print(f"Patient ID: {patient_id}")
        print(f"Current User ID: {current_user_id}")
        print(f"Received data keys: {list(data.keys())}")
        print(f"Received data: {data}")
        print("="*50)

        # Verify patient exists
        patient = Patient.query.get_or_404(patient_id)

        # Calculate BMI if weight and height provided
        bmi = None
        if data.get('weight_kg') and data.get('height_cm'):
            weight = float(data.get('weight_kg'))
            height = float(data.get('height_cm')) / 100  # Convert cm to m
            bmi = round(weight / (height * height), 1)

        # Create assessment
        assessment = PatientAssessment(
            patient_id=patient_id,
            assessed_by=int(current_user_id),
            systolic_bp=data.get('systolic_bp'),
            diastolic_bp=data.get('diastolic_bp'),
            heart_rate=data.get('heart_rate'),
            respiratory_rate=data.get('respiratory_rate'),
            temperature=data.get('temperature'),
            oxygen_saturation=data.get('oxygen_saturation'),
            weight_kg=data.get('weight_kg'),
            height_cm=data.get('height_cm'),
            bmi=bmi,
            fasting_glucose=data.get('fasting_glucose'),
            hba1c=data.get('hba1c'),
            total_cholesterol=data.get('total_cholesterol'),
            ldl_cholesterol=data.get('ldl_cholesterol'),
            hdl_cholesterol=data.get('hdl_cholesterol'),
            triglycerides=data.get('triglycerides'),
            creatinine=data.get('creatinine'),
            smoker=data.get('smoker', 'no'),
            alcohol_consumption=data.get('alcohol_consumption', 'none'),
            exercise_frequency=data.get('exercise_frequency', 'none'),
            chief_complaint=data.get('chief_complaint', ''),
            symptoms=data.get('symptoms', ''),
            assessment_notes=data.get('assessment_notes', ''),
            diagnosis=data.get('diagnosis', ''),
            ai_recommended_drug=data.get('ai_recommended_drug'),
            ai_confidence=data.get('ai_confidence'),
            clinician_decision=data.get('clinician_decision'),
            clinician_selected_drug=data.get('clinician_selected_drug'),
            clinician_notes=data.get('clinician_notes'),
            is_completed=False
        )

        db.session.add(assessment)
        db.session.commit()

        return jsonify({
            'message': 'Assessment created successfully',
            'assessment_id': assessment.id
        }), 201

    except Exception as e:
        db.session.rollback()
        print("="*50)
        print("ERROR CREATING ASSESSMENT")
        print("="*50)
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        import traceback
        traceback.print_exc()
        print("="*50)
        return jsonify({'message': f'Error creating assessment: {str(e)}'}), 500

@bp.route('/assessments/<int:assessment_id>', methods=['GET'])
@jwt_required()
def get_assessment(assessment_id):
    """Get detailed assessment information"""
    try:
        current_user_id = get_jwt_identity()
        assessment = PatientAssessment.query.get_or_404(assessment_id)
        patient = Patient.query.get(assessment.patient_id)
        assessor = User.query.get(assessment.assessed_by)

        # Get patient's current medications for drug interaction check
        current_meds = patient.current_medications if patient else ''

        return jsonify({
            'id': assessment.id,
            'patient_id': assessment.patient_id,
            'patient_name': patient.full_name if patient else 'Unknown',
            'assessment_date': assessment.assessment_date.isoformat() if assessment.assessment_date else None,
            'assessed_by': {
                'id': assessor.id,
                'full_name': assessor.full_name
            } if assessor else None,
            'systolic_bp': assessment.systolic_bp,
            'diastolic_bp': assessment.diastolic_bp,
            'heart_rate': assessment.heart_rate,
            'respiratory_rate': assessment.respiratory_rate,
            'temperature': assessment.temperature,
            'oxygen_saturation': assessment.oxygen_saturation,
            'weight_kg': assessment.weight_kg,
            'height_cm': assessment.height_cm,
            'bmi': assessment.bmi,
            'fasting_glucose': assessment.fasting_glucose,
            'hba1c': assessment.hba1c,
            'total_cholesterol': assessment.total_cholesterol,
            'ldl_cholesterol': assessment.ldl_cholesterol,
            'hdl_cholesterol': assessment.hdl_cholesterol,
            'triglycerides': assessment.triglycerides,
            'creatinine': assessment.creatinine,
            'smoker': assessment.smoker,
            'alcohol_consumption': assessment.alcohol_consumption,
            'exercise_frequency': assessment.exercise_frequency,
            'chief_complaint': assessment.chief_complaint,
            'symptoms': assessment.symptoms,
            'assessment_notes': assessment.assessment_notes,
            'diagnosis': assessment.diagnosis,
            'ai_recommended_drug': assessment.ai_recommended_drug,
            'ai_confidence': assessment.ai_confidence,
            'clinician_decision': assessment.clinician_decision,
            'clinician_selected_drug': assessment.clinician_selected_drug,
            'clinician_notes': assessment.clinician_notes,
            'follow_up_date': assessment.follow_up_date.isoformat() if assessment.follow_up_date else None,
            'is_completed': assessment.is_completed,
            'current_medications': current_meds
        }), 200

    except Exception as e:
        return jsonify({'message': f'Error fetching assessment: {str(e)}'}), 500

@bp.route('/assessments/<int:assessment_id>/finalize', methods=['POST'])
@jwt_required()
def finalize_assessment(assessment_id):
    """Finalize assessment with clinician decision"""
    try:
        current_user_id = get_jwt_identity()
        assessment = PatientAssessment.query.get_or_404(assessment_id)
        data = request.get_json()

        assessment.clinician_decision = data.get('clinician_decision')
        assessment.clinician_selected_drug = data.get('clinician_selected_drug', '')
        assessment.clinician_notes = data.get('clinician_notes', '')

        if data.get('follow_up_date'):
            try:
                assessment.follow_up_date = datetime.strptime(
                    data.get('follow_up_date'), '%Y-%m-%d'
                ).date()
            except:
                pass

        assessment.is_completed = True
        db.session.commit()

        return jsonify({
            'message': 'Assessment finalized successfully',
            'assessment_id': assessment.id
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error finalizing assessment: {str(e)}'}), 500

@bp.route('/drug-interactions', methods=['POST'])
@jwt_required()
def check_drug_interactions():
    """Check drug interactions"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        drug = data.get('drug')
        current_medications = data.get('current_medications', '')

        interactions = {
            'severity': 'mild',
            'recommendation': f'No significant interactions found for {drug}',
            'warnings': []
        }

        if drug and current_medications:
            if 'warfarin' in current_medications.lower() and 'aspirin' in drug.lower():
                interactions = {
                    'severity': 'severe',
                    'recommendation': 'Increased risk of bleeding when combining with warfarin',
                    'warnings': ['Monitor INR closely', 'Consider alternative medication']
                }
            elif 'metformin' in current_medications.lower() and 'insulin' in drug.lower():
                interactions = {
                    'severity': 'moderate',
                    'recommendation': 'Increased risk of hypoglycemia',
                    'warnings': ['Monitor blood glucose levels', 'Adjust insulin dose as needed']
                }

        return jsonify(interactions), 200

    except Exception as e:
        return jsonify({'message': f'Error checking interactions: {str(e)}'}), 500

@bp.route('/patients/<int:patient_id>/reports', methods=['GET'])
@jwt_required()
def get_patient_reports(patient_id):
    """Get all reports for a patient"""
    try:
        current_user_id = get_jwt_identity()
        patient = Patient.query.get_or_404(patient_id)

        reports = ClinicalReport.query.filter_by(
            patient_id=patient_id
        ).order_by(ClinicalReport.generated_at.desc()).all()

        report_list = []
        for report in reports:
            generator = User.query.get(report.generated_by) if report.generated_by else None
            
            generated_at_str = None
            if report.generated_at:
                generated_at_str = report.generated_at.strftime('%Y-%m-%d %H:%M')
            
            report_list.append({
                'id': report.id,
                'report_id': report.report_id,
                'generated_at': generated_at_str,
                'report_type': report.report_type or 'Assessment',
                'report_format': report.report_format or 'HTML',
                'is_printed': report.is_printed,
                'printed_at': report.printed_at.isoformat() if report.printed_at else None,
                'generated_by_user': {
                    'id': generator.id,
                    'full_name': generator.full_name
                } if generator else {'full_name': 'Unknown'},
                'status': 'Printed' if report.is_printed else 'Pending'
            })

        return jsonify(report_list), 200

    except Exception as e:
        print(f"Error fetching reports: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'message': f'Error fetching reports: {str(e)}'}), 500

@bp.route('/patients/<int:patient_id>/reports', methods=['POST'])
@jwt_required()
def generate_report(patient_id):
    """Generate a new clinical report"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()

        print("="*50)
        print("GENERATE REPORT DEBUG")
        print("="*50)
        print(f"Patient ID: {patient_id}")
        print(f"Current User ID: {current_user_id}")
        print(f"Received data: {data}")
        print("="*50)

        patient = Patient.query.get_or_404(patient_id)

        report_type = data.get('report_type', 'clinical')
        print(f"Report Type: {report_type}")
        
        assessment = None
        assessment_id = data.get('assessment_id')
        
        if assessment_id:
            assessment = PatientAssessment.query.get(assessment_id)
            print(f"Using specified assessment ID: {assessment_id}")
        else:
            assessment = PatientAssessment.query.filter_by(
                patient_id=patient_id
            ).order_by(PatientAssessment.assessment_date.desc()).first()
            if assessment:
                print(f"Using most recent assessment: ID {assessment.id}, Date: {assessment.assessment_date}")
            else:
                print(f"No assessment found for patient {patient_id}")
        
        if assessment:
            html_content = generate_report_html(patient, assessment, current_user_id, data)
        else:
            html_content = generate_report_html_no_assessment(patient, current_user_id, data)

        import secrets
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        random_part = secrets.token_hex(3).upper()
        report_id = f"RPT-{timestamp}-{random_part}"

        now = datetime.utcnow()

        report = ClinicalReport(
            report_id=report_id,
            patient_id=patient_id,
            assessment_id=assessment.id if assessment else None,
            generated_by=int(current_user_id),
            generated_at=now,
            report_type=report_type,
            report_format=data.get('report_format', 'HTML'),
            report_content=html_content,
            is_printed=False,
            shared_with_patient=False,
            created_at=now,
            updated_at=now
        )

        db.session.add(report)
        db.session.commit()

        print(f" Report generated successfully: {report_id} (Type: {report_type})")

        return jsonify({
            'message': 'Report generated successfully',
            'id': report.id,
            'report_id': report.report_id
        }), 201

    except Exception as e:
        db.session.rollback()
        print("="*50)
        print("ERROR GENERATING REPORT")
        print("="*50)
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        import traceback
        traceback.print_exc()
        print("="*50)
        return jsonify({'message': f'Error generating report: {str(e)}'}), 500

@bp.route('/user-stats', methods=['GET'])
@jwt_required()
def get_user_stats():
    """Get statistics for the current user"""
    try:
        current_user_id = get_jwt_identity()
        
        patients_count = Patient.query.filter_by(created_by=int(current_user_id)).count()
        assessments_count = PatientAssessment.query.filter_by(assessed_by=int(current_user_id)).count()
        
        return jsonify({
            'patients_count': patients_count,
            'assessments_count': assessments_count
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Error fetching user stats: {str(e)}'}), 500        

@bp.route('/reports/<int:report_id>', methods=['GET'])
@jwt_required()
def get_report(report_id):
    """Get detailed report information"""
    try:
        current_user_id = get_jwt_identity()
        report = ClinicalReport.query.get_or_404(report_id)
        patient = Patient.query.get(report.patient_id)
        generator = User.query.get(report.generated_by) if report.generated_by else None

        assessment = None
        if report.assessment_id:
            assessment = PatientAssessment.query.get(report.assessment_id)
            assessor = User.query.get(assessment.assessed_by) if assessment.assessed_by else None

        return jsonify({
            'id': report.id,
            'report_id': report.report_id,
            'patient_id': report.patient_id,
            'patient': {
                'id': patient.id,
                'patient_id': patient.patient_id,
                'full_name': patient.full_name,
                'age': patient.age,
                'gender': patient.gender,
                'phone_number': patient.phone_number,
                'blood_type': patient.blood_type
            } if patient else None,
            'assessment_id': report.assessment_id,
            'assessment': {
                'id': assessment.id,
                'assessment_date': assessment.assessment_date.isoformat() if assessment.assessment_date else None,
                'assessor': {
                    'id': assessor.id,
                    'full_name': assessor.full_name
                } if assessor else None,
                'systolic_bp': assessment.systolic_bp,
                'diastolic_bp': assessment.diastolic_bp,
                'heart_rate': assessment.heart_rate,
                'bmi': assessment.bmi,
                'fasting_glucose': assessment.fasting_glucose,
                'ai_recommended_drug': assessment.ai_recommended_drug,
                'ai_confidence': assessment.ai_confidence,
                'clinician_decision': assessment.clinician_decision,
                'clinician_selected_drug': assessment.clinician_selected_drug,
                'clinician_notes': assessment.clinician_notes,
                'chief_complaint': assessment.chief_complaint,
                'diagnosis': assessment.diagnosis
            } if assessment else None,
            'generated_at': report.generated_at.isoformat() if report.generated_at else None,
            'generated_by_user': {
                'id': generator.id,
                'full_name': generator.full_name
            } if generator else {'full_name': 'Unknown'},
            'report_type': report.report_type or 'Assessment',
            'report_format': report.report_format or 'HTML',
            'report_content': report.report_content,
            'is_printed': report.is_printed,
            'printed_at': report.printed_at.isoformat() if report.printed_at else None,
            'shared_with_patient': report.shared_with_patient,
            'shared_at': report.shared_at.isoformat() if report.shared_at else None,
            'created_at': report.created_at.isoformat() if report.created_at else None,
            'updated_at': report.updated_at.isoformat() if report.updated_at else None,
            'status': 'Printed' if report.is_printed else 'Pending'
        }), 200

    except Exception as e:
        print(f"Error fetching report: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'message': f'Error fetching report: {str(e)}'}), 500

@bp.route('/reports/<int:report_id>/mark-printed', methods=['POST'])
@jwt_required()
def mark_report_printed(report_id):
    """Mark a report as printed"""
    try:
        current_user_id = get_jwt_identity()
        report = ClinicalReport.query.get_or_404(report_id)
        report.is_printed = True
        report.printed_at = datetime.utcnow()
        db.session.commit()

        return jsonify({'message': 'Report marked as printed'}), 200

    except Exception as e:
        return jsonify({'message': f'Error marking report: {str(e)}'}), 500

@bp.route('/reports/<int:report_id>/download', methods=['GET'])
@jwt_required()
def download_report(report_id):
    """Download report as PDF"""
    try:
        current_user_id = get_jwt_identity()
        report = ClinicalReport.query.get_or_404(report_id)

        return report.report_content, 200, {
            'Content-Type': 'text/html',
            'Content-Disposition': f'attachment; filename=report_{report.report_id}.html'
        }

    except Exception as e:
        return jsonify({'message': f'Error downloading report: {str(e)}'}), 500

def generate_report_html(patient, assessment, user_id, data):
    """Generate HTML content for report"""
    user = User.query.get(user_id) if user_id else None
    report_type = data.get('report_type', 'clinical')
    
    dob_str = patient.date_of_birth.strftime('%d/%m/%Y') if patient.date_of_birth else 'N/A'
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>{'Clinical' if report_type == 'clinical' else 'Assessment'} Report - {patient.full_name}</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 2rem; }}
            .header {{ text-align: center; margin-bottom: 2rem; }}
            .section {{ margin-bottom: 1.5rem; }}
            .section-title {{
                border-bottom: 2px solid #2563eb;
                padding-bottom: 0.5rem;
                color: #1e293b;
            }}
            .info-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }}
            .vital-grid {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin: 1rem 0; }}
            .lab-grid {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin: 1rem 0; }}
            .footer {{ margin-top: 2rem; text-align: center; color: #64748b; }}
            .ai-recommendation {{ background: #f3e8ff; padding: 1rem; border-radius: 8px; margin: 1rem 0; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>MediPredict CDSS - {report_type.capitalize()} Report</h1>
            <p>Report Type: {report_type.capitalize()}</p>
            <p>Generated: {datetime.now().strftime('%d/%m/%Y %H:%M')}</p>
        </div>

        <div class="section">
            <h2 class="section-title">Patient Information</h2>
            <div class="info-grid">
                <div><strong>Name:</strong> {patient.full_name}</div>
                <div><strong>Patient ID:</strong> {patient.patient_id}</div>
                <div><strong>DOB:</strong> {dob_str}</div>
                <div><strong>Age:</strong> {patient.age}</div>
                <div><strong>Gender:</strong> {patient.gender}</div>
                <div><strong>Blood Type:</strong> {patient.blood_type or 'N/A'}</div>
            </div>
        </div>

        {generate_appropriate_report_content(assessment, report_type) if assessment else ''}

        <div class="footer">
            <p>Generated by: {user.full_name if user else 'Unknown'} | For professional medical use only</p>
        </div>
    </body>
    </html>
    """
    return html

def generate_report_html_no_assessment(patient, user_id, data):
    """Generate HTML content for report when no assessment exists"""
    user = User.query.get(user_id) if user_id else None
    report_type = data.get('report_type', 'clinical')
    
    dob_str = patient.date_of_birth.strftime('%d/%m/%Y') if patient.date_of_birth else 'N/A'
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>{'Clinical' if report_type == 'clinical' else 'Assessment'} Report - {patient.full_name}</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 2rem; }}
            .header {{ text-align: center; margin-bottom: 2rem; }}
            .section {{ margin-bottom: 1.5rem; }}
            .section-title {{
                border-bottom: 2px solid #2563eb;
                padding-bottom: 0.5rem;
                color: #1e293b;
            }}
            .info-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }}
            .footer {{ margin-top: 2rem; text-align: center; color: #64748b; }}
            .warning {{ background: #fff3cd; border: 1px solid #ffc107; padding: 1rem; border-radius: 8px; margin: 1rem 0; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>MediPredict CDSS - {report_type.capitalize()} Report</h1>
            <p>Report Type: {report_type.capitalize()}</p>
            <p>Generated: {datetime.now().strftime('%d/%m/%Y %H:%M')}</p>
        </div>

        <div class="section">
            <h2 class="section-title">Patient Information</h2>
            <div class="info-grid">
                <div><strong>Name:</strong> {patient.full_name}</div>
                <div><strong>Patient ID:</strong> {patient.patient_id}</div>
                <div><strong>DOB:</strong> {dob_str}</div>
                <div><strong>Age:</strong> {patient.age}</div>
                <div><strong>Gender:</strong> {patient.gender}</div>
                <div><strong>Blood Type:</strong> {patient.blood_type or 'N/A'}</div>
            </div>
        </div>

        <div class="warning">
            <p><strong> No Assessment Data Available</strong></p>
            <p>No clinical assessment has been performed for this patient yet. Please perform an assessment to generate a complete report.</p>
        </div>

        <div class="footer">
            <p>Generated by: {user.full_name if user else 'Unknown'} | For professional medical use only</p>
        </div>
    </body>
    </html>
    """
    return html

def generate_appropriate_report_content(assessment, report_type):
    """Generate appropriate content based on report type"""
    if report_type == 'clinical':
        return generate_clinical_report_content(assessment)
    else:
        return generate_assessment_report_content(assessment)

def generate_clinical_report_content(assessment):
    """Generate full clinical report with all details"""
    assessor = User.query.get(assessment.assessed_by) if assessment.assessed_by else None
    assessment_date_str = assessment.assessment_date.strftime('%d/%m/%Y %H:%M') if assessment.assessment_date else 'N/A'
    assessor_name = assessor.full_name if assessor else 'Unknown'

    # Safely get attributes with defaults
    systolic_bp = getattr(assessment, 'systolic_bp', '—') or '—'
    diastolic_bp = getattr(assessment, 'diastolic_bp', '—') or '—'
    heart_rate = getattr(assessment, 'heart_rate', '—') or '—'
    bmi_val = getattr(assessment, 'bmi', '—') or '—'
    temperature = getattr(assessment, 'temperature', '—') or '—'
    fasting_glucose = getattr(assessment, 'fasting_glucose', '—') or '—'
    hba1c_val = getattr(assessment, 'hba1c', '—') or '—'
    total_cholesterol = getattr(assessment, 'total_cholesterol', '—') or '—'

    html = f"""
    <div class="section">
        <h2 class="section-title">Clinical Assessment</h2>
        
        <h3>Assessment Details</h3>
        <div class="info-grid">
            <div><strong>Assessment Date:</strong> {assessment_date_str}</div>
            <div><strong>Assessed By:</strong> {assessor_name}</div>
            <div><strong>Chief Complaint:</strong> {assessment.chief_complaint or 'Not documented'}</div>
            <div><strong>Diagnosis:</strong> {assessment.diagnosis or 'Not specified'}</div>
        </div>

        <h3>Vital Signs</h3>
        <div class="vital-grid">
            <div><strong>Blood Pressure:</strong> {systolic_bp}/{diastolic_bp} mmHg</div>
            <div><strong>Heart Rate:</strong> {heart_rate} bpm</div>
            <div><strong>BMI:</strong> {bmi_val} kg/m²</div>
            <div><strong>Temperature:</strong> {temperature} °C</div>
        </div>

        <h3>Laboratory Results</h3>
        <div class="lab-grid">
            <div><strong>Glucose:</strong> {fasting_glucose} mg/dL</div>
            <div><strong>HbA1c:</strong> {hba1c_val}%</div>
            <div><strong>Total Cholesterol:</strong> {total_cholesterol} mg/dL</div>
        </div>

        {generate_ai_recommendation_html(assessment)}
    </div>
    """
    return html

def generate_assessment_report_content(assessment):
    """Generate summary assessment report"""
    assessor = User.query.get(assessment.assessed_by) if assessment.assessed_by else None
    assessment_date_str = assessment.assessment_date.strftime('%d/%m/%Y %H:%M') if assessment.assessment_date else 'N/A'
    assessor_name = assessor.full_name if assessor else 'Unknown'

    # Safely get attributes with defaults
    systolic_bp = getattr(assessment, 'systolic_bp', '—') or '—'
    diastolic_bp = getattr(assessment, 'diastolic_bp', '—') or '—'
    heart_rate = getattr(assessment, 'heart_rate', '—') or '—'
    bmi_val = getattr(assessment, 'bmi', '—') or '—'
    fasting_glucose = getattr(assessment, 'fasting_glucose', '—') or '—'

    html = f"""
    <div class="section">
        <h2 class="section-title">Assessment Summary</h2>
        
        <div class="info-grid">
            <div><strong>Assessment Date:</strong> {assessment_date_str}</div>
            <div><strong>Assessed By:</strong> {assessor_name}</div>
            <div><strong>Chief Complaint:</strong> {assessment.chief_complaint or 'Not documented'}</div>
            <div><strong>Diagnosis:</strong> {assessment.diagnosis or 'Not specified'}</div>
        </div>

        <h3>Key Vitals</h3>
        <div class="vital-grid">
            <div><strong>BP:</strong> {systolic_bp}/{diastolic_bp} mmHg</div>
            <div><strong>Heart Rate:</strong> {heart_rate} bpm</div>
            <div><strong>BMI:</strong> {bmi_val} kg/m²</div>
            <div><strong>Glucose:</strong> {fasting_glucose} mg/dL</div>
        </div>

        {generate_ai_recommendation_html(assessment)}
    </div>
    """
    return html

def generate_assessment_report_content(assessment):
    """Generate summary assessment report"""
    assessor = User.query.get(assessment.assessed_by) if assessment.assessed_by else None
    assessment_date_str = assessment.assessment_date.strftime('%d/%m/%Y %H:%M') if assessment.assessment_date else 'N/A'
    assessor_name = assessor.full_name if assessor else 'Unknown'

    html = f"""
    <div class="section">
        <h2 class="section-title">Assessment Summary</h2>
        
        <div class="info-grid">
            <div><strong>Assessment Date:</strong> {assessment_date_str}</div>
            <div><strong>Assessed By:</strong> {assessor_name}</div>
            <div><strong>Chief Complaint:</strong> {assessment.chief_complaint or 'Not documented'}</div>
            <div><strong>Diagnosis:</strong> {assessment.diagnosis or 'Not specified'}</div>
        </div>

        <h3>Key Vitals</h3>
        <div class="vital-grid">
            <div><strong>BP:</strong> {assessment.systolic_bp or '—'}/{assessment.diastolic_bp or '—'} mmHg</div>
            <div><strong>Heart Rate:</strong> {assessment.heart_rate or '—'} bpm</div>
            <div><strong>BMI:</strong> {assessment.bmi or '—'} kg/m²</div>
            <div><strong>Glucose:</strong> {assessment.fasting_glucose or '—'} mg/dL</div>
        </div>

        {generate_ai_recommendation_html(assessment)}
    </div>
    """
    return html

def generate_ai_recommendation_html(assessment):
    dosage = getattr(assessment, 'dosage', None) or 'As prescribed'
    
    html = f"""
    <div class="ai-recommendation">
        <h3>AI Recommendation</h3>
        <p><strong>Recommended Drug:</strong> {assessment.ai_recommended_drug or 'Pending'}</p>
        <p><strong>Dosage:</strong> {dosage}</p>
        <p><strong>Confidence:</strong> {assessment.ai_confidence or '0'}%</p>
    """

    if assessment.clinician_decision:
        html += f"""
        <h3>Clinician Decision</h3>
        <p><strong>Decision:</strong> {assessment.clinician_decision or 'Not specified'}</p>
        """
        if assessment.clinician_selected_drug:
            html += f"<p><strong>Selected Drug:</strong> {assessment.clinician_selected_drug}</p>"
        if assessment.clinician_notes:
            html += f"<p><strong>Notes:</strong> {assessment.clinician_notes}</p>"
    
    html += "</div>"
    return html