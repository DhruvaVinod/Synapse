# predictor.py
import joblib
import re
from sentence_transformers import SentenceTransformer

class DeepLearningCivicPredictor:
    def __init__(self, model_path='civic_nn_model.pkl'):
        self.encoder = SentenceTransformer('all-MiniLM-L6-v2')
        self.model = joblib.load(model_path)
        
        # Load the "translators" to turn numbers back into words
        self.le_cat = joblib.load('le_cat.pkl')
        self.le_prio = joblib.load('le_prio.pkl')
        
        # Safety Guardrail Keywords
        self.critical_keywords = r'\b(?:attack|hospital|fire|blood|killed|emergency|injury)\b'
        self.safety_pattern = re.compile(self.critical_keywords, re.IGNORECASE)

    def predict(self, user_text):
        # 1. AI Vectorization
        embedding = self.encoder.encode([user_text])
        
        # 2. Multi-output Prediction
        raw_prediction = self.model.predict(embedding)[0] # Returns [cat_num, prio_num]
        
        category = self.le_cat.inverse_transform([raw_prediction[0]])[0]
        priority = self.le_prio.inverse_transform([raw_prediction[1]])[0]
        
        # 3. SAFETY OVERRIDE (The "Dog Attack" Fix)
        if self.safety_pattern.search(user_text):
            print("⚠️ [GUARDRAIL] Safety keyword detected. Overriding to High Priority.")
            priority = "High"

        return {
            "text": user_text,
            "predicted_department": category,
            "priority_level": priority
        }

if __name__ == "__main__":
    predictor = DeepLearningCivicPredictor('civic_nn_model.pkl')
    test_case = "Dogs biting children and theyre falling sick...it is urgent!!!"
    result = predictor.predict(test_case)
    print(f"\nResult of {test_case} Category: {result['predicted_department']} | Priority: {result['priority_level']}")