import pandas as pd
import numpy as np
import os
from pathlib import Path

def generate_disease_symptoms_csv(output_path=None):
    """Generate a sample disease-symptoms dataset"""
    
    # Define diseases and their characteristic symptoms
    diseases = {
        'Influenza': ['fever', 'cough', 'fatigue', 'headache', 'muscle_aches', 'chills', 'sore_throat'],
        'Common Cold': ['runny_nose', 'sneezing', 'cough', 'sore_throat', 'nasal_congestion'],
        'COVID-19': ['fever', 'cough', 'fatigue', 'shortness_breath', 'loss_smell', 'loss_taste'],
        'Pneumonia': ['fever', 'cough', 'chest_pain', 'shortness_breath', 'chills'],
        'Bronchitis': ['cough', 'chest_pain', 'wheezing', 'shortness_breath'],
        'Strep Throat': ['sore_throat', 'fever', 'swollen_lymph_nodes', 'difficulty_swallowing'],
        'Allergic Rhinitis': ['runny_nose', 'sneezing', 'red_eyes', 'nasal_congestion'],
        'Asthma': ['cough', 'wheezing', 'shortness_breath', 'chest_pain'],
        'Migraine': ['headache', 'nausea', 'vomiting', 'dizziness', 'blurred_vision'],
        'Tension Headache': ['headache', 'neck_pain', 'shoulder_pain', 'anxiety'],
        'Gastroenteritis': ['nausea', 'vomiting', 'abdominal_pain', 'diarrhea', 'fever'],
        'Food Poisoning': ['nausea', 'vomiting', 'abdominal_pain', 'diarrhea', 'fever'],
        'Urinary Tract Infection': ['frequent_urination', 'urinary_pain', 'abdominal_pain', 'fever'],
        'Diabetes Type 2': ['frequent_urination', 'thirst', 'fatigue', 'blurred_vision', 'weight_loss'],
        'Hypertension': ['headache', 'dizziness', 'chest_pain', 'shortness_breath'],
        'Arthritis': ['joint_pain', 'swelling', 'fatigue', 'stiffness'],
        'Anemia': ['fatigue', 'pale_skin', 'shortness_breath', 'dizziness'],
        'Depression': ['fatigue', 'insomnia', 'anxiety', 'loss_appetite', 'memory_loss'],
        'Anxiety': ['anxiety', 'rapid_heartbeat', 'dizziness', 'insomnia'],
        'Sinusitis': ['headache', 'facial_pressure', 'nasal_congestion', 'fever']
    }
    
    # Define all possible symptoms (100 symptoms)
    all_symptoms = [
        'fever', 'cough', 'fatigue', 'headache', 'runny_nose', 'sneezing', 'sore_throat',
        'muscle_aches', 'joint_pain', 'chest_pain', 'shortness_breath', 'nausea', 'vomiting',
        'abdominal_pain', 'diarrhea', 'constipation', 'skin_rash', 'itching', 'swelling',
        'red_eyes', 'blurred_vision', 'dizziness', 'fainting', 'loss_appetite', 'weight_loss',
        'night_sweats', 'chills', 'back_pain', 'neck_pain', 'shoulder_pain', 'knee_pain',
        'ankle_pain', 'hand_numbness', 'facial_weakness', 'speech_difficulty', 'memory_loss',
        'confusion', 'anxiety', 'depression', 'insomnia', 'heartburn', 'indigestion',
        'blood_in_stool', 'blood_in_urine', 'frequent_urination', 'thirst', 'dry_mouth',
        'eye_strain', 'ear_pain', 'ringing_ears', 'hearing_loss', 'nasal_congestion',
        'loss_smell', 'loss_taste', 'mouth_sores', 'bleeding_gums', 'bruising', 'pale_skin',
        'jaundice', 'swollen_lymph_nodes', 'difficulty_swallowing', 'hoarseness', 'wheezing',
        'cold_sweats', 'rapid_heartbeat', 'swollen_ankles', 'coughing_blood', 'excessive_sweating',
        'hot_flashes', 'choking_sensation', 'tremors', 'seizures', 'paralysis', 'balance_issues',
        'coordination_problems', 'nail_changes', 'hair_loss', 'skin_discoloration', 'vision_changes',
        'eye_pain', 'ear_fullness', 'facial_pressure', 'tooth_pain', 'gum_swelling', 'bad_breath',
        'taste_changes', 'appetite_changes', 'food_cravings', 'food_aversions', 'bloating', 'gas',
        'belching', 'hiccups', 'acid_reflux', 'urinary_pain', 'urinary_urgency', 'urinary_frequency',
        'urinary_incontinence', 'erectile_dysfunction', 'menstrual_pain', 'irregular_periods'
    ]
    
    # Set default output path
    if output_path is None:
        # Get the script directory
        script_dir = Path(__file__).parent
        # Go up to backend/ml/scripts, then to backend/ml/data
        backend_dir = script_dir.parent.parent
        output_path = backend_dir / 'ml' / 'data' / 'disease_symptoms.csv'
    
    # Ensure the directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Create DataFrame
    data = []
    
    for disease, symptoms in diseases.items():
        row = {'disease': disease}
        
        # Initialize all symptoms to 0
        for symptom in all_symptoms:
            row[symptom] = 0
        
        # Set characteristic symptoms to 1
        for symptom in symptoms:
            if symptom in row:
                row[symptom] = 1
        
        # Add some random symptoms for variety
        np.random.seed(hash(disease) % 2**32)
        num_random = np.random.randint(0, 3)  # 0-2 random additional symptoms
        if num_random > 0:
            random_symptoms = np.random.choice(all_symptoms, num_random, replace=False)
            for symptom in random_symptoms:
                if symptom not in symptoms:
                    row[symptom] = 1
        
        data.append(row)
    
    # Create DataFrame
    df = pd.DataFrame(data)
    
    # Save to CSV
    df.to_csv(output_path, index=False)
    
    print("="*60)
    print("DISEASE-SYMPTOMS DATASET GENERATED")
    print("="*60)
    print(f" File saved to: {output_path}")
    print(f" Dataset statistics:")
    print(f"   - Number of diseases: {len(df)}")
    print(f"   - Number of symptoms: {len(all_symptoms)}")
    print(f"   - Total columns: {len(df.columns)}")
    if os.path.exists(output_path):
        print(f"   - File size: {os.path.getsize(output_path) / 1024:.2f} KB")
    print("\n Sample data (first 3 diseases, first 10 symptoms):")
    print(df.head(3)[['disease'] + all_symptoms[:10]].to_string())
    print("="*60)
    
    return df

if __name__ == '__main__':
    generate_disease_symptoms_csv()