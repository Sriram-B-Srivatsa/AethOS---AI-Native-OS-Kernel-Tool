import psutil
import time
import logging
import os
from enum import Enum
import ctypes

class MemoryTemp(Enum):
    HOT = 1   # Active now or within the last 1 minute
    WARM = 2  # Active within the last 10 minutes
    COLD = 3  # Inactive for over 10 minutes

class MemoryGovernor:
    """
    Semantic RAM Orchestrator.
    Executes selective memory cleanup only when physical constraints demand it.
    """
    def __init__(self, pressure_threshold=85.0):
        self.pressure_threshold = pressure_threshold
        # Tracks {pid_string: timestamp_of_last_interaction}
        self.heat_map = {}

    def update_heat_map(self, active_pids):
        """Refreshes the temporal heat of specific processes."""
        now = time.time()
        for pid in active_pids:
            if pid:
                self.heat_map[str(pid)] = now

    def get_temperature(self, pid: str) -> MemoryTemp:
        """Determines the thermal state of a process's memory context."""
        last_active = self.heat_map.get(pid, 0)
        elapsed = time.time() - last_active

        if elapsed < 60:
            return MemoryTemp.HOT
        if elapsed < 600:
            return MemoryTemp.WARM
        return MemoryTemp.COLD

    def enforce_memory_economy(self, safe_mode=True):
        """
        ARCHITECTURAL GUARD: "Do nothing unless pressure exists."
        If RAM is full, selectively page-out only COLD processes.
        """
        mem = psutil.virtual_memory()

        # The Pressure Invariant
        if mem.percent < self.pressure_threshold:
            return 0

        logging.warning(f"[MEMORY] High RAM Pressure Detected ({mem.percent}%). Reclaiming COLD memory...")
        reclaimed_count = 0

        for p in psutil.process_iter(['pid', 'name']):
            try:
                pid_str = str(p.info['pid'])
                temp = self.get_temperature(pid_str)

                if temp == MemoryTemp.COLD:
                    name = p.info['name']

                    if safe_mode:
                        logging.info(f"[MEMORY-DRYRUN] Would page-out COLD process: {name}")
                        reclaimed_count += 1
                        continue

                    # Execute the OS-level memory trim for Windows
                    if os.name == 'nt':
                        handle = ctypes.windll.kernel32.OpenProcess(0x0100 | 0x0400, False, int(pid_str))
                        if handle:
                            # Passing -1 forces OS to flush working set to disk
                            ctypes.windll.psapi.EmptyWorkingSet(handle)
                            ctypes.windll.kernel32.CloseHandle(handle)
                            logging.info(f"[MEMORY] Successfully trimmed COLD process: {name}")
                            reclaimed_count += 1

            except Exception:
                # Silently ignore protected processes (AccessDenied)
                continue

        return reclaimed_count
