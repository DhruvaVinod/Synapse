# predictor.py
import joblib
import re
import numpy as np
from sentence_transformers import SentenceTransformer
from matcher import VolunteerMatcher

class CivicOrchestrator:
    def __init__(self, model_path='new_model.pkl', vol_dataset='volunteers.csv'):
        # 1. Load the NLP Brain
        self.encoder = SentenceTransformer('all-MiniLM-L6-v2')
        
        # 2. Load ML Components
        self.model = joblib.load(model_path)
        self.le_cat = joblib.load('le_cat.pkl')
        self.le_prio = joblib.load('le_prio.pkl')
        self.le_res = joblib.load('le_res.pkl')
        
        # 3. Initialize Cosine Matcher with live dataset
        self.matcher = VolunteerMatcher(vol_dataset, self.encoder)
        
        # 4. Guardrail Pattern for override rules
        self.critical_pattern = re.compile(r'\b(?:blood|fire|trapped|killed|emergency|attack)\b', re.IGNORECASE)

    def _calculate_urgency_score(self, urgency_probs):
        """
        Dynamically map the model's confidence across classes into a 1-100 numeric score.
        """
        # le_prio.classes_ sorts alphabetically: e.g. ['Critical', 'High', 'Low', 'Medium']
        # We need to map the respective index to a severity weight (1-100)
        class_names = self.le_prio.classes_
        weight_map = {"Low": 10, "Medium": 40, "High": 70, "Critical": 100}
        
        # Reorder weights to match the LabelEncoder's alphabetical array shape
        weights = np.array([weight_map.get(c, 50) for c in class_names])
        
        # Calculate expected score based on probabilities
        score = np.sum(urgency_probs * weights)
        return min(round(float(score), 1), 100.0)

    # THE FIX: Added lat=None, lng=None to the signature
    def process_request(self, user_text, lat=None, lng=None):
        # Step 1: Encode Text
        embedding = self.encoder.encode([user_text])
        
        # Step 2: Make 3-Headed Prediction
        raw_pred = self.model.predict(embedding)[0]
        
        # Get Probabilities for Urgency (Target index 1)
        prob_arrays = self.model.predict_proba(embedding)
        urgency_probs = prob_arrays[1][0] 
        
        # Step 3: Decode Labels
        detected_need = self.le_cat.inverse_transform([raw_pred[0]])[0]
        urgency_label = self.le_prio.inverse_transform([raw_pred[1]])[0]
        detected_res = self.le_res.inverse_transform([raw_pred[2]])[0]
        
        # Step 4: Calculate numerical score 
        u_score = self._calculate_urgency_score(urgency_probs)
        
        # Step 5: Rule Engine Override
        if self.critical_pattern.search(user_text):
            u_score = max(u_score, 95.0) 
            
        # Step 6: Trigger Hybrid Matcher (AI + Geospatial)
        matched_vols = self.matcher.find_best_matches(embedding[0], need_lat=lat, need_lng=lng, top_k=3)
        
        # Output JSON Format
        return {
            "need_detection": detected_need,
            "urgency_label": urgency_label,
            "urgency_score": f"{u_score}/100",
            "resources_needed": detected_res,
            "recommended_volunteers": matched_vols
        }

if __name__ == "__main__":
    system = CivicOrchestrator()
    
    test_case = "Elderly man trapped due to flooding, needs immediate rescue and medical attention."
    # Let's use some dummy coordinates for the crisis (e.g., somewhere in Delhi)
    test_lat = 28.6139
    test_lng = 77.2090
    
    print(f"\n--- Processing Crisis: '{test_case}' ---")
    
    # Pass the dummy coordinates into the function
    output = system.process_request(test_case, lat=test_lat, lng=test_lng)
    import json
    print(json.dumps(output, indent=2))