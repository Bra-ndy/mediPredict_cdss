import sys
import os

# Add the backend directory to Python path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

from app.services.disease_predictor import DiseasePredictor

print("="*60)
print("Testing Disease Predictor")
print("="*60)

# Initialize predictor with augmented data
predictor = DiseasePredictor()
# Point to augmented CSV
predictor.csv_path = os.path.join(backend_dir, 'ml', 'data', 'disease_symptoms_augmented.csv')

print("\n1. Training model with augmented data...")
try:
    results = predictor.train_model()
    print(f"    Training successful!")
    print(f"   - Train accuracy: {results['train_accuracy']:.2%}")
    print(f"   - Test accuracy: {results['test_accuracy']:.2%}")
    print(f"   - Diseases: {results['n_diseases']}")
    print(f"   - Symptoms: {results['n_symptoms']}")
except Exception as e:
    print(f"    Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n2. Testing prediction with flu-like symptoms...")
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

try:
    prediction = predictor.predict(test_symptoms)
    print(f"\n    Predicted disease: {prediction['predicted_disease']}")
    print(f"    Confidence: {prediction['confidence_percentage']}")
    print(f"\n    Top 3 predictions:")
    for i, pred in enumerate(prediction['top_predictions'], 1):
        print(f"      {i}. {pred['disease']}: {pred['confidence_percentage']}")
    print(f"\n    Symptoms used: {prediction['symptoms_used']} out of {prediction['total_symptoms_considered']}")
except Exception as e:
    print(f"    Error: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "="*60)
print("Test complete!")