import time
import threading
import statistics
import ctypes

class LatencyGuardian:
    """
    The Perceived Performance Engine.
    Measures true OS stutter by detecting thread-wakeup latency.
    """
    def __init__(self):
        self.frame_times =[]
        self.stutter_count = 0
        self.target_frame_time = 0.0166  # ~16.6ms (60 FPS)
        self.is_running = True

        # Request 1ms timer resolution from Windows for accuracy
        try:
            ctypes.windll.winmm.timeBeginPeriod(1)
        except: pass

        # Run isolated from the main kernel
        self.monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.monitor_thread.start()

    def _monitor_loop(self):
        """
        Attempts to sleep for exactly 1 frame.
        If the OS is lagging, the sleep will take much longer.
        """
        while self.is_running:
            t0 = time.perf_counter()
            time.sleep(self.target_frame_time)
            t1 = time.perf_counter()

            delta = (t1 - t0)

            # If the OS took > 24ms to wake us up, that is a physical stutter
            if delta > 0.024:
                self.stutter_count += 1

            self.frame_times.append(delta)
            if len(self.frame_times) > 60: # Keep last 1 second of data
                self.frame_times.pop(0)

    def get_metrics(self):
        """Returns the stability of the OS over the last second."""
        stutters = self.stutter_count
        self.stutter_count = 0 # Reset counter after reading

        if not self.frame_times:
            return {"stutters": 0, "stability": 1.0}

        # Calculate variance (jitter)
        avg_time = statistics.mean(self.frame_times)
        stability = self.target_frame_time / avg_time if avg_time > 0 else 1.0

        return {"stutters": stutters, "stability": min(stability, 1.0)}

    def stop(self):
        self.is_running = False
        try: ctypes.windll.winmm.timeEndPeriod(1)
        except: pass
