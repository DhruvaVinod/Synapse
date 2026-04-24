# matcher.py
import pandas as pd
import numpy as np
import math
from sklearn.metrics.pairwise import cosine_similarity

class VolunteerMatcher:
    def __init__(self, volunteer_csv_path, encoder):
        """
        Loads the volunteer dataset and builds vector embeddings.
        """
        self.encoder = encoder
        print(f"Loading volunteers from {volunteer_csv_path}...")
        self.vol_df = pd.read_csv(volunteer_csv_path)
        
        # Filter for availability so we don't assign busy people
        self.available_vols = self.vol_df[self.vol_df['availability'] == True].reset_index(drop=True)
        
        self._build_vector_index()

    def _build_vector_index(self):
        # Merge skills and profile text into one rich descriptive string per volunteer
        profiles = (self.available_vols['skills'].fillna('') + " " + 
                    self.available_vols['profile_text'].fillna('')).tolist()
        
        self.volunteer_embeddings = self.encoder.encode(profiles, show_progress_bar=False)

    def _haversine_km(self, lat1, lng1, lat2, lng2):
        """Calculates distance between two lat/lng coordinates in kilometers."""
        R = 6371.0 # Earth radius in kilometers
        
        dLat = math.radians(lat2 - lat1)
        dLng = math.radians(lng2 - lng1)
        
        a = (math.sin(dLat / 2) ** 2 +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dLng / 2) ** 2)
        
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    def find_best_matches(self, need_embedding, need_lat=None, need_lng=None, top_k=3):
        # 1. Calculate cosine similarity (AI Score: 0 to 1)
        ai_similarities = cosine_similarity([need_embedding], self.volunteer_embeddings)[0]
        
        scored_volunteers = []
        
        # 2. Iterate through volunteers to calculate Hybrid Score
        for idx, vol in self.available_vols.iterrows():
            # Base AI Score out of 100
            ai_score = max(0, float(ai_similarities[idx] * 100))
            
            # Default Location Score if coordinates are missing
            loc_score = 0
            dist_km = "Unknown"
            
            # Calculate actual distance if coordinates exist
            if need_lat and need_lng and pd.notna(vol.get('lat')) and pd.notna(vol.get('lng')):
                dist = self._haversine_km(need_lat, need_lng, vol['lat'], vol['lng'])
                dist_km = round(dist, 1)
                
                # Proximity Math: 0km = 100 points, 50+km = 0 points
                loc_score = max(0, 100 - (dist / 50) * 100)
            
            # HYBRID CALCULATION: 60% AI Context, 40% Physical Proximity
            hybrid_score = (ai_score * 0.6) + (loc_score * 0.4)
            
            scored_volunteers.append({
                "volunteer_id": str(vol['volunteer_id']), 
                "name": str(vol['name']),
                "phone": int(vol['phone']), 
                "skills": str(vol['skills']),
                "distance_km": dist_km,
                "hybrid_match_score": hybrid_score
            })
            
        # 3. Sort by highest hybrid score and slice the top_k
        scored_volunteers.sort(key=lambda x: x['hybrid_match_score'], reverse=True)
        best_matches = scored_volunteers[:top_k]
        
        # 4. Format scores for clean JSON output
        for match in best_matches:
            match['hybrid_match_score'] = f"{round(match['hybrid_match_score'], 1)}/100"
            
        return best_matches