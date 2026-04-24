# training.py
import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
from sklearn.preprocessing import LabelEncoder
from sklearn.multioutput import MultiOutputClassifier
from sentence_transformers import SentenceTransformer

from model import build_dl_classifier

def get_default_resource(category):
    """Generates synthetic resources for the dataset so the DL model can learn to predict them."""
    mapping = {
        'medical': 'Ambulance, First Aid Kits',
        'shelter': 'Tents, Blankets, Sleeping Bags',
        'food': 'Food Packets, Drinking Water',
        'hygiene': 'Sanitary Kits, Clean Water',
        'education': 'Books, Stationary, Whiteboards',
        'elderly support': 'Medicines, Wheelchairs, Walking Aids',
        'disaster relief': 'Rescue Boats, Ropes, Flashlights'
    }
    return mapping.get(str(category).lower(), 'General Relief Supplies')

def train_and_save_dl_model(data_path, model_save_path):
    # Inside train_and_save_dl_model in training.py
    print("1. Loading NGO dataset...")
    df = pd.read_csv(data_path)
    df = df.dropna(subset=['ngo_description', 'category', 'urgency_level'])
    
    # NEW: Artificially duplicate the rare urgency classes before training
    critical_cases = df[df['urgency_level'] == 'Critical']
    high_cases = df[df['urgency_level'] == 'High']
    
    # Add copies of the rare cases back into the main dataframe
    df = pd.concat([df, critical_cases, critical_cases, high_cases]).sample(frac=1).reset_index(drop=True)
    
    # Inject resource requirements dynamically 
    df['resource_req'] = df['category'].apply(get_default_resource)
    print(f"   Loaded {len(df)} records.")

    X_text = df['ngo_description'].tolist()

    # --- FIT & SAVE LabelEncoders for THREE output columns ---
    print("2. Encoding Multi-Output Targets...")
    
    le_cat = LabelEncoder()
    y_cat = le_cat.fit_transform(df['category'])
    joblib.dump(le_cat, 'le_cat.pkl')

    le_prio = LabelEncoder()
    y_prio = le_prio.fit_transform(df['urgency_level'])
    joblib.dump(le_prio, 'le_prio.pkl')

    le_res = LabelEncoder()
    y_res = le_res.fit_transform(df['resource_req'])
    joblib.dump(le_res, 'le_res.pkl')

    print("   ✅ Encoders saved (le_cat.pkl, le_prio.pkl, le_res.pkl)")

    # Stack into a 3-column target matrix [n_samples, 3]
    y = np.column_stack([y_cat, y_prio, y_res])

    print("3. Loading NLP Brain (SentenceTransformer)...")
    encoder = SentenceTransformer('all-MiniLM-L6-v2')

    print("4. Converting texts into embeddings (this takes a moment)...")
    X_embeddings = encoder.encode(X_text, show_progress_bar=True)

    X_train, X_test, y_train, y_test = train_test_split(
        X_embeddings, y, test_size=0.2, random_state=42
    )

    print("5. Training the 3-Headed Neural Network...")
    nn_classifier = MultiOutputClassifier(build_dl_classifier())
    nn_classifier.fit(X_train, y_train)

  # --- NEW ADDITION: ACCURACY EVALUATION ---
    print("\n=== MODEL ACCURACY EVALUATION ===")
    
    # Generate predictions for both sets
    y_train_pred = nn_classifier.predict(X_train)
    y_test_pred = nn_classifier.predict(X_test)
    
    # Overall exact match accuracy using Numpy (All 3 predictions correct simultaneously)
    train_exact = np.mean(np.all(y_train == y_train_pred, axis=1))
    test_exact = np.mean(np.all(y_test == y_test_pred, axis=1))
    
    print(f"Overall Exact Match - Training: {train_exact:.4f} | Validation: {test_exact:.4f}")
    
    # Individual Head Accuracies (accuracy_score works fine on 1D slices)
    heads = ['Category', 'Urgency', 'Resources']
    for i, head in enumerate(heads):
        train_acc = accuracy_score(y_train[:, i], y_train_pred[:, i])
        test_acc = accuracy_score(y_test[:, i], y_test_pred[:, i])
        print(f"-> {head:10} Head - Training: {train_acc:.4f} | Validation: {test_acc:.4f}")

    print(f"\n6. Saving trained model to {model_save_path}...")
    joblib.dump(nn_classifier, model_save_path)
    print("✅ DL Training complete.")
if __name__ == "__main__":
    train_and_save_dl_model('ngo_dataset_15000.csv', 'new_model.pkl')