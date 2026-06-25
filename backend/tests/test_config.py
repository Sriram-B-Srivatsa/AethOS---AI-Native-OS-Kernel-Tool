import unittest
import os
import tempfile
from aethos.core.config import ConfigManager

class TestConfigManager(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.TemporaryDirectory()
        self.config_path = os.path.join(self.test_dir.name, "config.json")
        self.config_manager = ConfigManager(self.config_path)

    def tearDown(self):
        self.test_dir.cleanup()

    def test_default_values(self):
        """Ensure defaults are initialized correctly."""
        self.assertTrue(isinstance(self.config_manager.settings, dict))
        self.assertIn('safe_mode', self.config_manager.settings)

if __name__ == '__main__':
    unittest.main()
