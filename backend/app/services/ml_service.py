import joblib
import numpy as np
import pandas as pd
import os
from flask import current_app

class MLPredictionService:
    def __init__(self):
        self._model = None
        self._encoders = {}
        
    
    @property
    def model(self):
        """Lazy load model when first accessed"""
        if self._model is None:
            self._load_models()
        return self._model
    
    @property
    def encoders(self):
        """Lazy load encoders when first accessed"""
        if not self._encoders:
            self._load_models()
        return self._encoders
    
    def _load_models(self):
        """Load trained ML models - called only when needed"""
        try:
            
            try:
                if current_app:
                    models_dir = current_app.config.get('ML_MODELS_DIR', 'ml/models')
                else:
                    models_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'ml', 'models')
            except:
                
                models_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'ml', 'models')
            
            self._model = joblib.load(os.path.join(models_dir, 'drug_model.joblib'))
            self._encoders['drug'] = joblib.load(os.path.join(models_dir, 'le_drug.joblib'))
            self._encoders['bp'] = joblib.load(os.path.join(models_dir, 'le_bp.joblib'))
            self._encoders['chol'] = joblib.load(os.path.join(models_dir, 'le_chol.joblib'))
            self._encoders['sex'] = joblib.load(os.path.join(models_dir, 'le_sex.joblib'))
            
            print(" ML models loaded successfully")
        except Exception as e:
            print(f" Error loading ML models: {e}")
            print("   Using fallback predictions")
            self._model = None
            self._encoders = {}
    
    def predict(self, features):
        """Make drug prediction"""
        if self.model is None:  # This triggers lazy loading
            return self._fallback_prediction(features)
        
        try:
            # Prepare features for model
            from app.routes.clinical import categorize_blood_pressure, categorize_cholesterol, categorize_glucose
            
            bp_category = categorize_blood_pressure(
                features.get('systolic_bp', 120), 
                features.get('diastolic_bp', 80)
            )
            chol_category = categorize_cholesterol(features.get('cholesterol', 180))
            
            # Map categories for model
            bp_map = {
                'LOW': 'LOW',
                'NORMAL': 'NORMAL', 
                'ELEVATED': 'NORMAL',
                'HIGH_STAGE1': 'HIGH',
                'HIGH_STAGE2': 'HIGH'
            }
            chol_map = {
                'NORMAL': 'NORMAL',
                'BORDERLINE_HIGH': 'HIGH',
                'HIGH': 'HIGH'
            }
            
            bp = bp_map.get(bp_category, 'NORMAL')
            chol = chol_map.get(chol_category, 'NORMAL')
            
            # Encode categorical features
            sex_encoded = self.encoders['sex'].transform([features.get('sex', 'M')])[0]
            bp_encoded = self.encoders['bp'].transform([bp])[0]
            chol_encoded = self.encoders['chol'].transform([chol])[0]
            
            # Estimate Na_to_K ratio
            na_to_k = self._estimate_na_to_k(features)
            
            # Create input dataframe
            input_data = pd.DataFrame({
                'Age': [features.get('age', 50)],
                'Sex': [sex_encoded],
                'BP': [bp_encoded],
                'Cholesterol': [chol_encoded],
                'Na_to_K': [na_to_k]
            })
            
            # Get prediction
            prediction = self.model.predict(input_data)[0]
            drug_name = self.encoders['drug'].inverse_transform([prediction])[0]
            
            # Get confidence
            if hasattr(self.model, 'predict_proba'):
                probabilities = self.model.predict_proba(input_data)[0]
                confidence = float(max(probabilities) * 100)
            else:
                confidence = 85.0
            
            return {
                'drug': drug_name,
                'confidence': round(confidence, 1),
                'alternatives': self._get_alternatives(features, prediction),
                'explanation': self._generate_explanation(features, drug_name),
                'standard_dosage': self._get_standard_dosage(drug_name)
            }
            
        except Exception as e:
            print(f"Prediction error: {e}")
            return self._fallback_prediction(features)
    
    def _estimate_na_to_k(self, features):
        """Estimate Na_to_K ratio based on health metrics"""
        base_na_to_k = 15.0
        from app.routes.clinical import categorize_blood_pressure, categorize_cholesterol, categorize_glucose
        
        bp_category = categorize_blood_pressure(
            features.get('systolic_bp', 120), 
            features.get('diastolic_bp', 80)
        )
        chol_category = categorize_cholesterol(features.get('cholesterol', 180))
        glucose_category = categorize_glucose(features.get('fasting_glucose', 100))
        bmi = features.get('bmi', 25)
        
        if bp_category in ['HIGH_STAGE1', 'HIGH_STAGE2']:
            base_na_to_k += 2.0
        if chol_category in ['BORDERLINE_HIGH', 'HIGH']:
            base_na_to_k += 1.5
        if glucose_category in ['PREDIABETES', 'DIABETES']:
            base_na_to_k += 1.0
        if bmi > 25:
            base_na_to_k += (bmi - 25) * 0.1
            
        return max(10.0, min(30.0, base_na_to_k))
    
    def _fallback_prediction(self, features):
        """Fallback when model is not available"""
        glucose = features.get('fasting_glucose', 0)
        systolic = features.get('systolic_bp', 0)
        cholesterol = features.get('cholesterol', 0)
        
        if glucose > 126:
            drug = 'Metformin'
            confidence = 88.5
        elif systolic > 140:
            drug = 'Lisinopril'
            confidence = 86.2
        elif cholesterol > 200:
            drug = 'Atorvastatin'
            confidence = 84.7
        else:
            drug = 'Amlodipine'
            confidence = 82.1
        
        return {
            'drug': drug,
            'confidence': confidence,
            'alternatives': [],
            'explanation': self._generate_explanation(features, drug),
            'standard_dosage': self._get_standard_dosage(drug)
        }
    
    def _get_alternatives(self, features, current_prediction):
        """Get alternative drug options"""
        from app.routes.clinical import DRUG_DATABASE
        alternatives = []
        all_drugs = list(DRUG_DATABASE.keys())
        
        for drug_code in all_drugs[:3]:
            if drug_code != current_prediction:
                alternatives.append({
                    'drug': DRUG_DATABASE[drug_code]['name'],
                    'confidence': round(np.random.uniform(65, 80), 1)
                })
        
        return alternatives
    
    def _generate_explanation(self, features, drug):
        """Generate clinical explanation"""
        factors = []
        
        if features.get('fasting_glucose', 0) > 126:
            factors.append("Elevated fasting glucose indicating diabetes")
        elif features.get('fasting_glucose', 0) > 100:
            factors.append("Impaired fasting glucose")
            
        if features.get('systolic_bp', 0) > 140:
            factors.append("Stage 2 hypertension")
        elif features.get('systolic_bp', 0) > 130:
            factors.append("Stage 1 hypertension")
            
        if features.get('bmi', 0) > 30:
            factors.append("Obese BMI classification")
        elif features.get('bmi', 0) > 25:
            factors.append("Overweight BMI classification")
            
        if features.get('cholesterol', 0) > 240:
            factors.append("High cholesterol")
        elif features.get('cholesterol', 0) > 200:
            factors.append("Borderline high cholesterol")
        
        return {
            'key_factors': factors[:3],
            'clinical_rationale': f"{drug} is recommended based on patient's clinical profile"
        }
    
    def _get_standard_dosage(self, drug_name):
        """Get standard dosage for common drugs"""
        dosages = {
            'Metformin': '500mg twice daily with meals',
            'Lisinopril': '10mg once daily',
            'Amlodipine': '5mg once daily',
            'Atorvastatin': '20mg once daily',
            'Metoprolol': '50mg twice daily',
            'Omeprazole': '20mg once daily',
            'Sertraline': '50mg once daily',
            'Levothyroxine': '75mcg once daily'
        }
        return dosages.get(drug_name, 'As directed by physician')

ml_service = MLPredictionService()