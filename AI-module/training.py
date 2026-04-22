# training.py
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from sentence_transformers import SentenceTransformer
import joblib

from model import build_dl_classifier

def train_and_save_dl_model(data_path, model_save_path):
    print("1. Loading dataset...")
    df = pd.read_csv(data_path)
    df = df.dropna(subset=['complaints', 'category'])

    X_text = df['complaints'].tolist()
    y = df['category'].tolist()

    print("2. Downloading/Loading Deep Learning Brain (SentenceTransformer)...")
    # This downloads a ~80MB model the first time you run it. 
    # It runs beautifully on standard CPUs.
    encoder = SentenceTransformer('all-MiniLM-L6-v2')

    print("3. Converting text to Deep Learning Embeddings (This takes a few seconds)...")
    # This is where the magic happens. We translate English into mathematical meaning.
    X_embeddings = encoder.encode(X_text, show_progress_bar=True)

    # 80/20 train-test split
    X_train, X_test, y_train, y_test = train_test_split(X_embeddings, y, test_size=0.2, random_state=42)

    print("4. Training the Deep Neural Network...")
    nn_classifier = build_dl_classifier()
    nn_classifier.fit(X_train, y_train)

    print("\n=== DEEP LEARNING MODEL EVALUATION ===")
    y_pred = nn_classifier.predict(X_test)
    print(classification_report(y_test, y_pred))

    print(f"\n5. Saving trained Neural Network to {model_save_path}...")
    # We only save the NN. The SentenceTransformer loads automatically in prediction.py.
    joblib.dump(nn_classifier, model_save_path)
    print("✅ DL Training complete.")

if __name__ == "__main__":
    train_and_save_dl_model('civic_issues_training_data.csv', 'civic_nn_model.pkl')