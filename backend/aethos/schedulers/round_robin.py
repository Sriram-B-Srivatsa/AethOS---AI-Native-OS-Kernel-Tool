from aethos.core.scheduler_interface import BaseScheduler
from collections import deque

class RoundRobinScheduler(BaseScheduler):
    """
    Round Robin (Preemptive).
    The 'Communist' Scheduler: Everyone gets equal time, regardless of rank.
    """
    def __init__(self, process_manager, time_quantum=2):
        super().__init__(process_manager)
        self.time_quantum = time_quantum
        self.current_proc_time_slice = 0  # Track how long current proc has run

    def schedule(self, current_time):
        # 1. Check if we currently have a process running
        if self.current_process:
            self.current_proc_time_slice += 1
            
            # 2. Check: Did it exceed the Quantum?
            if self.current_proc_time_slice >= self.time_quantum:
                # PREEMPTION HAPPENS HERE
                # Move current process to back of the line (rotate)
                # We manually manipulate the queue logic here
                
                # Note: In BaseScheduler context_switch, we set state to READY.
                # Here we just decide *who* is next.
                
                # We put the current process back into the ready queue
                self.manager.ready_queue.append(self.current_process)
                
                # Pick the next one (FIFO logic from the front)
                # But wait, we need to return a DIFFERENT process if possible
                if self.manager.ready_queue:
                    next_proc = self.manager.ready_queue.pop(0)
                    
                    # Reset the slice counter for the new guy
                    self.current_proc_time_slice = 0
                    return next_proc
            else:
                # 3. Keep running current process (Quantum not finished)
                return self.current_process

        # 4. If CPU is idle, pick from Queue
        if self.manager.ready_queue:
            self.current_proc_time_slice = 0
            return self.manager.ready_queue.pop(0)

        return None