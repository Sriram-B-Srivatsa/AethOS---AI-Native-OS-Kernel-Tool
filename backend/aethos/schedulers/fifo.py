from aethos.core.scheduler_interface import BaseScheduler

class FIFOScheduler(BaseScheduler):
    """
    First-In-First-Out (Non-Preemptive).
    """
    def schedule(self, current_time):
        if self.current_process is not None:
            return self.current_process
            
        if self.manager.ready_queue:
            return self.manager.ready_queue[0]
            
        return None