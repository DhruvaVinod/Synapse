# UrbanMind – Smart Complaint Management System

## Overview
**Civic Policy** is a digital platform that enables citizens to register civic complaints related to government departments (such as Health, Sanitation, Infrastructure, etc.) and automatically classifies these complaints based on their nature and urgency.

The platform integrates a modern frontend, backend API, database, and an AI module to provide a complete end-to-end complaint management system.

---

## Objectives
- Enable citizens to easily submit complaints  
- Automatically classify complaints using AI  
- Detect urgency and prioritize issues  
- Provide a centralized system for tracking complaints  

---

## Features

### Complaint Registration
- Submit complaints via text input  
- Optional image upload support  
- Location tagging for complaints  

### AI-Based Classification
- Automatically detects:
  - Complaint category  
  - Priority level (Low / Medium / High)  

### Multilingual & Voice Support 
- Support for multiple languages (English, Hindi, Malayalam)  
- Voice-based complaint submission (Speech-to-Text)  

### Map Visualization
- View complaints geographically using an interactive map  
- Hover to view complaint reference IDs

### Complaint Tracking
- Track complaint status using a reference ID  

---

## Tech Stack

### Frontend
- React.js  
- Axios (API calls)  
- Tailwind CSS  
- Leaflet.js (Map visualization)  

### Backend
- Node.js (Express.js)  
- MongoDB (Database)  
- CORS enabled  

### AI Module
- Python (FastAPI)  
- Scikit-learn  
- Sentence Transformers (BERT-based embeddings)  

# AI Module

AI-powered civic complaint classification system that automatically predicts:

*  *Department / Category*
*  *Priority Level (Low / Medium / High)*

Built using *Sentence Transformers + Neural Networks (MLPClassifier)* with an additional *safety override layer* for critical situations.

---

## Project Structure

```text
AI-module/
│── training.py          # Model training pipeline
│── model.py             # Neural network architecture
│── predictor.py         # Inference + safety override
│── civic_nn_model.pkl   # Trained model
│── le_cat.pkl           # Category label encoder
│── le_prio.pkl          # Priority label encoder
│── civic_issues_training_data.csv
```
---

## Model Architecture

### 1. Text Embedding Model

* *Model:* all-MiniLM-L6-v2
* *Library:* SentenceTransformers
* Converts complaint text → dense semantic vectors (~384-dim)

---

### 2. Neural Network Classifier

* *Model:* MLPClassifier (Scikit-learn)

*Architecture:*

* Input: Embeddings
* Hidden Layers: (128, 64)
* Output: Multi-output prediction
  → [category, priority]

---

## Training Pipeline

### 1. Load & Clean Data

python
df = pd.read_csv(data_path)
df = df.dropna(subset=['complaints', 'category'])


### 2. Prepare Inputs

python
X_text = df['complaints'].tolist()
y = df['category'].tolist()


### 3. Generate Embeddings

python
encoder = SentenceTransformer('all-MiniLM-L6-v2')
X_embeddings = encoder.encode(X_text)


### 4. Train-Test Split

python
X_train, X_test, y_train, y_test = train_test_split(
    X_embeddings, y, test_size=0.2, random_state=42
)


### 5. Train Model

python
nn_classifier.fit(X_train, y_train)


### 6. Evaluate

python
print(classification_report(y_test, y_pred))


### 7. Save Model

python
joblib.dump(nn_classifier, 'civic_nn_model.pkl')


---

## Training Parameters

python
MLPClassifier(
    hidden_layer_sizes=(128, 64),
    activation='relu',
    solver='adam',
    max_iter=1000,
    early_stopping=False,
    alpha=0.05,
    random_state=42
)


| Parameter          | Value     |
| ------------------ | --------- |
| hidden_layer_sizes | (128, 64) |
| activation         | relu      |
| solver             | adam      |
| max_iter           | 1000      |
| early_stopping     | False     |
| alpha              | 0.05      |
| random_state       | 42        |

---

## Model Weights

* Learned during training via backpropagation
* Stored inside the trained MLPClassifier
* Saved using:

python
joblib.dump(nn_classifier, 'civic_nn_model.pkl')


---

## Prediction Pipeline

### 1. Load Model

python
self.encoder = SentenceTransformer('all-MiniLM-L6-v2')
self.model = joblib.load('civic_nn_model.pkl')


### 2. Convert Input → Embedding

python
embedding = self.encoder.encode([user_text])


### 3. Predict

python
raw_prediction = self.model.predict(embedding)[0]


### 4. Decode Labels

python
category = self.le_cat.inverse_transform([raw_prediction[0]])[0]
priority = self.le_prio.inverse_transform([raw_prediction[1]])[0]


---
# Model Performance Update 

##  Updated Deep Learning Model Metrics 

We have improved the performance of our civic complaint classification model. Below are the latest evaluation results:
<img width="1126" height="446" alt="image" src="https://github.com/user-attachments/assets/45912108-fbc6-48d4-b8de-88d7348a6bdd" />


---

##  Overall Performance 

- **Accuracy:** 95%
- **Macro Average (Precision / Recall / F1-score):** 0.95 / 0.95 / 0.95
- **Weighted Average (Precision / Recall / F1-score):** 0.95 / 0.95 / 0.95

---



## Safety Override

Critical keywords are detected using regex:

python
r'\b(?:attack|hospital|fire|blood|killed|emergency|injury)\b'


If detected:

python
priority = "High"


---

## Output Format

json
{
  "text": "User complaint",
  "predicted_department": "Department Name",
  "priority_level": "High"
}


---

## Usage

### Train Model

bash
python training.py


### Run Prediction

bash
python predictor.py


---

## Dependencies

bash
pip install pandas scikit-learn sentence-transformers joblib


---

## System Architecture

Frontend (React) -> Backend API (Node.js) -> Database (MongoDB) -> AI Module (FastAPI)


---

## Workflow

1. User submits a complaint through the frontend  
2. Frontend sends request to backend (`/api/complaints`)  
3. Backend forwards complaint text to AI module  
4. AI module:
   - Classifies category  
   - Determines priority  
5. Backend stores complaint in database  
6. Frontend displays classification results  

---

## Installation & Setup

### Clone the repository
```bash
git clone <your-repo-url>
cd UrbanMind
```

### Setup Backend
```bash
cd backend
npm install
```

Create .env file in backend:
- MONGO_URI=mongodb://127.0.0.1:27017/urbanmind
- PORT=5000

Start backend server
```bash
node server.js
```

### Setup Frontend
```bash
cd scia-frontend

npm install

# Install dependencies
npm install axios leaflet react-leaflet
npm install react-router-dom
npm install recharts

# Tailwind setup
npm install -D tailwindcss @tailwindcss/vite
npm install autoprefixer postcss tailwindcss

# Run frontend
npm run dev
```

# Setup AI Module
```bash
cd AI-module

python3 -m venv venv
```

## Activate environment:

### Windows:

```bash
venv\Scripts\activate
```

### Mac/Linux:

```bash
source venv/bin/activate
pip install -r requirements.txt
```

## Run AI server
```bash
uvicorn app:app --reload --port 8000
```

## Set up Database
### Windows
Step 1: Install MongoDB
Go to: https://www.mongodb.com/try/download/community
Select:
  Platform: Windows
  Package: .msi
Download and run installer

Step 2: Install with Recommended Settings
Choose Complete Setup
Enable:
  "Install MongoDB as a Service"
  "Run service as Network Service user"
  "Install MongoDB Compass"

Step 3: Verify Installation
Open MongoDB Compass
Connect using:
  mongodb://localhost:27017
If you see databases like admin, config, local → success

### macOS
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

Verify Installation
```bash
mongodb://localhost:27017
```

### Database Schema
complaints:
- id
- text
- category
- priority
- location
- citizen name
- status
- latitude
- longitude
- createdAt
- updatedAt
- adminReply
- closedAt

# Run the Full Application

## Open 3 terminals:

### Terminal 1 (Backend)
```bash
cd backend
node server.js
```

### Terminal 2 (Frontend)
```bash
cd scia-frontend
npm run dev
```

### Terminal 3 (AI Module)
```bash
cd AI-module
venv\Scripts\activate   # or source venv/bin/activate
uvicorn app:app --reload --port 8000
```
