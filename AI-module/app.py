# app.py  –  Synapse AI Microservice  (upgraded from UrbanMind)
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import time

from predictor import DeepLearningCivicPredictor
from deep_translator import GoogleTranslator

app = FastAPI(title="Synapse AI Microservice")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

print("BOOTING UP: Loading AI models...")
try:
    ai_predictor = DeepLearningCivicPredictor("civic_nn_model.pkl")
    print("✅ AI ready!")
except Exception as e:
    print(f"❌ Error loading model: {e}")
    print("Run 'python training.py' first.")


# ── Request models ────────────────────────────────────────────────

class TicketRequest(BaseModel):
    text: str

class TranslateRequest(BaseModel):
    text: str
    sourceLang: str
    targetLang: str

class MatchRequest(BaseModel):
    needText:    str
    needType:    str
    urgency:     str
    volunteerProfiles: list   # list of { id, skills: [], lat, lng }
    needLat:     float = 0.0
    needLng:     float = 0.0


# ── Endpoints ─────────────────────────────────────────────────────

@app.post("/predict")
def predict_ticket(request: TicketRequest):
    """
    Classify a community need and assign urgency score.
    Returns: predicted_department (needType) + priority_level (urgencyScore)
    """
    start = time.time()
    result = ai_predictor.predict(request.text)
    return {
        "success": True,
        "prediction": result,
        "inference_time_seconds": round(time.time() - start, 4),
    }


@app.post("/translate")
def translate_text(request: TranslateRequest):
    """Translate text between supported languages via GoogleTranslator."""
    if request.sourceLang == request.targetLang:
        return {"translatedText": request.text, "cached": True}

    try:
        translator = GoogleTranslator(source=request.sourceLang, target=request.targetLang)
        translated = translator.translate(request.text)
        return {
            "success": True,
            "translatedText": translated,
            "sourceLang": request.sourceLang,
            "targetLang": request.targetLang,
        }
    except Exception as e:
        return {"success": False, "translatedText": request.text, "error": str(e)}


@app.post("/match")
def match_volunteers(request: MatchRequest):
    """
    Rank volunteer profiles for a given need using cosine similarity
    on skill vectors + proximity score.

    This is a lightweight fallback — the primary matching logic lives
    in matchingService.js.  Use this endpoint for heavier ML-based
    ranking in future iterations.
    """
    import math

    SKILL_LIST = ['medical', 'logistics', 'teaching', 'rescue',
                  'counseling', 'food', 'technical', 'general']

    NEED_SKILL_MAP = {
        'Health':         ['medical', 'counseling'],
        'Disaster':       ['rescue', 'logistics', 'medical'],
        'Food':           ['food', 'logistics'],
        'Infrastructure': ['technical', 'logistics'],
        'Education':      ['teaching'],
        'General':        ['general'],
        'Sanitation':     ['logistics', 'general'],
        'Water':          ['technical', 'general'],
        'Electricity':    ['technical'],
        'Animal':         ['general'],
    }

    required = NEED_SKILL_MAP.get(request.needType, ['general'])
    need_vec  = [1 if s in required else 0 for s in SKILL_LIST]

    def cosine(a, b):
        dot  = sum(x * y for x, y in zip(a, b))
        magA = math.sqrt(sum(x ** 2 for x in a))
        magB = math.sqrt(sum(x ** 2 for x in b))
        return dot / (magA * magB) if magA and magB else 0

    def haversine(lat1, lng1, lat2, lng2):
        R = 6371
        dlat = math.radians(lat2 - lat1)
        dlng = math.radians(lng2 - lng1)
        a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    scored = []
    for v in request.volunteerProfiles:
        vol_vec  = [1 if s in v.get('skills', []) else 0 for s in SKILL_LIST]
        skill_score = cosine(need_vec, vol_vec) * 50

        prox_score = 0
        if v.get('lat') and v.get('lng') and request.needLat and request.needLng:
            dist = haversine(v['lat'], v['lng'], request.needLat, request.needLng)
            prox_score = max(0, 30 - (dist / 50) * 30)

        total = round(skill_score + prox_score, 2)
        scored.append({"volunteerId": v['id'], "score": total})

    scored.sort(key=lambda x: x['score'], reverse=True)
    return {"success": True, "ranked": scored}


@app.get("/")
def health_check():
    return {"status": "Synapse AI Microservice running."}