import torch
import torch.nn as nn
import torch.nn.functional as F

# --- Hard Mode: Building the Brain from Scratch ---
# Comparative Insight:
# Tutorial Mode would be: from some_library import PrebuiltDQN. This hides the
# internal mechanics of layers, weights, and activation functions. By writing
# our own nn.Module, we control every neuron and every mathematical operation,
# transforming the "black box" of AI into a "glass box." We are building the
# engine, not just driving the car.

class DQN(nn.Module):
    """
    A simple Feed-Forward Neural Network that serves as the Q-value function
    approximator. This is the 'policy network' that learns to map states to
    the expected returns of actions.
    """

    def __init__(self, input_size: int, action_size: int, hidden_size: int = 64):
        """
        Defines the layers of the neural network.

        Args:
            input_size (int): The dimensionality of the state vector (17).
            action_size (int): The number of possible discrete actions (e.g., 6).
            hidden_size (int): The number of neurons in the hidden layer.
        """
        super(DQN, self).__init__()

        # Layer 1: The input layer. It maps the state vector to the first hidden representation.
        self.layer1 = nn.Linear(input_size, hidden_size)
        
        # Layer 2: A hidden layer that provides the network with more capacity to learn complex patterns.
        self.layer2 = nn.Linear(hidden_size, hidden_size)
        
        # Layer 3: The output layer. It produces a scalar Q-value for each possible action.
        self.layer3 = nn.Linear(hidden_size, action_size)

    def forward(self, state_tensor: torch.Tensor) -> torch.Tensor:
        """
        Performs the forward pass of the network. This is where the state is processed
        through the layers to produce Q-values.

        Args:
            state_tensor (torch.Tensor): The input state from the StateEncoder.

        Returns:
            torch.Tensor: A tensor of Q-values, one for each possible action.
        """
        # The ReLU (Rectified Linear Unit) activation function is applied after each hidden layer.
        # Its definition, f(x) = max(0, x), introduces non-linearity. Without this,
        # stacking linear layers would be equivalent to a single linear layer,
        # severely limiting the model's representational power.
        x = F.relu(self.layer1(state_tensor))
        x = F.relu(self.layer2(x))
        
        # The final layer is linear (no activation function). This is crucial because
        # Q-values are not probabilities; they represent expected future rewards, which
        # can be positive, negative, or zero.
        return self.layer3(x)