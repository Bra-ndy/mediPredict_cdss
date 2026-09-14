from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.disease_predictor import DiseasePredictor
import logging
import os
from pathlib import Path

# Create blueprint
bp = Blueprint('disease', __name__, url_prefix='/api/disease')

# Initialize predictor with augmented data
backend_dir = Path(__file__).parent.parent.parent
augmented_csv_path = backend_dir / 'ml' / 'data' / 'disease_symptoms_augmented.csv'

# Create predictor instance
predictor = DiseasePredictor()
predictor.csv_path = str(augmented_csv_path)

@bp.route('/predict', methods=['POST'])
@jwt_required()
def predict_disease():
    """Predict disease based on symptoms"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No symptoms data provided'}), 400
        
        # Check if model is loaded and trained
        if predictor.model is None:
            if not predictor.load_model():
                # Train if model doesn't exist
                try:
                    results = predictor.train_model()
                    current_app.logger.info(f"Model trained with accuracy: {results['train_accuracy']:.2%}")
                except Exception as e:
                    return jsonify({
                        'error': 'Model not trained',
                        'message': str(e)
                    }), 400
        
        # Get symptoms dictionary
        symptoms = data.get('symptoms', {})
        
        if not symptoms:
            return jsonify({'error': 'No symptoms provided'}), 400
        
        # Make prediction
        prediction = predictor.predict(symptoms)
        
        # Log the prediction
        current_app.logger.info(f"User {current_user_id} predicted: {prediction['predicted_disease']} with {prediction['confidence_percentage']} confidence")
        
        return jsonify({
            'success': True,
            'prediction': prediction
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error predicting disease: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/train', methods=['POST'])
@jwt_required()
def train_model():
    """Train the disease prediction model"""
    try:
        current_user_id = get_jwt_identity()
        
        # Check if user has admin privileges (optional)
        # You might want to add admin check here
        
        # Train model
        results = predictor.train_model()
        
        return jsonify({
            'success': True,
            'message': 'Model trained successfully',
            'results': results
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error training model: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/symptoms', methods=['GET'])
@jwt_required()
def get_symptoms():
    """Get list of all symptoms the model can predict"""
    try:
        current_user_id = get_jwt_identity()
        
        # Check if model is loaded
        if predictor.model is None:
            if not predictor.load_model():
                return jsonify({
                    'error': 'Model not trained',
                    'message': 'Please train the model first'
                }), 400
        
        symptoms = predictor.get_all_symptoms()
        
        return jsonify({
            'success': True,
            'symptoms': symptoms,
            'total': len(symptoms)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/diseases', methods=['GET'])
@jwt_required()
def get_diseases():
    """Get list of all diseases the model can predict"""
    try:
        current_user_id = get_jwt_identity()
        
        # Check if model is loaded
        if predictor.model is None:
            if not predictor.load_model():
                return jsonify({
                    'error': 'Model not trained',
                    'message': 'Please train the model first'
                }), 400
        
        diseases = predictor.get_all_diseases()
        
        return jsonify({
            'success': True,
            'diseases': diseases,
            'total': len(diseases)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/status', methods=['GET'])
def get_status():
    """Get model status"""
    try:
        is_trained = predictor.model is not None
        if not is_trained:
            is_trained = predictor.load_model()
        
        # Fix: Safely get counts
        symptoms_count = 0
        if predictor.symptom_columns is not None:
            symptoms_count = len(predictor.symptom_columns)
        
        diseases_count = 0
        if predictor.diseases is not None:
            diseases_count = len(predictor.diseases)
        
        return jsonify({
            'success': True,
            'model_loaded': bool(is_trained),
            'symptoms_count': symptoms_count,
            'diseases_count': diseases_count,
            'csv_path': str(predictor.csv_path)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/test', methods=['POST'])
# No @jwt_required() - this endpoint is public for testing
def test_prediction():
    """Test endpoint with sample symptoms"""
    try:
        # Sample test symptoms
        test_symptoms = {
            'fever': 1,
            'cough': 1,
            'fatigue': 1,
            'headache': 1,
            'muscle_aches': 1,
            'sore_throat': 1,
            'runny_nose': 0,
            'chills': 1
        }
        
        # Check if model is loaded
        if predictor.model is None:
            if not predictor.load_model():
                predictor.train_model()
        
        prediction = predictor.predict(test_symptoms)
        
        return jsonify({
            'success': True,
            'test_symptoms': test_symptoms,
            'prediction': prediction
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500