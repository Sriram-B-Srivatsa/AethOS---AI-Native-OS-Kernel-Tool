import unittest
from unittest.mock import MagicMock
from aethos.core.scheduler_interface import BaseScheduler

class TestSchedulerInterface(unittest.TestCase):
    def test_scheduler_initialization(self):
        """Test if the BaseScheduler initializes correctly"""
        mock_pm = MagicMock()
        scheduler = BaseScheduler(process_manager=mock_pm)
        self.assertIsNotNone(scheduler)

if __name__ == '__main__':
    unittest.main()
