import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
import joblib
import os
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class DiseasePredictor:
    """Disease prediction service based on symptoms"""
    
    def __init__(self, model_path=None, csv_path=None):
        self.model = None
        self.encoder = None
        self.symptom_columns = None
        self.diseases = None
        
        # Set default paths
        if model_path is None:
            model_path = Path(__file__).parent.parent.parent / 'ml' / 'models' / 'disease_predictor.pkl'
        if csv_path is None:
            csv_path = Path(__file__).parent.parent.parent / 'ml' / 'data' / 'disease_symptoms.csv'
        
        self.model_path = model_path
        self.csv_path = csv_path
        
        # Try to load existing model
        self.load_model()
        
        logger.info(f"DiseasePredictor initialized with model_path={self.model_path}, csv_path={self.csv_path}")
    
    def load_and_prepare_data(self, csv_file_path=None):
        """Load CSV data and prepare for training"""
        try:
            # Use provided path or default
            file_path = csv_file_path or self.csv_path
            
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"CSV file not found: {file_path}")
            
            # Load CSV file
            df = pd.read_csv(file_path)
            logger.info(f"Loaded CSV with {len(df)} rows and {len(df.columns)} columns")
            
            # Identify disease column (could be 'disease', 'Disease', 'diagnosis', etc.)
            disease_col = None
            for col in df.columns:
                if col.lower() in ['disease', 'diagnosis', 'condition', 'disease_name']:
                    disease_col = col
                    break
            
            if disease_col is None:
                raise ValueError("Could not identify disease column in CSV")
            
            # Identify symptom columns (all other columns except disease)
            symptom_cols = [col for col in df.columns if col != disease_col]
            
            # Encode diseases
            self.encoder = LabelEncoder()
            y = self.encoder.fit_transform(df[disease_col])
            self.diseases = self.encoder.classes_
            
            # Process symptoms - assume symptoms are binary (0/1)
            X = df[symptom_cols].copy()
            
            # Ensure all values are numeric (0 or 1)
            for col in symptom_cols:
                X[col] = pd.to_numeric(X[col], errors='coerce').fillna(0).astype(int)
            
            self.symptom_columns = symptom_cols
            
            logger.info(f"Prepared data: {len(symptom_cols)} symptoms, {len(self.diseases)} diseases")
            
            return X, y
        
        except Exception as e:
            logger.error(f"Error loading CSV data: {str(e)}")
            raise
    
    def train_model(self, csv_file_path=None):
        """Train the disease prediction model"""
        try:
            # Use provided CSV or default
            csv_path = csv_file_path or self.csv_path
            
            if not os.path.exists(csv_path):
                raise FileNotFoundError(f"CSV file not found: {csv_path}")
            
            # Load and prepare data
            X, y = self.load_and_prepare_data(csv_path)
            
            # Split data WITHOUT stratification (since we have only 1 sample per disease)
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42
            )
            
            # Train Random Forest model
            self.model = RandomForestClassifier(
                n_estimators=100,
                max_depth=15,
                random_state=42,
                class_weight='balanced'
            )
            self.model.fit(X_train, y_train)
            
            # Evaluate
            train_score = self.model.score(X_train, y_train)
            test_score = self.model.score(X_test, y_test)
            
            logger.info(f"Model trained - Train accuracy: {train_score:.2f}, Test accuracy: {test_score:.2f}")
            
            # Save model
            self.save_model()
            
            return {
                'train_accuracy': float(train_score),
                'test_accuracy': float(test_score),
                'n_diseases': len(self.diseases),
                'n_symptoms': len(self.symptom_columns)
            }
        
        except Exception as e:
            logger.error(f"Error training model: {str(e)}")
            raise
    
    def save_model(self):
        """Save trained model to disk"""
        try:
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
            
            # Save model and associated data
            model_data = {
                'model': self.model,
                'encoder': self.encoder,
                'symptom_columns': self.symptom_columns,
                'diseases': self.diseases
            }
            joblib.dump(model_data, self.model_path)
            logger.info(f"Model saved to {self.model_path}")
        
        except Exception as e:
            logger.error(f"Error saving model: {str(e)}")
            raise
    
    def load_model(self):
        """Load trained model from disk"""
        try:
            if os.path.exists(self.model_path):
                model_data = joblib.load(self.model_path)
                self.model = model_data['model']
                self.encoder = model_data['encoder']
                self.symptom_columns = model_data['symptom_columns']
                self.diseases = model_data['diseases']
                logger.info(f"Model loaded from {self.model_path}")
                return True
            else:
                logger.info("No existing model found")
                return False
        
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            return False
    
    def predict(self, symptoms_dict):
        """
        Predict disease based on symptoms
        
        Args:
            symptoms_dict: Dictionary with symptom names as keys and 0/1 as values
                          e.g., {'fever': 1, 'cough': 1, 'fatigue': 0}
        
        Returns:
            Dictionary with predictions and probabilities
        """
        if self.model is None:
            raise ValueError("Model not trained. Please train the model first.")
        
        # Create feature vector
        features = []
        for symptom in self.symptom_columns:
            features.append(symptoms_dict.get(symptom, 0))
        
        # Reshape for prediction
        X = np.array(features).reshape(1, -1)
        
        # Get prediction and probabilities
        prediction_idx = self.model.predict(X)[0]
        probabilities = self.model.predict_proba(X)[0]
        
        # Get top 3 diseases
        top_indices = np.argsort(probabilities)[-3:][::-1]
        top_predictions = [
            {
                'disease': self.diseases[idx],
                'probability': float(probabilities[idx]),
                'confidence_percentage': f"{probabilities[idx]*100:.1f}%"
            }
            for idx in top_indices
        ]
        
        return {
            'predicted_disease': self.diseases[prediction_idx],
            'confidence': float(probabilities[prediction_idx]),
            'confidence_percentage': f"{probabilities[prediction_idx]*100:.1f}%",
            'top_predictions': top_predictions,
            'symptoms_used': len([s for s in features if s == 1]),
            'total_symptoms_considered': len(self.symptom_columns)
        }
    
    def get_all_symptoms(self):
        """Get list of all symptoms the model understands"""
        if self.symptom_columns is None:
            return []
        return self.symptom_columns
    
    def get_all_diseases(self):
        """Get list of all diseases the model can predict"""
        if self.diseases is None:
            return []
        return self.diseases.tolist()