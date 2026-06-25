import psutil
import logging
import os
import time
import ctypes
from ctypes import wintypes

try:
    import win32gui
    import win32process
    WIN32_AVAILABLE = True
except ImportError:
    WIN32_AVAILABLE = False

from aethos.core.sensors import HardwareSensors
from aethos.core.gpu_actuator import GPUActuator
from aethos.intelligence.context import UserIntent

class PROCESS_POWER_THROTTLING_STATE(ctypes.Structure):
    _fields_ = [("Version", wintypes.ULONG), ("ControlMask", wintypes.ULONG), ("StateMask", wintypes.ULONG)]

PROCESS_POWER_THROTTLING_CURRENT_VERSION = 1
PROCESS_POWER_THROTTLING_EXECUTION_SPEED = 0x1
PROCESS_SET_INFORMATION = 0x0200

class WindowsActuator:
    def __init__(self, safe_mode=True, config=None):
        self.config = config
        self.safe_mode = safe_mode
        self.sensors = HardwareSensors()
        self.frozen_pids = set()
        self.cooldowns = {}
        self.COOLDOWN_SECONDS = 15

        self.gpu_actuator = GPUActuator(safe_mode=safe_mode)

        cpu_count = psutil.cpu_count(logical=True) or 4
        self.total_cores = list(range(cpu_count))

        eco_count = max(1, cpu_count // 4)
        self.eco_cores = self.total_cores[-eco_count:]
        self.p_cores = self.total_cores[:-eco_count]

        try: self.current_user = os.getlogin().lower()
        except: self.current_user = os.environ.get('USERNAME', '').lower()

        self.critical_services = [
            "system", "registry", "smss.exe", "csrss.exe", "wininit.exe",
            "services.exe", "lsass.exe", "svchost.exe", "fontdrvhost.exe",
            "memory compression", "msmpeng.exe", "python.exe", "explorer.exe",
            "taskmgr.exe", "dwm.exe", "loginui.exe", "cmd.exe", "conhost.exe",
            "wsl.exe", "wslservice.exe", "virtualboxvm.exe", "vboxsvc.exe",
            "vmware-vmx.exe", "docker.exe", "com.docker.backend.exe", "searchindexer.exe"
        ]
        
        if self.config:
            custom = self.config.get("custom_whitelist", [])
            self.critical_services.extend(custom)

    def _set_eco_qos(self, pid, enable=True):
        if os.name != 'nt': return False
        try:
            handle = ctypes.windll.kernel32.OpenProcess(PROCESS_SET_INFORMATION, False, int(pid))
            if not handle: return False
            state = PROCESS_POWER_THROTTLING_STATE()
            state.Version = PROCESS_POWER_THROTTLING_CURRENT_VERSION
            state.ControlMask = PROCESS_POWER_THROTTLING_EXECUTION_SPEED
            state.StateMask = PROCESS_POWER_THROTTLING_EXECUTION_SPEED if enable else 0
            result = ctypes.windll.kernel32.SetProcessInformation(handle, 4, ctypes.byref(state), ctypes.sizeof(state))
            ctypes.windll.kernel32.CloseHandle(handle)
            return bool(result)
        except: return False

    def _get_foreground_pid(self):
        if not WIN32_AVAILABLE: return None
        try:
            hwnd = win32gui.GetForegroundWindow()
            if hwnd:
                _, pid = win32process.GetWindowThreadProcessId(hwnd)
                return str(pid)
        except: return None

    def _is_safe_to_touch(self, process):
        try:
            if process.name().lower() in self.critical_services: return False
            owner = process.username().lower()
            if '\\' in owner: owner = owner.split('\\')[-1]
            return owner == self.current_user
        except: return False

    # --- RESTORED MISSING METHOD ---
    def _is_on_cooldown(self, pid):
        last_time = self.cooldowns.get(str(pid), 0)
        return (time.time() - last_time) < self.COOLDOWN_SECONDS

    def toggle_suspend(self, pid, should_suspend, intent=None):
        try:
            p = psutil.Process(int(pid))
            name = p.name()

            if not self._is_safe_to_touch(p): return False
            if self._is_on_cooldown(pid): return False

            if should_suspend:
                audio_guard = self.config.get("audio_guard", True) if self.config else True
                if audio_guard and self.sensors.is_process_playing_audio(name): return False

                io_guard = self.config.get("io_guard", True) if self.config else True
                if io_guard:
                    io_before = self.sensors.get_process_io_counters(pid)
                    if io_before is not None:
                        time.sleep(0.1) # Removed redundant 'import time' here
                        io_after = self.sensors.get_process_io_counters(pid)
                        if io_after is not None and ((io_after - io_before) * 10) > 500_000:
                            return False

                if not self.safe_mode:
                    p.cpu_affinity(self.eco_cores)
                    p.nice(psutil.IDLE_PRIORITY_CLASS)
                    self._set_eco_qos(pid, enable=True)
                    self.frozen_pids.add(pid)
                    self.cooldowns[str(pid)] = time.time()

                    if intent and intent.name == "GAMING":
                        self.gpu_actuator.throttle_gpu_memory(pid, name)
                        logging.info(f"[ACTUATOR] Deep EcoQoS & VRAM Throttle applied to {name}")
                    else:
                        logging.info(f"[ACTUATOR] EcoQoS CPU Throttle applied to {name}")
                return True
            else:
                if not self.safe_mode:
                    self._set_eco_qos(pid, enable=False)
                    p.cpu_affinity(self.total_cores)
                    p.nice(psutil.NORMAL_PRIORITY_CLASS)
                    if pid in self.frozen_pids: self.frozen_pids.remove(pid)
                    self.cooldowns[str(pid)] = time.time()

                    self.gpu_actuator.restore_gpu_memory(pid, name)
                    logging.info(f"[ACTUATOR] Full Power restored to {name}")
                return True
        except: return False

    def enforce_priority(self, pid, priority_score):
        try:
            p = psutil.Process(int(pid))
            if not self._is_safe_to_touch(p): return False
            if self._is_on_cooldown(pid): return False # Replaced manual math with method call

            if not self.safe_mode:
                if priority_score >= 8:
                    p.nice(psutil.HIGH_PRIORITY_CLASS)
                    if str(pid) == self._get_foreground_pid():
                        p.cpu_affinity(self.p_cores)
                        logging.info(f"[ACTUATOR] P-Core Isolation & Boost applied to {p.name()}")
                    else:
                        logging.info(f"[ACTUATOR] Priority Boosted for {p.name()}")
                elif priority_score <= 3:
                    p.nice(psutil.BELOW_NORMAL_PRIORITY_CLASS)
                self.cooldowns[str(pid)] = time.time()
            return True
        except: return False

    def _global_thaw(self):
        logging.info("[ACTUATOR] Running Pre-Emptive Global Thaw...")
        restored = 0
        for p in psutil.process_iter(['pid', 'name']):
            try:
                if p.info['name'].lower() in self.critical_services: continue
                if p.nice() == psutil.IDLE_PRIORITY_CLASS:
                    p.cpu_affinity(self.total_cores)
                    p.nice(psutil.NORMAL_PRIORITY_CLASS)
                    self._set_eco_qos(p.info['pid'], enable=False)
                    restored += 1
                    time.sleep(0.02) # ARCHITECTURAL FIX: 20ms Stagger to prevent boot lag
            except: pass
        if restored > 0: 
            logging.info(f"[ACTUATOR] Rescued {restored} ghost-throttled processes.")

    def emergency_restore(self):
        logging.info(f"[PANIC] Restoring {len(self.frozen_pids)} processes. Staggering to prevent OS lockup...")
        for pid in list(self.frozen_pids):
            try:
                p = psutil.Process(int(pid))
                p.cpu_affinity(self.total_cores)
                p.nice(psutil.NORMAL_PRIORITY_CLASS)
                self._set_eco_qos(int(pid), enable=False)
                
                # ARCHITECTURAL FIX: The Thaw Buffer
                # Yields 50ms to the OS scheduler so it can smoothly wake up the app 
                # before we wake up the next one.
                time.sleep(0.05) 
            except: pass
            
        self.frozen_pids.clear()
        
        # Restore GPU
        if hasattr(self, 'gpu_actuator'):
            self.gpu_actuator.emergency_restore()
        logging.info("[PANIC] Global Thaw Executed Safely.")
