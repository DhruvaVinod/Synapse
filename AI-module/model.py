# model.py
from sklearn.neural_network import MLPClassifier

def build_dl_classifier():
    """
    Constructs the base Deep Neural Network (Multi-Layer Perceptron).
    This will be wrapped by MultiOutputClassifier during training.
    """
    nn_model = MLPClassifier(
        hidden_layer_sizes=(64, 32), 
        activation='relu', 
        solver='adam', 
        max_iter=200, # Increased max_iter slightly for a larger dataset of 15,000
        early_stopping=True, 
        alpha=0.8,  # Regularization to prevent overfitting
        verbose=True,
        random_state=42
    )
    return nn_model