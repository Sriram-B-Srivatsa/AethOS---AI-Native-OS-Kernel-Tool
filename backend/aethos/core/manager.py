import psutil
import logging
import uuid
from enum import Enum

# --- CORE DEFINITIONS ---
class ProcessState(Enum):
    NEW = "NEW"
    READY = "READY"
    RUNNING = "RUNNING"
    WAITING = "WAITING"
    TERMINATED = "TERMINATED"

class Process:
    def __init__(self, pid, name, created_at_tick, priority=0, complexity=1):
        self.pid = str(pid) # Unify as string for consistency
        self.name = name
        self.state = ProcessState.NEW
        self.priority = priority
        self.complexity = complexity # This will map to CPU Usage %
        self.created_at = created_at_tick 
        self.completion_time = 0
        self.cpu_time_used = 0
        self.wait_time_accumulated = 0
        
    def __repr__(self):
        return f"[{self.pid}] {self.name} ({self.complexity}%)"

# --- THE MANAGER (HAL) ---
class ProcessManager:
    def __init__(self, live_mode=False):
        self.processes = {} 
        self.ready_queue = []
        self.live_mode = live_mode
        self.ignored_processes = ['System Idle Process', 'System']

    def update(self, current_tick):
        """
        The Master Sync Pulse.
        """
        if self.live_mode:
            self._sync_with_windows(current_tick)

    def _sync_with_windows(self, current_tick):
        """
        READ-ONLY PROBE.
        Polls Windows for the top CPU consumers.
        """
        try:
            # Get processes sorted by CPU usage (descending)
            # We fetch the top 10 to keep the AI focused on what matters
            for proc in sorted(psutil.process_iter(['pid', 'name', 'cpu_percent']), 
                               key=lambda x: x.info['cpu_percent'], 
                               reverse=True)[:10]:
                
                try:
                    p_info = proc.info
                    name = p_info['name']
                    pid = str(p_info['pid'])
                    cpu_usage = p_info['cpu_percent']

                    # Filter out noise
                    if name in self.ignored_processes or cpu_usage < 1.0:
                        continue

                    # 1. UPDATE EXISTING
                    if pid in self.processes:
                        # Update the 'Complexity' to match real CPU load
                        self.processes[pid].complexity = int(cpu_usage)
                        # Keep it alive
                        self.processes[pid].state = ProcessState.READY
                    
                    # 2. CREATE NEW
                    else:
                        logging.info(f"[HAL] Discovered: {name} ({cpu_usage}%)")
                        self.create_process(name, current_tick, pid=pid, complexity=int(cpu_usage))

                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    pass # Windows processes die quickly; ignore ghosts

        except Exception as e:
            logging.error(f"[HAL] Critical Failure: {e}")

    def create_process(self, name, current_tick, priority=1, complexity=1, pid=None):
        """Factory method for PCB creation."""
        # Use Real PID if provided, else Random (for testing)
        real_pid = pid if pid else str(uuid.uuid4())[:8]
        
        new_proc = Process(real_pid, name, current_tick, priority, complexity)
        
        self.processes[new_proc.pid] = new_proc
        new_proc.state = ProcessState.READY
        
        # Add to queue if not present
        if new_proc not in self.ready_queue:
            self.ready_queue.append(new_proc)
            
        return new_proc

    def kill_process(self, pid):
        # In Live Mode, we don't actually kill Windows processes yet (Safety First).
        # We just remove them from our internal tracking.
        if pid in self.processes:
            proc = self.processes[pid]
            proc.state = ProcessState.TERMINATED
            if proc in self.ready_queue:
                self.ready_queue.remove(proc)
            del self.processes[pid]

    def get_active_count(self):
        return len(self.processes)