from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import time

# FIX 1: Import the correct class name from predictor.py
from predictor import CivicOrchestrator
from deep_translator import GoogleTranslator

app = FastAPI(title="Civic Issue AI Router Microservice")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

print("BOOTING UP: Loading Deep Learning models into RAM (Please wait a few seconds)...")
try:
    # FIX 2: Instantiate the correct class
    ai_predictor = CivicOrchestrator(model_path="new_model.pkl")
    print("✅ AI is awake and ready to receive requests from Node.js!")
except Exception as e:
    print(f"❌ Error loading the AI model: {e}")
    print("Make sure you have run 'python training.py' first to generate the .pkl file.")

# ── Request / Response models ──────────────────────────────────────

class TicketRequest(BaseModel):
    text: str
    lat: float = None # ADD THIS
    lng: float = None # ADD THIS

class TranslateRequest(BaseModel):
    text: str
    sourceLang: str   
    targetLang: str   

# ── Endpoints ─────────────────────────────────────────────────────

@app.post("/predict")
def predict_ticket(request: TicketRequest):
    """Classify a civic complaint and assign priority."""
    start = time.time()
    
    # Pass lat and lng to the orchestrator
    raw_result = ai_predictor.process_request(request.text, request.lat, request.lng)
    
    # FIX 4: Map the Python keys to exactly what Node.js (controller.js) is expecting
    mapped_result = {
        "predicted_department": raw_result.get("need_detection", "General"),
        "priority_level": raw_result.get("urgency_label", "Medium"), 
        "urgency_score": raw_result.get("urgency_score", "50/100"),
        "resources_needed": raw_result.get("resources_needed", "General Relief Supplies"),
        "recommended_volunteers": raw_result.get("recommended_volunteers", [])
    }

    return {
        "success": True,
        "prediction": mapped_result,
        "inference_time_seconds": round(time.time() - start, 4),
    }

@app.post("/translate")
def translate_text(request: TranslateRequest):
    if request.sourceLang == request.targetLang:
        return {"translatedText": request.text, "cached": True}

    try:
        translator = GoogleTranslator(
            source=request.sourceLang,
            target=request.targetLang,
        )
        translated = translator.translate(request.text)
        return {
            "success": True,
            "translatedText": translated,
            "sourceLang": request.sourceLang,
            "targetLang": request.targetLang,
        }
    except Exception as e:
        return {
            "success": False,
            "translatedText": request.text,   
            "error": str(e),
        }

@app.get("/")
def health_check():
    return {"status": "AI Microservice is running perfectly."}