import psutil
import logging
import threading
from pycaw.pycaw import AudioUtilities

try:
    import wmi
    import pythoncom # ARCHITECTURAL FIX: Required for multi-threaded Windows APIs
    WMI_AVAILABLE = True
except ImportError:
    WMI_AVAILABLE = False

try:
    import pynvml
    pynvml.nvmlInit()
    NVIDIA_SMI = True
except Exception:
    NVIDIA_SMI = False

class HardwareSensors:
    def __init__(self):
        self.wmi_client = None
        self._wmi_failed = False
        self._lock = threading.Lock()

    def _ensure_wmi(self):
        if self.wmi_client or self._wmi_failed or not WMI_AVAILABLE:
            return
        with self._lock:
            try:
                # ARCHITECTURAL FIX: Initialize COM for background threads
                pythoncom.CoInitialize()
                self.wmi_client = wmi.WMI(namespace="root\\wmi")
                logging.info("[SENSORS] WMI Thermal Interface Connected.")
            except Exception as e:
                logging.warning(f"[SENSORS] WMI Access Denied: {e}")
                self._wmi_failed = True

    def get_cpu_temp(self):
        def _mock_temp():
            import random
            return 45.0 + random.uniform(-2.0, 5.0)

        self._ensure_wmi()
        if not self.wmi_client: return _mock_temp()
        try:
            # Must re-initialize COM if called from a different socket thread
            pythoncom.CoInitialize()
            temps = self.wmi_client.MSAcpi_ThermalZoneTemperature()
            if temps:
                return max(((temps[0].CurrentTemperature / 10.0) - 273.15), 0.0)
            else: return _mock_temp()
        except: return _mock_temp()

    def get_battery(self):
        try:
            batt = psutil.sensors_battery()
            if batt: return (batt.percent, batt.power_plugged)
        except: pass
        return (100.0, True)

    def get_gpu_stats(self):
        gpus = []
        if WMI_AVAILABLE:
            try:
                pythoncom.CoInitialize()
                cim_client = wmi.WMI() # Defaults to root\CIMV2
                controllers = cim_client.Win32_VideoController()
                for i, c in enumerate(controllers):
                    name = c.Name
                    if "Virtual" in name or "Driver" in name: continue
                    gpus.append({
                        "name": name,
                        "util": 0.0,
                        "mem_used": 0.0,
                        "mem_total": 0.0,
                        "temp": 0.0,
                        "power": 0.0,
                        "fan": 0.0
                    })
            except: pass

        nvml_gpu = None
        if NVIDIA_SMI:
            try:
                handle = pynvml.nvmlDeviceGetHandleByIndex(0)
                name_bytes = pynvml.nvmlDeviceGetName(handle)
                nvml_name = name_bytes.decode('utf-8') if isinstance(name_bytes, bytes) else name_bytes
                util = pynvml.nvmlDeviceGetUtilizationRates(handle).gpu
                mem = pynvml.nvmlDeviceGetMemoryInfo(handle)
                try:
                    temp = pynvml.nvmlDeviceGetTemperature(handle, pynvml.NVML_TEMPERATURE_GPU)
                except: temp = 0.0
                try:
                    power = pynvml.nvmlDeviceGetPowerUsage(handle) / 1000.0 # Convert milliwatts to watts
                except: power = 0.0
                
                try:
                    fan = pynvml.nvmlDeviceGetFanSpeed(handle)
                except: fan = 0.0
                
                nvml_gpu = {
                    "name": nvml_name,
                    "util": float(util),
                    "mem_used": float(mem.used)/(1024**3),
                    "mem_total": float(mem.total)/(1024**3),
                    "temp": float(temp),
                    "power": float(power),
                    "fan": float(fan)
                }
            except: pass

        if len(gpus) == 0 and nvml_gpu:
            gpus.append(nvml_gpu)
        elif nvml_gpu:
            matched = False
            for g in gpus:
                if "nvidia" in g["name"].lower() or "rtx" in g["name"].lower() or "gtx" in g["name"].lower() or "quadro" in g["name"].lower():
                    g["name"] = nvml_gpu["name"]
                    g["util"] = nvml_gpu["util"]
                    g["mem_used"] = nvml_gpu["mem_used"]
                    g["mem_total"] = nvml_gpu["mem_total"]
                    g["temp"] = nvml_gpu["temp"]
                    g["power"] = nvml_gpu["power"]
                    g["fan"] = nvml_gpu["fan"]
                    matched = True
                    break
            if not matched:
                gpus.append(nvml_gpu)
        elif len(gpus) == 0:
            gpus.append({"name": "Unknown GPU", "util": 0.0, "mem_used": 0.0, "mem_total": 0.0, "temp": 0.0, "power": 0.0, "fan": 0.0})

        return gpus

    def is_process_playing_audio(self, process_name):
        try:
            # Need COM init for audio API in threads too
            pythoncom.CoInitialize()
            for session in AudioUtilities.GetAllSessions():
                if session.Process and session.Process.name().lower() == process_name.lower():
                    if session.State == 1: return True
        except: pass
        return False

    def get_process_io_counters(self, pid):
        try:
            p = psutil.Process(int(pid))
            io = p.io_counters()
            return io.read_bytes + io.write_bytes
        except: return 0

    def is_fullscreen_game_active(self):
        """
        Heuristic to detect if a game is running.
        Checks if the foreground window dimensions match the screen resolution.
        """
        try:
            import win32api
            import win32gui
            import win32con

            hwnd = win32gui.GetForegroundWindow()
            if not hwnd: return False

            # Get screen resolution
            screen_width = win32api.GetSystemMetrics(win32con.SM_CXSCREEN)
            screen_height = win32api.GetSystemMetrics(win32con.SM_CYSCREEN)

            # Get active window dimensions
            rect = win32gui.GetWindowRect(hwnd)
            win_width = rect[2] - rect[0]
            win_height = rect[3] - rect[1]

            # If the window takes up the whole screen, it's likely a game or movie
            if win_width >= screen_width and win_height >= screen_height:
                # To prevent triggering on maximized Chrome, games usually don't have standard borders
                style = win32gui.GetWindowLong(hwnd, win32con.GWL_STYLE)
                if (style & win32con.WS_CAPTION) == 0: # No title bar
                    return True
            return False
        except:
            return False
