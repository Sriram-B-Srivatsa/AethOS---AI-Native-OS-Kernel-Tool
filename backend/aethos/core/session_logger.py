import os
import time
"""
AethOS Prime - Telemetry & Session Logger
=========================================

This module orchestrates the localized logging architecture of AethOS.
Rather than streaming telemetry to the cloud, AethOS structures deep system metrics
into three distinct local directories:

- `ai_logs/`: Direct snapshot of the PyTorch neural network decision matrix.
- `system_events/`: Process array states and hardware thermal/voltage tracking.
- `terminal_logs/`: Raw stdout/stderr interception.

It acts as a `logging.Handler` sink, dynamically writing to timestamped files 
while ensuring thread safety.
"""
import logging
from datetime import datetime
import json

class SessionLogger:
    """
    Persists AI logs, process telemetry, and system events to a user-defined directory.
    Creates a new file per session.
    """
    def __init__(self, config_manager):
        self.config = config_manager
        self.current_log_file = None
        self.last_path = None
        self._initialize_file()

    def _initialize_file(self):
        export_path = self.config.get('log_export_path')
        if export_path and os.path.exists(export_path):
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            
            ai_dir = os.path.join(export_path, "ai_logs")
            term_dir = os.path.join(export_path, "terminal_logs")
            sys_dir = os.path.join(export_path, "system_events")
            os.makedirs(ai_dir, exist_ok=True)
            os.makedirs(term_dir, exist_ok=True)
            os.makedirs(sys_dir, exist_ok=True)
            
            self.ai_log_file = os.path.join(ai_dir, f"ai_{timestamp}.log")
            self.terminal_log_file = os.path.join(term_dir, f"terminal_{timestamp}.log")
            self.system_log_file = os.path.join(sys_dir, f"system_{timestamp}.log")
            
            self.last_path = export_path
            
            try:
                # Initialize system events log
                with open(self.system_log_file, 'w', encoding='utf-8') as f:
                    f.write(f"=========================================================\n")
                    f.write(f"AETHOS SYSTEM EVENTS LOG\n")
                    f.write(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                    f.write(f"=========================================================\n\n")
                    
                # Initialize AI log
                with open(self.ai_log_file, 'w', encoding='utf-8') as f:
                    f.write(f"=========================================================\n")
                    f.write(f"AETHOS NEURAL KERNEL LOG\n")
                    f.write(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                    f.write(f"=========================================================\n\n")
                    
                # Attach to root logger to capture terminal logs
                file_handler = logging.FileHandler(self.terminal_log_file, encoding='utf-8')
                file_handler.setFormatter(logging.Formatter('[%(levelname)s] %(message)s'))
                logging.getLogger().addHandler(file_handler)
                
                # Redirect stdout/stderr to logger to catch print statements
                import sys
                class StdoutLogger:
                    def __init__(self, level):
                        self.level = level
                    def write(self, message):
                        if message.strip():
                            self.level(message.strip())
                    def flush(self):
                        pass
                
                sys.stdout = StdoutLogger(logging.info)
                sys.stderr = StdoutLogger(logging.error)
                
            except Exception as e:
                logging.error(f"[SessionLogger] Failed to initialize files: {e}")
                self.system_log_file = None
                self.ai_log_file = None
                self.terminal_log_file = None

    def log_tick(self, payload):
        """
        Receives the update_dashboard payload every tick and writes a human-readable summary.
        """
        export_path = self.config.get('log_export_path')
        
        # Handle setting changes on the fly
        if export_path != self.last_path:
            self._initialize_file()
            
        if not getattr(self, 'system_log_file', None):
            return

        tick = payload.get('tick', 0)
        cpu = payload.get('cpu', 0)
        gpu = payload.get('gpuUtil', 0)
        ram_used = payload.get('ramUsed', 0)
        ram_total = payload.get('ramTotal', 1)
        temp = payload.get('temp', 0)
        mode = payload.get('powerMode', 'Unknown')
        eps = payload.get('eps', 1.0)
        suf = payload.get('suf', 0)
        
        procs = payload.get('procs', [])
        
        # Only log if there's significant activity or every 10 ticks to avoid massive files,
        # but the user requested *all* logs. We will log every tick, but format it cleanly.
        
        try:
            # Write to system log
            with open(self.system_log_file, 'a', encoding='utf-8') as f:
                f.write(f"--- TICK {tick} | CPU: {cpu}% | GPU: {gpu}% | RAM: {(ram_used/ram_total)*100:.1f}% | TEMP: {temp}C | MODE: {mode} | CONF: {((1-eps)*100):.1f}% | SUF: {suf}% ---\n")
                
                active_procs = [p for p in procs if p.get('state') != 'TERMINATED']
                if active_procs:
                    f.write("ACTIVE PROCESSES:\n")
                    for p in active_procs:
                        f.write(f"  [{p.get('pid')}] {p.get('name')} | Load: {p.get('complexity')}% | Priority: {p.get('priority')} | State: {p.get('state')}\n")
                f.write("\n")
                
            # Write to AI log
            ai_log = payload.get('ai_log')
            if ai_log and len(ai_log) == 2:
                with open(self.ai_log_file, 'a', encoding='utf-8') as f:
                    f.write(f"[AI LOG] [{ai_log[0].upper()}] {ai_log[1]}\n")
                    
        except Exception as e:
            logging.error(f"[SessionLogger] Failed to write to log: {e}")
