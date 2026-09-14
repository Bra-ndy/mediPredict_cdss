import pandas as pd
import numpy as np
import random
from pathlib import Path

def generate_more_samples():
    """Generate multiple samples per disease for better training"""
    
    # Load original data
    original_path = Path(__file__).parent.parent / 'data' / 'disease_symptoms.csv'
    df = pd.read_csv(original_path)
    
    # Number of samples to generate per disease
    samples_per_disease = 50
    
    # Separate features and target
    disease_col = 'disease'
    symptom_cols = [col for col in df.columns if col != disease_col]
    
    # Create new dataset
    new_rows = []
    
    for _, row in df.iterrows():
        disease = row[disease_col]
        base_symptoms = row[symptom_cols].to_dict()
        
        # Generate multiple variations
        for _ in range(samples_per_disease):
            new_row = {'disease': disease}
            
            # Start with base symptoms
            for symptom in symptom_cols:
                new_row[symptom] = base_symptoms[symptom]
            
            # Add random variations (simulate different patients)
            # Keep core symptoms, add some random variation
            core_symptoms = [s for s in symptom_cols if base_symptoms[s] == 1]
            
            # Sometimes add extra random symptoms (10% chance)
            for symptom in random.sample(symptom_cols, min(3, len(symptom_cols))):
                if random.random() < 0.1:  # 10% chance to add extra symptom
                    new_row[symptom] = 1
            
            # Sometimes miss a core symptom (20% chance)
            for symptom in core_symptoms:
                if random.random() < 0.2:  # 20% chance to miss a symptom
                    new_row[symptom] = 0
            
            new_rows.append(new_row)
    
    # Create new dataframe
    new_df = pd.DataFrame(new_rows)
    
    # Save to new file
    output_path = Path(__file__).parent.parent / 'data' / 'disease_symptoms_augmented.csv'
    new_df.to_csv(output_path, index=False)
    
    print(f"Generated {len(new_df)} samples")
    print(f"Saved to: {output_path}")
    print(f"Original: {len(df)} samples")
    print(f"New: {len(new_df)} samples")
    
    return new_df

if __name__ == '__main__':
    generate_more_samples()