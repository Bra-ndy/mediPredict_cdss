import json
from typing import List, Dict

class DrugInteractionService:
    def __init__(self):
        # Load drug interaction database
        self.interaction_db = {
            'Metformin': {
                'contraindications': ['Severe renal impairment', 'Metabolic acidosis'],
                'interactions': ['Iodinated contrast', 'Cimetidine', 'Alcohol'],
                'cautions': ['Elderly', 'Hepatic impairment']
            },
            'Lisinopril': {
                'contraindications': ['Angioedema history', 'Pregnancy'],
                'interactions': ['Potassium supplements', 'NSAIDs', 'Lithium'],
                'cautions': ['Renal artery stenosis', 'Volume depletion']
            },
            'Warfarin': {
                'contraindications': ['Active bleeding', 'Pregnancy'],
                'interactions': ['Aspirin', 'NSAIDs', 'Amiodarone', 'Antibiotics'],
                'cautions': ['Elderly', 'Hepatic impairment']
            },
            'Atorvastatin': {
                'contraindications': ['Active liver disease', 'Pregnancy'],
                'interactions': ['Cyclosporine', 'Gemfibrozil', 'Protease inhibitors'],
                'cautions': ['Renal impairment', 'Hypothyroidism']
            },
            'Amlodipine': {
                'contraindications': ['Cardiogenic shock', 'Severe aortic stenosis'],
                'interactions': ['Simvastatin', 'Cyclosporine', 'Grapefruit juice'],
                'cautions': ['Elderly', 'Hepatic impairment']
            }
        }
    
    def check_interactions(self, current_meds: str, new_drug: str) -> Dict:
        """Check interactions between current medications and new drug"""
        if not current_meds:
            return {'severity': 'none', 'warnings': [], 'recommendation': 'No interactions detected'}
        
        current_list = [med.strip() for med in current_meds.split(',')]
        
        warnings = []
        severity = 'none'
        
        for med in current_list:
            # Check each current medication for interaction
            if med in self.interaction_db.get(new_drug, {}).get('interactions', []):
                warnings.append(f" Interaction between {new_drug} and {med}")
                severity = 'moderate'
            
            # Check for contraindications
            if med in self.interaction_db.get(new_drug, {}).get('contraindications', []):
                warnings.append(f" CONTRAINDICATION: {med} with {new_drug}")
                severity = 'severe'
        
        return {
            'severity': severity,
            'warnings': warnings,
            'recommendation': self._get_recommendation(severity)
        }
    
    def calculate_dosage(self, drug: str, weight: float, age: int = None, 
                        creatinine: float = None) -> Dict:
        """Calculate appropriate dosage based on patient factors"""
        dosage = 'As directed by physician'
        max_dose = 'Per clinical guidelines'
        
        if drug == 'Metformin':
            if creatinine and creatinine > 1.5:
                dosage = 'CONTRAINDICATED - eGFR < 30'
            elif creatinine and creatinine > 1.4:
                dosage = '250mg twice daily (50% reduction)'
            else:
                dosage = '500mg twice daily'
            max_dose = '2000mg/day'
            
        elif drug == 'Lisinopril':
            if creatinine and creatinine > 3.0:
                dosage = '2.5mg once daily'
            elif creatinine and creatinine > 2.0:
                dosage = '5mg once daily'
            else:
                dosage = '10mg once daily'
            max_dose = '40mg/day'
            
        elif drug == 'Amlodipine':
            if age and age > 65:
                dosage = '2.5mg once daily'
            else:
                dosage = '5mg once daily'
            max_dose = '10mg/day'
        
        return {
            'starting_dose': dosage,
            'maximum_dose': max_dose,
            'adjustment_factors': {
                'renal': bool(creatinine and creatinine > 1.2),
                'weight_based': weight < 50 or weight > 100,
                'age_adjusted': bool(age and age > 65)
            }
        }
    
    def _get_recommendation(self, severity: str) -> str:
        """Get recommendation based on interaction severity"""
        if severity == 'severe':
            return " Avoid combination - Significant interaction risk"
        elif severity == 'moderate':
            return " Use with caution - Monitor closely"
        else:
            return " No significant interactions detected"

# Singleton instance
drug_service = DrugInteractionService()