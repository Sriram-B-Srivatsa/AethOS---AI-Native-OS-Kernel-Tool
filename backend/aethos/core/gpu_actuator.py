import logging
import ctypes
from ctypes import wintypes
import os

# --- Windows Native API Constants for Memory/IO Priority ---
PROCESS_SET_INFORMATION = 0x0200
# ProcessMemoryPriority is class 39
# ProcessIoPriority is class 33

class MEMORY_PRIORITY_INFORMATION(ctypes.Structure):
    _fields_ =[("MemoryPriority", wintypes.ULONG)]

class IO_PRIORITY_HINT(ctypes.Structure):
    _fields_ =[("IoPriority", wintypes.ULONG)]

class GPUActuator:
    """
    The Graphics Pipeline Governor.
    Forces background apps to yield VRAM and Disk I/O to the foreground game.
    """
    def __init__(self, safe_mode=True):
        self.safe_mode = safe_mode
        self.throttled_pids = set()

        # 1 = Very Low, 2 = Low, 3 = Medium, 4 = Below Normal, 5 = Normal
        self.MEMORY_PRIORITY_LOWEST = 1
        self.MEMORY_PRIORITY_NORMAL = 5

        # 0 = Very Low, 1 = Low, 2 = Normal
        self.IO_PRIORITY_VERY_LOW = 0
        self.IO_PRIORITY_NORMAL = 2

    def _set_memory_priority(self, pid, priority_level):
        """Forces Windows to evict this process's memory/VRAM first if space is needed."""
        if os.name != 'nt': return False
        try:
            handle = ctypes.windll.kernel32.OpenProcess(PROCESS_SET_INFORMATION, False, int(pid))
            if not handle: return False

            mem_info = MEMORY_PRIORITY_INFORMATION()
            mem_info.MemoryPriority = priority_level

            result = ctypes.windll.kernel32.SetProcessInformation(
                handle, 39, ctypes.byref(mem_info), ctypes.sizeof(mem_info)
            )
            ctypes.windll.kernel32.CloseHandle(handle)
            return bool(result)
        except: return False

    def _set_io_priority(self, pid, priority_level):
        """Stops background apps from stalling the SSD while a game is loading levels."""
        if os.name != 'nt': return False
        try:
            handle = ctypes.windll.kernel32.OpenProcess(PROCESS_SET_INFORMATION, False, int(pid))
            if not handle: return False

            io_info = IO_PRIORITY_HINT()
            io_info.IoPriority = priority_level

            result = ctypes.windll.kernel32.SetProcessInformation(
                handle, 33, ctypes.byref(io_info), ctypes.sizeof(io_info)
            )
            ctypes.windll.kernel32.CloseHandle(handle)
            return bool(result)
        except: return False

    def throttle_gpu_memory(self, pid, process_name):
        """The GPU Vulture Protocol."""
        try:
            if self.safe_mode:
                logging.info(f"[GPU-VULTURE-DRYRUN] Would throttle VRAM/IO for {process_name}")
                return True

            mem_success = self._set_memory_priority(pid, self.MEMORY_PRIORITY_LOWEST)
            io_success = self._set_io_priority(pid, self.IO_PRIORITY_VERY_LOW)

            if mem_success or io_success:
                self.throttled_pids.add(pid)
                logging.info(f"[GPU-VULTURE] VRAM/IO Priority dropped for {process_name}")
                return True
            return False
        except Exception as e:
            return False

    def restore_gpu_memory(self, pid, process_name):
        """Restores normal operating parameters."""
        try:
            if self.safe_mode:
                logging.info(f"[GPU-VULTURE-DRYRUN] Would restore VRAM/IO for {process_name}")
                return True

            self._set_memory_priority(pid, self.MEMORY_PRIORITY_NORMAL)
            self._set_io_priority(pid, self.IO_PRIORITY_NORMAL)

            if pid in self.throttled_pids:
                self.throttled_pids.remove(pid)
                logging.info(f"[GPU-VULTURE] Full VRAM/IO access restored for {process_name}")
            return True
        except Exception:
            return False

    def emergency_restore(self):
        """Global Thaw hook."""
        for pid in list(self.throttled_pids):
            try:
                self._set_memory_priority(pid, self.MEMORY_PRIORITY_NORMAL)
                self._set_io_priority(pid, self.IO_PRIORITY_NORMAL)
            except: pass
        self.throttled_pids.clear()
