# model.py
from sklearn.neural_network import MLPClassifier

def build_dl_classifier():
    """
    Constructs a Deep Neural Network (Multi-Layer Perceptron).
    """
    nn_model = MLPClassifier(
        hidden_layer_sizes=(128, 64), 
        activation='relu', 
        solver='adam', 
        max_iter=1000,
        
        # THE FIX: Turn this off so Scikit-Learn stops trying to do math on the word "Sanitation"
        early_stopping=False, 
        
        # THE REPLACEMENT: We use "alpha" (Regularization) to safely prevent overfitting instead
        alpha=0.05, 
        
        random_state=42
    )
    return nn_model