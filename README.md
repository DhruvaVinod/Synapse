#  Synapse  Data-Driven Volunteer Coordination for Social Impact

<div align="center">


**Built for the Google Solution Challenge | Team: Pixelators**

*In times of crisis, help is often delayed not because people don't care  but because information is scattered and coordination is difficult. Synapse changes that.*

</div>

---

##  Overview

**Synapse** is an AI-powered volunteer coordination platform that helps local groups and NGOs turn scattered community reports into clear, urgent action. It uses AI to understand community needs, assess urgency, verify authenticity, and connect each request with the most suitable volunteers based on skills and location.

With real-time insights and intelligent coordination, Synapse ensures help moves faster, reaches smarter, and creates real impact where it matters most.

---

##  Problem Statement

**Data-Driven Volunteer Coordination for Social Impact**

Connecting the right help to the right place at the right time is still a major challenge. Traditional systems rely on manual coordination, leading to delays and mismatches between needs and available volunteers.

---

##  Features

###  Flexible Need Reporting
- Submit community needs via **text, voice, and location**
- **Multilingual support** (English, Hindi, Malayalam)
- Speech-to-Text for voice-based submission

###  AI-Powered Validation
- **Fake report detection** using Gemini AI
- Contextual verification with urgency scoring (Critical / High / Medium / Low)
- NLP-based preprocessing (tokenization, stemming, lemmatization)

###  Smart Volunteer Matching
- Skill similarity matching using **sentence embeddings + cosine similarity**
- **Location proximity** matching with distance calculation
- Factors in urgency, availability, and volunteer workload

###  Real-Time Visualization
- **Live Need Heatmap**  geographic view of active community needs
- Color-coded by need type, size, and urgency
- Need tracking dashboards with status distribution

###  End-to-End Coordination
- Full workflow from reporting  assignment  action tracking
- 6-character **reference ID** system for tracking needs
- Admin coordination dashboard with volunteer optimization

###  Volunteer & Resource Management
- Volunteer Hub with registration, skill tagging, and availability settings
- Resource & Alerts system with inventory monitoring
- Active Fleet Database showing volunteer readiness

---

##  Screenshots


<img width="1917" height="953" alt="Screenshot 2026-04-28 200503" src="https://github.com/user-attachments/assets/c5d8955d-db0a-427f-99c1-d0e91fd2635c" />

<img width="1919" height="883" alt="Screenshot 2026-04-28 202529" src="https://github.com/user-attachments/assets/cf8d5a64-8af9-4242-9cd8-fc4e2190c33c" />
<img width="1919" height="885" alt="Screenshot 2026-04-28 202614" src="https://github.com/user-attachments/assets/a19b0c7b-9e80-47b3-9e34-7ff7a8c60423" />
<img width="1919" height="880" alt="Screenshot 2026-04-28 202546" src="https://github.com/user-attachments/assets/cb09475b-9ca2-4326-ba6d-4625676b0e64" />
<img width="1919" height="883" alt="Screenshot 2026-04-28 202529" src="https://github.com/user-attachments/assets/6703e588-0b68-4af6-8c89-73b9b86feb23" />
<img width="1919" height="881" alt="Screenshot 2026-04-28 202510" src="https://github.com/user-attachments/assets/cdbceaa4-8c38-4956-99ea-6256bb5c4ee9" />



---

##  System Architecture

```
Users (Need Reporters / Volunteers / Coordinators)
        
Application Layer
   Web Application (Dashboard, Maps, Task Management)
   Admin Panel (System Management, Analytics)
   API Gateway (Request Routing, Authentication)
        
Backend Services
   Need Service           Create, Update, Manage Needs
   Preprocessing Service  NLP: Tokenization, Stemming, Lemmatization
   Matching Service       Skill Matching, Location Matching, Scoring
   Task Service           Auto-Assign, Track Task Status
   Volunteer Registration  Register Volunteers, Manage Profiles
   Analytics Service      Reports, Heatmaps, Insights
   Coordinator Service    Assign Tasks, Monitor Volunteers
        
External Services
   Maps Service           Location Services
   Gemini API             LLM for NLP & Need Understanding
   Google Translate API   Language Translation
        
Data Layer
   Relational Database    Users, Needs, Tasks, Volunteers
   Vector Database        Embeddings for Skill Matching
        
Monitoring & Management
   Logging & Monitoring   Logs, Error Tracking, System Health
   Deployment             Vercel, Render, HF Spaces
```

---

##  Process Flow

1. User submits a community need (text / voice / location)
2. **Fake Report Detection** via Gemini AI  valid reports proceed; fake reports are rejected and user is notified
3. **NLP Preprocessing**  tokenization, stopword removal, stemming/lemmatization
4. **Need Classification**  NLP intent & category detection
5. **Urgency Level Assignment**  Critical / High / Medium / Low
6. Valid report is stored in the database
7. **Smart Matching**  skill matching (embeddings + cosine similarity) + location matching + urgency/availability/workload scoring
8. **Auto-assign** task to top-ranked volunteer
9. Volunteer accepts task  action in progress
10. On completion  close task, record impact, update dashboard, notify stakeholders

---

##  AI Module

The AI module is a standalone FastAPI microservice responsible for need classification, urgency scoring, resource prediction, and volunteer matching. It runs independently on port 8000 and is consumed by the Node.js backend.

### Project Structure

```text
AI-module/
|-- app.py                     # FastAPI server, /predict and /translate endpoints
|-- predictor.py               # CivicOrchestrator: core inference + MongoDB integration
|-- matcher.py                 # VolunteerMatcher: cosine similarity + haversine distance
|-- model.py                   # MLPClassifier architecture definition
|-- training.py                # Full training pipeline (embedding + multi-output classifier)
|-- utils.py                   # Text cleaning utilities
|-- fix_csv.py                 # Skill normalisation script for volunteers.csv
|-- new_model.pkl              # Trained MultiOutputClassifier (3-headed)
|-- le_cat.pkl                 # LabelEncoder for need category
|-- le_prio.pkl                # LabelEncoder for urgency level
|-- le_res.pkl                 # LabelEncoder for resource requirements
|-- ngo_dataset_15000.csv      # Training dataset (15,000 NGO records)
|-- volunteers.csv             # Fallback volunteer data (used if MongoDB is unreachable)
|-- temp_volunteers.csv        # Auto-generated temporary CSV from live MongoDB fetch
|-- requirements.txt
```

### Model Architecture

**Text Embedding**
- Model: `all-MiniLM-L6-v2` (SentenceTransformers)
- Converts input text to dense semantic vectors (~384 dimensions)

**3-Headed Neural Network Classifier**
- Base model: `MLPClassifier` wrapped in `MultiOutputClassifier` (Scikit-learn)
- Simultaneously predicts three outputs per input:
  - Head 1: Need Category (Medical, Food, Shelter, Hygiene, Education, Elderly Support, Disaster Relief)
  - Head 2: Urgency Level (Low, Medium, High, Critical)
  - Head 3: Resource Requirements (e.g., Ambulance, Food Packets, Tents, etc.)

### Training Parameters

| Parameter          | Value   |
|--------------------|---------|
| hidden_layer_sizes | (64, 32)|
| activation         | relu    |
| solver             | adam    |
| max_iter           | 200     |
| early_stopping     | True    |
| alpha              | 0.8     |
| random_state       | 42      |

### Training Pipeline

1. Load and clean `ngo_dataset_15000.csv` (drops rows missing `ngo_description`, `category`, or `urgency_level`)
2. Oversample rare urgency classes (`Critical` duplicated 2x, `High` duplicated 1x) to reduce class imbalance
3. Synthetically inject `resource_req` column using a category-to-resource mapping
4. Fit and save three `LabelEncoder` instances (`le_cat.pkl`, `le_prio.pkl`, `le_res.pkl`)
5. Encode all descriptions using `all-MiniLM-L6-v2`
6. Train/test split: 80/20
7. Train `MultiOutputClassifier(MLPClassifier(...))` on the 384-dim embeddings
8. Evaluate per-head accuracy on both train and validation sets
9. Save final model as `new_model.pkl`

To retrain:
```bash
python training.py
```

### Volunteer Matching

The `VolunteerMatcher` class in `matcher.py` performs hybrid scoring to rank available volunteers:

**Step 1 — Skill Similarity (Cosine)**
- Volunteer profiles are built by merging their `skills` and `profile_text` fields into one descriptive string
- These are pre-encoded into embeddings at startup
- The orchestrator generates a targeted query string from the model's own predictions (e.g., `"Expertise in Medical and Ambulance, First Aid Kits."`) and encodes it
- Cosine similarity is computed between the query embedding and all volunteer embeddings
- Raw cosine score is scaled to a 0-100 range

**Step 2 — Location Proximity (Haversine)**
- If the request includes `lat` and `lng`, the Haversine formula calculates the distance in kilometres between the need location and each volunteer's coordinates
- Proximity score: `max(0, 100 - (distance_km / 40) * 100)`

**Step 3 — Composite Score**
```
absolute_score = (skill_score * 0.50) + (location_score * 0.50)
```

**Step 4 — Relative Grading**
- The top-ranked volunteer sets the 100% benchmark
- All others are scored relative to the best match
- Final output: `match_quality` (e.g., `"87% Match"`) + `absolute_score`

Returns top 3 volunteers by default.

### Live Volunteer Data

On startup, `predictor.py` connects to MongoDB Atlas and fetches all volunteers where `availability: true`. If the database is unreachable, it falls back to `volunteers.csv`. The fetched data is passed directly to `VolunteerMatcher` (or written to `temp_volunteers.csv` if the matcher requires a file path).

To normalise skill labels in `volunteers.csv` to match the 7 AI categories:
```bash
python fix_csv.py
```

### Safety Override

Critical keywords in the input text automatically escalate the urgency score to a minimum of 95/100:

```python
r'\b(?:blood|fire|trapped|killed|emergency|attack)\b'
# urgency_score = max(current_score, 95.0)
```

### API Endpoints

**POST /predict**

Accepts a community need report and returns classification + matched volunteers.

Request:
```json
{
  "text": "There is a flood and people are trapped near the riverbank",
  "lat": 12.9716,
  "lng": 77.5946
}
```

Response:
```json
{
  "success": true,
  "prediction": {
    "predicted_department": "Disaster Relief",
    "priority_level": "Critical",
    "urgency_score": "95.0/100",
    "resources_needed": "Rescue Boats, Ropes, Flashlights",
    "recommended_volunteers": [
      {
        "volunteer_id": "abc123",
        "name": "Ravi Kumar",
        "phone": "9876543210",
        "skills": "Disaster relief,Medical",
        "distance_km": 3.2,
        "match_quality": "100% Match",
        "absolute_score": 88.4
      }
    ]
  },
  "inference_time_seconds": 0.312
}
```

**POST /translate**

Translates text between supported languages using `deep-translator`.

Request:
```json
{
  "text": "urgent help needed",
  "sourceLang": "en",
  "targetLang": "hi"
}
```

**GET /**

Health check — confirms the microservice and database connection are live.

---

##  Tech Stack

| Layer        | Technology                                      |
|--------------|-------------------------------------------------|
| Frontend     | React.js (Vite), CSS, Tailwind CSS              |
| Backend      | Node.js, Express.js                             |
| Database     | MongoDB Atlas                                   |
| AI / NLP     | Python, FastAPI, Sentence Transformers, Gemini Pro |
| ML           | Scikit-learn (MLPClassifier), PyTorch           |
| Translation  | deep-translator, Google Translate API           |
| Maps         | Leaflet.js, Maps Service                        |
| APIs         | Gemini API, REST APIs                           |
| Deployment   | Vercel (Frontend), Render (Backend), Hugging Face Spaces (AI) |
| Dev Tools    | Git, GitHub, Docker                             |

---

##  Database Schema

```
needs:
  - id
  - text
  - category
  - urgencyLevel          (Critical / High / Medium / Low)
  - location
  - reporterName
  - status                (Detected / In Progress / Completed)
  - latitude
  - longitude
  - verificationScore
  - isFakeDetected
  - volunteerId           (assigned volunteer reference)
  - createdAt
  - updatedAt
  - closedAt

volunteers:
  - id
  - fullName
  - contactNumber
  - baseLocation
  - maxTaskCapacity
  - availabilityType      (Weekdays / Weekends / Emergency Only / Full Time / Evenings)
  - coreSkills            (array: Medical, Shelter, Education, Elderly Support, Food, etc.)
  - skillEmbedding        (vector for cosine similarity matching)
  - rating
  - status                (Ready / Assigned / Unavailable)
  - createdAt
```

---

##  Installation & Setup

### Prerequisites

- Node.js v18+
- Python 3.9+
- MongoDB (local or Atlas)
- Git

---

### 1. Clone the Repository

```bash
git clone https://github.com/DhruvaVinod/Synapse.git
cd Synapse
```

---

### 2. Setup Backend

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:

```env
MONGO_URI=mongodb://127.0.0.1:27017/synapse
PORT=5000
GEMINI_API_KEY=your_gemini_api_key_here
```

Start the backend server:

```bash
node server.js
```

---

### 3. Setup Frontend

```bash
cd scia-frontend

npm install

# Install additional dependencies
npm install axios leaflet react-leaflet
npm install react-router-dom
npm install recharts

# Tailwind CSS setup
npm install -D tailwindcss @tailwindcss/vite
npm install autoprefixer postcss tailwindcss

# Start the frontend
npm run dev
```

---

### 4. Setup AI Module

```bash
cd AI-module

# Create virtual environment
python3 -m venv venv
```

**Activate the environment:**

On Windows:
```bash
venv\Scripts\activate
```

On macOS/Linux:
```bash
source venv/bin/activate
```

Install dependencies:
```bash
pip install -r requirements.txt
```

Or manually:
```bash
pip install pandas scikit-learn sentence-transformers joblib fastapi uvicorn torch deep-translator
```

Train the model (if needed):
```bash
python training.py
```

Run the AI server:
```bash
uvicorn app:app --reload --port 8000
```

---

### 5. Setup Database

**Windows:**

1. Download MongoDB from: https://www.mongodb.com/try/download/community
   - Platform: Windows | Package: `.msi`
2. Run the installer with **Complete Setup**
   - Enable "Install MongoDB as a Service"
   - Enable "Run service as Network Service user"
   - Enable "Install MongoDB Compass"
3. Open MongoDB Compass and connect using:
   ```
   mongodb://localhost:27017
   ```

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

Verify:
```
mongodb://localhost:27017
```

---

##  Running the Full Application

Open **3 separate terminals**:

**Terminal 1  Backend**
```bash
cd backend
node server.js
```

**Terminal 2  Frontend**
```bash
cd scia-frontend
npm run dev
```

**Terminal 3  AI Module**
```bash
cd AI-module
source venv/bin/activate   # or venv\Scripts\activate on Windows
uvicorn app:app --reload --port 8000
```

The app will be available at: `http://localhost:5173`

---

##  Estimated Implementation Cost

All services used operate on **free tiers**, making this a zero-cost MVP:

| Service                    | Tier       |
|----------------------------|------------|
| Gemini API                 | Free (limited usage) |
| MongoDB Atlas              | Free       |
| Hugging Face Inference     | Free       |
| Sentence Transformers      | Local / CPU-based |
| PyTorch                    | Lightweight, no GPU required |
| Vercel (Frontend)          | Free       |
| Render (Backend)           | Free tier  |
| Hugging Face Spaces (AI)   | Free tier  |


---

##  Team

**Team Name:** Pixelators  
**Team Leader:** Hanna Abdul Majeed  
**Challenge:** Google Solution Challenge  Build with AI  
**Problem Statement:** Data-Driven Volunteer Coordination for Social Impact


---

<div align="center">
  <i>Built with  by Team Pixelators for the Google Solution Challenge</i>
</div>
