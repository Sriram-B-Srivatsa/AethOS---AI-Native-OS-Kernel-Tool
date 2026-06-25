import torch
import numpy as np
from collections import deque
from aethos.core.sensors import HardwareSensors

class StateEncoder:
    """
    The 'Temporal Retina' of the AI.
    Converts complex OS objects and Hardware Telemetry into a fixed-size Tensor.
    Now includes Thermal and Power awareness.
    """
    def __init__(self, max_queue_size=5, stack_depth=4):
        # Configuration
        self.max_queue_size = max_queue_size
        self.stack_depth = stack_depth

        # Initialize the Nervous System (Sensors)
        self.sensors = HardwareSensors()

        # FEATURE DIMENSIONS (Per Frame):
        # Global Features:
        # 1. Avg Wait Time (Suffering)
        # 2. Queue Length (Load)
        # 3. Battery Percent (Energy)
        # 4. Power Plugged (Context)
        # 5. CPU Temperature (Thermal Constraints) -> NEW
        # Total Global = 5

        # Per Process Features: 3 (Priority, Complexity, Current Wait)
        self.single_frame_size = 5 + (max_queue_size * 3)

        # TOTAL INPUT SIZE:
        # Flattened history stack (Frame T, T-1, T-2, T-3)
        self.input_size = self.single_frame_size * stack_depth

        # The Memory Buffer (Rolling Window)
        self.history_buffer = deque(maxlen=stack_depth)

    def reset(self):
        """Clears history. Call this on system boot."""
        self.history_buffer.clear()

    def get_state_vector(self, manager, metrics):
        """
        Input: ProcessManager, SchedulerMetrics
        Output: PyTorch Tensor (Shape: [1, input_size])
        """
        # --- 1. CAPTURE GLOBAL FEATURES ---

        # Metric: System Lag
        avg_wait = min(metrics.get_system_state_vector()[0] / 50.0, 1.0)

        # Metric: Load
        queue_len = min(len(manager.ready_queue) / 20.0, 1.0)

        # Sensor: Power
        batt_pct, is_plugged = self.sensors.get_battery()
        batt_norm = batt_pct / 100.0
        plug_norm = 1.0 if is_plugged else 0.0

        # Sensor: Heat
        temp_c = self.sensors.get_cpu_temp()
        # Normalize Temp: 0C to 100C -> 0.0 to 1.0
        # If temp is 0.0 (VM/Sensor failure), AI sees 0.0 (Cool)
        temp_norm = min(temp_c / 100.0, 1.0)

        global_features = [avg_wait, queue_len, batt_norm, plug_norm, temp_norm]

        # --- 2. CAPTURE LOCAL FEATURES (Per Process) ---
        process_features = []
        for i in range(self.max_queue_size):
            if i < len(manager.ready_queue):
                proc = manager.ready_queue[i]
                p_prio = proc.priority / 10.0
                p_cplx = min(proc.complexity / 20.0, 1.0)
                p_wait = min(proc.wait_time_accumulated / 50.0, 1.0)
                process_features.extend([p_prio, p_cplx, p_wait])
            else:
                # Padding for empty slots
                process_features.extend([0.0, 0.0, 0.0])

        # --- 3. HISTORY STACKING ---
        full_frame = global_features + process_features

        # Cold Start Handling: If buffer empty, fill with current frame
        if len(self.history_buffer) == 0:
            for _ in range(self.stack_depth):
                self.history_buffer.append(full_frame)
        else:
            self.history_buffer.append(full_frame)

        # Flatten
        flattened_history = []
        for frame in self.history_buffer:
            flattened_history.extend(frame)

        return torch.tensor([flattened_history], dtype=torch.float32)

    def debug_print(self, tensor):
        """Helper to interpret the Multi-Frame Vision."""
        # We grab the first frame from the stack to show current state
        data = tensor.numpy()[0]

        # Mapping indices based on new feature count (5 Global)
        # [0]Wait, [1]Queue, [2]Batt, [3]Plug, [4]Temp
        print(f"[Vision] Wait:{data[0]:.2f} Q:{data[1]:.2f} Batt:{data[2]:.2f} Plug:{data[3]:.1f} Temp:{data[4]:.2f}")
