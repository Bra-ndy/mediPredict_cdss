import sys
import os


backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

from app.services.disease_predictor import DiseasePredictor


predictor = DiseasePredictor()


print("Training model...")
results = predictor.train_model()
print(f"Training results: {results}")


print("\nTesting prediction...")
test_symptoms = {
    'fever': 1,
    'cough': 1,
    'fatigue': 1,
    'headache': 1,
    'muscle_aches': 1,
    'runny_nose': 0,
    'sore_throat': 1
}

prediction = predictor.predict(test_symptoms)
print(f"\nPrediction result:")
print(f"Predicted disease: {prediction['predicted_disease']}")
print(f"Confidence: {prediction['confidence_percentage']}")
print(f"\nTop predictions:")
for pred in prediction['top_predictions']:
    print(f"  - {pred['disease']}: {pred['confidence_percentage']}")
