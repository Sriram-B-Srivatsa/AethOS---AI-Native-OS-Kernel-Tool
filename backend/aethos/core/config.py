import json
import os
import logging

class ConfigManager:
    """
    Persistence Layer for User Preferences.
    Ensures AethOS remembers Safe Mode, Thresholds, and Settings across reboots.
    """
    def __init__(self, path="storage/config.json"):
        self.path = path
        # Architectural Defaults
        self.settings = {
            "safe_mode": True,
            "vhp_thresh": 15,
            "audio_guard": True
        }
        self.load()

    def load(self):
        if os.path.exists(self.path):
            try:
                with open(self.path, 'r', encoding='utf-8') as f:
                    saved = json.load(f)
                    self.settings.update(saved)
                logging.info("[CONFIG] User settings restored.")
            except Exception as e:
                logging.warning(f"[CONFIG] Corrupt config. Using defaults. ({e})")
        else:
            logging.info("[CONFIG] No config found. Using defaults.")
            os.makedirs(os.path.dirname(self.path), exist_ok=True)
            self.save()

    def save(self):
        try:
            with open(self.path, 'w', encoding='utf-8') as f:
                json.dump(self.settings, f, indent=4)
        except Exception as e:
            logging.error(f"[CONFIG] Failed to save settings: {e}")

    def get(self, key, default=None):
        return self.settings.get(key, default)

    def set(self, key, value):
        self.settings[key] = value
        self.save()
