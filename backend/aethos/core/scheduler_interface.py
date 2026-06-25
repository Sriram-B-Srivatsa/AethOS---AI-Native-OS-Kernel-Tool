"""
AethOS Prime - Scheduler Interface & State Encoding
===================================================

This module translates raw Windows OS data into a normalized tensor format for the PyTorch agent.

Key Components:
1. `ProcessState`: A dataclass tracking individual app PIDs, names, and heuristic complexity.
2. `SystemState`: Tracks global hardware load (CPU/RAM/Temp/VRAM).
3. `StateEncoder`: The bridging layer that vectorizes the OS state into a float array.
4. `SchedulerInterface`: Manages the active 'Foreground' vs 'Background' process paradigm
   and invokes the HAL (Hardware Abstraction Layer) to apply EcoQoS to background vampires.
"""
import statistics
from collections import deque
from aethos.core.manager import ProcessState

class SchedulerMetrics:
    def __init__(self):
        self.total_ticks = 0
        self.completed_processes = 0
        
        # History of finished jobs
        self.wait_times = deque(maxlen=100)
        self.turnaround_times = deque(maxlen=100)

    def record_completion(self, process):
        """Called when a process dies."""
        turnaround = process.completion_time - process.created_at
        wait = turnaround - process.cpu_time_used
        
        self.turnaround_times.append(turnaround)
        self.wait_times.append(wait)
        self.completed_processes += 1

    def get_system_state_vector(self, process_manager=None):
        """
        Returns [Avg Wait, Avg Turnaround, Throughput]
        
        ARCHITECTURAL FIX:
        If 'process_manager' is provided, we calculate LIVE wait times.
        This provides immediate feedback to the AI.
        """
        avg_wait = 0
        
        # 1. Try to get LIVE stats (Current Queue Suffering)
        if process_manager and len(process_manager.ready_queue) > 0:
            current_waits = [p.wait_time_accumulated for p in process_manager.ready_queue]
            avg_wait = statistics.mean(current_waits)
            
        # 2. Fallback to Historical stats if Queue is empty
        elif self.wait_times:
            avg_wait = statistics.mean(self.wait_times)
            
        avg_turnaround = statistics.mean(self.turnaround_times) if self.turnaround_times else 0
        
        return [avg_wait, avg_turnaround, self.completed_processes]

class BaseScheduler:
    """
    The Abstract Parent. 
    Enforces the 'Mechanism vs Policy' separation.
    """
    def __init__(self, process_manager):
        self.manager = process_manager
        self.metrics = SchedulerMetrics()
        self.current_process = None

    def tick(self, current_time):
        """
        The Master Clock Cycle.
        1. Updates metrics for waiting processes (Aging).
        2. Decide who runs (Policy).
        3. Execute the run (Mechanism).
        """
        self.metrics.total_ticks += 1
        
        # 1. AGING: Increase wait time for everyone in Ready Queue
        # This prevents 'Starvation' (simulated math)
        for proc in self.manager.ready_queue:
            proc.wait_time_accumulated = getattr(proc, 'wait_time_accumulated', 0) + 1

        # 2. DECISION: Ask the specific algorithm who runs next
        next_process = self.schedule(current_time)

        # 3. CONTEXT SWITCH
        if next_process != self.current_process:
            self.context_switch(self.current_process, next_process)
            
        # 4. EXECUTION
        if self.current_process:
            self.current_process.cpu_time_used += 1
            # Simulation: Process finishes if it exceeds its complexity
            # In real OS, the program decides when to quit. Here we simulate it.
            if self.current_process.cpu_time_used >= self.current_process.complexity:
                self.terminate_process(self.current_process, current_time)

    def context_switch(self, old_proc, new_proc):
        """
        Simulates the expensive CPU operation of saving/loading state.
        """
        if old_proc and old_proc.state != ProcessState.TERMINATED:
            old_proc.state = ProcessState.READY
            
        if new_proc:
            new_proc.state = ProcessState.RUNNING
            self.current_process = new_proc
            # print(f"[Scheduler] Context Switch: {old_proc.name if old_proc else 'None'} -> {new_proc.name}")
        else:
            self.current_process = None

    def terminate_process(self, proc, current_time):
        proc.completion_time = current_time
        proc.state = ProcessState.TERMINATED
        self.metrics.record_completion(proc)
        self.manager.kill_process(proc.pid)
        self.current_process = None

    def schedule(self, current_time):
        """
        OVERRIDE THIS.
        The 'Brain' logic goes here.
        """
        raise NotImplementedError("You must implement a specific scheduler logic!")