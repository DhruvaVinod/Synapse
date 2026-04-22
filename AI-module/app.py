from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import time

from predictor import DeepLearningCivicPredictor

# ---------- deep-translator (pip install deep-translator) ----------
from deep_translator import GoogleTranslator

app = FastAPI(title="Civic Issue AI Router Microservice")

# Allow the Node.js backend (and any dev server) to call this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

print("BOOTING UP: Loading Deep Learning models into RAM (Please wait a few seconds)...")
try:
    ai_predictor = DeepLearningCivicPredictor("civic_nn_model.pkl")
    print("✅ AI is awake and ready to receive requests from Node.js!")
except Exception as e:
    print(f"❌ Error loading the AI model: {e}")
    print("Make sure you have run 'python training.py' first to generate the .pkl file.")


# ── Request / Response models ──────────────────────────────────────

class TicketRequest(BaseModel):
    text: str


class TranslateRequest(BaseModel):
    text: str
    sourceLang: str   # ISO 639-1 code, e.g. "hi", "ta", "en"
    targetLang: str   # ISO 639-1 code, e.g. "en"


# ── Endpoints ─────────────────────────────────────────────────────

@app.post("/predict")
def predict_ticket(request: TicketRequest):
    """Classify a civic complaint and assign priority."""
    start = time.time()
    result = ai_predictor.predict(request.text)
    return {
        "success": True,
        "prediction": result,
        "inference_time_seconds": round(time.time() - start, 4),
    }


@app.post("/translate")
def translate_text(request: TranslateRequest):
    """
    Translate text between any two supported languages using GoogleTranslator.
    
    Supported language codes (ISO 639-1):
        en, hi, ta, te, kn, ml, mr, bn, pa, gu, ur
    and many more — see deep_translator documentation.
    """
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
            "translatedText": request.text,   # fall back to original
            "error": str(e),
        }


@app.get("/")
def health_check():
    return {"status": "AI Microservice is running perfectly."}
