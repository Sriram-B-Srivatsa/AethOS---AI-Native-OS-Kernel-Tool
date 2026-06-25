import unittest
from aethos.intelligence.agent import DQNAgent

class TestDQNAgent(unittest.TestCase):
    def test_agent_initialization(self):
        """Ensure the DQN agent initializes successfully"""
        agent = DQNAgent(input_dim=6, action_dim=3)
        self.assertIsNotNone(agent)

if __name__ == '__main__':
    unittest.main()
