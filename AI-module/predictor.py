# predictor.py
import joblib
import re
import os
import numpy as np
import pandas as pd
from pymongo import MongoClient
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from matcher import VolunteerMatcher

# Load environment variables for MongoDB connection
load_dotenv()
# Fallback to local if no .env is found (Replace with your actual string if needed)
MONGO_URI = os.getenv("MONGO_URI", "mongodb://synapseUser:123@ac-khawj0x-shard-00-00.sd9xbbe.mongodb.net:27017,ac-khawj0x-shard-00-01.sd9xbbe.mongodb.net:27017,ac-khawj0x-shard-00-02.sd9xbbe.mongodb.net:27017/synapse?ssl=true&replicaSet=atlas-rtsgjc-shard-0&authSource=admin&retryWrites=true&w=majority")

def get_live_volunteers():
    """Fetches live volunteer data directly from MongoDB Atlas and converts it for the AI"""
    try:
        print("⏳ Fetching live volunteers from MongoDB Atlas...")
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        db = client['synapse']
        volunteers_collection = db['volunteers']
        
        cursor = volunteers_collection.find({"availability": True})
        
        volunteers_list = []
        for vol in cursor:
            raw_skills = vol.get("skills", "")
            if isinstance(raw_skills, list):
                skills_str = ",".join(raw_skills)
            else:
                skills_str = str(raw_skills)

            vol_name = vol.get("name", "Unknown")
            vol_location = vol.get("location", "Unknown")

            # FIX: Synthesize a profile_text paragraph for the NLP Matcher to read
            readable_skills = skills_str.replace(",", " and ")
            synthetic_profile = f"{vol_name} is a volunteer located in {vol_location}. They provide support in {readable_skills}."

            volunteers_list.append({
                "volunteer_id": str(vol["_id"]),
                "name": vol_name,
                "phone": vol.get("phone", ""),
                "lat": vol.get("lat", 0.0),
                "lng": vol.get("lng", 0.0),
                "skills": skills_str,
                "availability": True,
                "profile_text": synthetic_profile  # Passed to the Matcher!
            })
            
        if not volunteers_list:
            print("⚠️ No active volunteers found in DB. Falling back to CSV.")
            return pd.read_csv('volunteers.csv')
            
        df = pd.DataFrame(volunteers_list)
        print(f"✅ Successfully loaded {len(df)} live volunteers from Atlas!")
        return df

    except Exception as e:
        print(f"❌ Database Connection Error: {e}")
        print("⚠️ Falling back to volunteers.csv")
        return pd.read_csv('volunteers.csv')

class CivicOrchestrator:
    def __init__(self, model_path='new_model.pkl'):
        # 1. Load the NLP Brain
        self.encoder = SentenceTransformer('all-MiniLM-L6-v2')
        
        # 2. Load ML Components
        self.model = joblib.load(model_path)
        self.le_cat = joblib.load('le_cat.pkl')
        self.le_prio = joblib.load('le_prio.pkl')
        self.le_res = joblib.load('le_res.pkl')
        
        # 3. Initialize Cosine Matcher with Live Atlas Dataset
        live_vol_df = get_live_volunteers()
        
        # Guardrail: If your VolunteerMatcher class specifically expects a CSV file path string
        # instead of a Pandas DataFrame, this try/except safely creates a temporary CSV for it.
        try:
            self.matcher = VolunteerMatcher(live_vol_df, self.encoder)
        except TypeError:
            print("🔄 Saving live DB to temp_volunteers.csv for the Matcher module...")
            live_vol_df.to_csv("temp_volunteers.csv", index=False)
            self.matcher = VolunteerMatcher("temp_volunteers.csv", self.encoder)
            
        # 4. Guardrail Pattern for override rules
        self.critical_pattern = re.compile(r'\b(?:blood|fire|trapped|killed|emergency|attack)\b', re.IGNORECASE)

    def _calculate_urgency_score(self, urgency_probs):
        """
        Dynamically map the model's confidence across classes into a 1-100 numeric score.
        """
        class_names = self.le_prio.classes_
        weight_map = {"Low": 10, "Medium": 40, "High": 70, "Critical": 100}
        
        # Reorder weights to match the LabelEncoder's alphabetical array shape
        weights = np.array([weight_map.get(c, 50) for c in class_names])
        score = np.sum(urgency_probs * weights)
        return min(round(float(score), 1), 100.0)

    def process_request(self, user_text, lat=None, lng=None):
        # Step 1: Encode Text
        embedding = self.encoder.encode([user_text])
        
        # Step 2: Make Prediction
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