"""
AethOS Prime - Deep Q-Learning Agent
====================================

This module defines the Reinforcement Learning (RL) brain of AethOS. 
It utilizes a deep neural network (PyTorch) to map System States (CPU, Temp, App Complexity)
to Actions (Throttle, Boost, Ignore). 

Features:
- Experience Replay: Stores past states in a deque to train the model in randomized batches.
- Epsilon-Greedy Exploration: Begins by randomly throttling apps (high epsilon) to learn their 
  impact on system latency. Over time, it relies entirely on the trained model.
- Model Persistence: Automatically saves `brain.pth` to the `storage/` directory so it learns
  across reboots.
"""
import torch
import torch.optim as optim
import torch.nn.functional as F
import random
import numpy as np
from collections import deque, namedtuple
import os
import torch.optim as optim

from aethos.intelligence.brain import DQN
from aethos.intelligence.vision import StateEncoder

# Define a named tuple for cleaner memory storage
Transition = namedtuple('Transition', ('state', 'action', 'next_state', 'reward'))

class ReplayBuffer:
    """
    The Hippocampus (Long-Term Memory).
    Stores past experiences so the AI can learn from them repeatedly.
    """
    def __init__(self, capacity=10000):
        self.memory = deque(maxlen=capacity)

    def push(self, *args):
        """Save a transition."""
        self.memory.append(Transition(*args))

    def sample(self, batch_size):
        """Retrieve a random batch of memories."""
        return random.sample(self.memory, batch_size)

    def __len__(self):
        return len(self.memory)

class DQNAgent:
    """
    The Orchestrator.
    Manages the Policy Network, Action Selection, and the Learning Step.
    """
    def __init__(self, input_dim, action_dim, learning_rate=1e-3, gamma=0.99, epsilon_start=1.0, config=None):
        self.config = config
        # 1. Hyperparameters
        self.gamma = gamma          # Discount Factor (How much we care about the future)
        self.epsilon = epsilon_start # Exploration Rate (1.0 = 100% Random)
        self.epsilon_min = self.config.get("exploration_floor", 0.05) if self.config else 0.05
        self.epsilon_decay = 0.995
        self.batch_size = 64

        # 2. Components
        self.device = torch.device("cpu") # Hard Mode: Explicit device control

        # The Policy Network (The Brain)
        self.policy_net = DQN(input_dim, action_dim).to(self.device)

        # The Target Network (The Stable Reference)
        # In Deep Q-Learning, we use a second network that doesn't change often
        # to calculate the "Target" value. This stabilizes training.
        self.target_net = DQN(input_dim, action_dim).to(self.device)
        self.target_net.load_state_dict(self.policy_net.state_dict()) # Clone weights
        self.target_net.eval() # Set to evaluation mode

        # The Optimizer (The Teacher)
        # Adam is the standard optimizer for RL
        self.optimizer = optim.Adam(self.policy_net.parameters(), lr=learning_rate)

        # Memory
        self.memory = ReplayBuffer(capacity=10000)

        self.model_path = os.path.join("storage", "brain.pth")
        self.load_brain() # Try to load on init

    def save_brain(self):
        """Saves the Neural Weights to disk."""
        try:
            torch.save({
                'policy_net': self.policy_net.state_dict(),
                'target_net': self.target_net.state_dict(),
                'optimizer': self.optimizer.state_dict(),
                'epsilon': self.epsilon
            }, self.model_path)
            print(f"[AI] Brain saved to {self.model_path}")
        except Exception as e:
            print(f"[AI ERROR] Failed to save brain: {e}")

    def load_brain(self):
        """Loads weights if they exist."""
        if os.path.exists(self.model_path):
            try:
                checkpoint = torch.load(self.model_path, weights_only=True)
                self.policy_net.load_state_dict(checkpoint['policy_net'])
                self.target_net.load_state_dict(checkpoint['target_net'])
                self.optimizer.load_state_dict(checkpoint['optimizer'])
                self.epsilon = checkpoint['epsilon']
                print(f"[AI] Brain restored! (Epsilon: {self.epsilon:.2f})")
            except Exception as e:
                print(f"[AI WARNING] Corrupt brain file, starting fresh. {e}")
        else:
            print("[AI] No previous brain found. Starting from scratch.")

    def select_action(self, state_tensor):
        """
        Epsilon-Greedy Strategy:
        Sometimes explore (random action), sometimes exploit (best known action).
        """
        # Exploration: Random Action
        if random.random() < self.epsilon:
            # We assume action_dim is passed in __init__.
            # We need to access the output layer size.
            return random.randrange(self.policy_net.layer3.out_features)

        # Exploitation: Best Action according to Neural Network
        with torch.no_grad():
            # t.max(1) returns largest column value of each row.
            # second column on max result is index of where max element was found
            return self.policy_net(state_tensor).max(1)[1].item()

    def optimize_model(self):
        """
        The Learning Step (Backpropagation).
        This implements the Bellman Equation Loss.
        """
        if len(self.memory) < self.batch_size:
            return 0.0 # Not enough memory to learn yet

        # 1. Sample a batch of transitions
        transitions = self.memory.sample(self.batch_size)
        # Transpose the batch (convert list of Transitions to Transition of lists)
        batch = Transition(*zip(*transitions))

        # 2. Prepare Tensors
        # We filter out final states (where next_state is None, if any)
        non_final_mask = torch.tensor(tuple(map(lambda s: s is not None, batch.next_state)), dtype=torch.bool)
        non_final_next_states = torch.cat([s for s in batch.next_state if s is not None])

        state_batch = torch.cat(batch.state)
        action_batch = torch.cat(batch.action)
        reward_batch = torch.cat(batch.reward)

        # 3. Compute Q(s, a) - The Agent's Prediction
        # The model computes Q(s) for all actions.
        # .gather(1, action_batch) selects only the Q-value of the action we actually took.
        state_action_values = self.policy_net(state_batch).gather(1, action_batch)

        # 4. Compute V(s') - The Target Value
        # expected_state_action_values = reward + (gamma * max(Q(s')))
        next_state_values = torch.zeros(self.batch_size)

        # Use Target Network for stability
        with torch.no_grad():
            next_state_values[non_final_mask] = self.target_net(non_final_next_states).max(1)[0]

        expected_state_action_values = (next_state_values * self.gamma) + reward_batch

        # 5. Compute Huber Loss (Smooth L1)
        # We compare Prediction vs Target
        loss = F.smooth_l1_loss(state_action_values, expected_state_action_values.unsqueeze(1))

        # 6. Optimize the Model
        self.optimizer.zero_grad() # Clear old gradients
        loss.backward()            # Calculate new gradients

        # Gradient Clipping (Safety Mechanism):
        # Prevents "Exploding Gradients" which destroy the brain.
        torch.nn.utils.clip_grad_value_(self.policy_net.parameters(), 100)

        self.optimizer.step()      # Update weights

        return loss.item()

    def update_target_network(self):
        """Syncs the Target Network with the Policy Network."""
        self.target_net.load_state_dict(self.policy_net.state_dict())

    def decay_epsilon(self):
        """Reduces randomness over time."""
        self.epsilon = max(self.epsilon_min, self.epsilon * self.epsilon_decay)
