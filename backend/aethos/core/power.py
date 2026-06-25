import subprocess
import logging
import re

class PowerOrchestrator:
    """
    Manages Hardware Power Plans and synchronizes them with AethOS Software Modes.
    """
    def __init__(self):
        self.plans = self._get_windows_power_plans()
        self.current_mode = "performance"
        
        # We identify the GUIDs for the host's existing plans
        self.balanced_guid = self._find_guid("balanced")
        self.performance_guid = self._find_guid("acer") or self._find_guid("high performance")
        
        # Fallback if Acer/High Perf isn't found
        if not self.performance_guid:
            self.performance_guid = self.balanced_guid

    def _get_windows_power_plans(self):
        """Reads the Windows Registry/powercfg for available hardware states."""
        plans = {}
        try:
            result = subprocess.run(['powercfg', '/list'], capture_output=True, text=True, check=True)
            # Regex to extract GUID and Name from: "Power Scheme GUID: 381b... (Balanced)"
            for line in result.stdout.splitlines():
                match = re.search(r'GUID:\s+([a-f0-9\-]+)\s+\((.*?)\)', line)
                if match:
                    guid, name = match.groups()
                    plans[name.lower()] = guid
            return plans
        except Exception as e:
            logging.error(f"[POWER] Failed to read Windows power plans: {e}")
            return {}

    def _find_guid(self, target_name):
        for name, guid in self.plans.items():
            if target_name in name:
                return guid
        return None

    def set_hardware_plan(self, guid):
        """Executes the physical OS power shift."""
        if not guid: return False
        try:
            subprocess.run(['powercfg', '/setactive', guid], check=True, creationflags=subprocess.CREATE_NO_WINDOW)
            return True
        except Exception as e:
            logging.error(f"[POWER] Failed to set hardware plan: {e}")
            return False

    def apply_mode(self, mode_name, scheduler):
        """
        The Hybrid Application. Shifts Hardware AND Software overlays.
        mode_name: 'efficiency', 'balanced', 'performance', 'turbo'
        """
        mode_name = mode_name.lower()
        self.current_mode = mode_name
        
        if mode_name == "efficiency":
            self.set_hardware_plan(self.balanced_guid)
            scheduler.economy.BURN_RATES["MULTITASK"] = 10.0 # Force rapid background bankruptcy
            logging.info("[POWER] Mode: Efficiency. Hardware: Balanced. Overlay: Aggressive Throttling.")
            
        elif mode_name == "balanced":
            self.set_hardware_plan(self.balanced_guid)
            scheduler.economy.BURN_RATES["MULTITASK"] = 2.0  # Normal AI behavior
            logging.info("[POWER] Mode: Balanced. Hardware: Balanced. Overlay: Standard AI.")
            
        elif mode_name == "performance":
            self.set_hardware_plan(self.performance_guid)
            scheduler.economy.BURN_RATES["FOCUS"] = 5.0      # Protect foreground
            logging.info("[POWER] Mode: Performance. Hardware: Max TDP. Overlay: P-Core Isolation.")
            
        elif mode_name == "turbo":
            self.set_hardware_plan(self.performance_guid)
            scheduler.economy.BURN_RATES["GAMING"] = 20.0    # Ruthless background execution
            logging.info("[POWER] Mode: Turbo. Hardware: Max TDP. Overlay: Hard Suspend & GPU Vulture.")
