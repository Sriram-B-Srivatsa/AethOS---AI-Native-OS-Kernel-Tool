"""
AethOS Prime - Kernel Entry Point & HAL Orchestrator
====================================================

This is the absolute core entry point of the AethOS application. It orchestrates the 
hardware layer (HAL) and the Deep Q-Learning agent, while maintaining the primary 
event loop that binds the entire OS optimization architecture together.

Key Responsibilities:
1. Initialize the `psutil` daemon for real-time CPU/GPU telemetry gathering.
2. Initialize the `ConfigManager` to load/persist the user's Dark Mode, Logs, and UI preferences.
3. Spawn the local Semantic Vector Database (FAISS) thread.
4. Spin up the `AethosBridge` (PyWebView + Flask + Socket.IO) to render the React UI.
5. Manage the continuous 250ms asynchronous TICK loop, piping OS telemetry through the Neural Network.
"""
import time
import logging
import threading
import signal
import os
import psutil
import keyboard
import sys

# --- ARCHITECTURAL FIX: PERSISTENT CRASH-PROOF LOGGING ---
# This ensures every log is instantly flushed to disk.
log_formatter = logging.Formatter('[%(levelname)s] AethOS: %(message)s')

file_handler = logging.FileHandler("aethos_kernel.log", mode='a', encoding='utf-8')
file_handler.setFormatter(log_formatter)
# Force immediate flush to disk
file_handler.flush = lambda: file_handler.stream.flush()

console_handler = logging.StreamHandler(sys.stdout)
console_handler.setFormatter(log_formatter)

logging.basicConfig(
    level=logging.INFO,
    handlers=[file_handler, console_handler]
)

# --- DOMAIN IMPORTS ---
from aethos.core.manager import ProcessManager
from aethos.schedulers.ai_native import AIScheduler
from aethos.interface.bridge import UIBridge
from aethos.core.config import ConfigManager
from aethos.core.power import PowerOrchestrator
from aethos.core.session_logger import SessionLogger

# --- STORAGE IMPORTS ---
from aethos.storage.semantic import VectorDB
from aethos.storage.graph import KnowledgeGraph
from aethos.storage.indexer import LocalIndexer

# Configure System Logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(levelname)s] AethOS: %(message)s',
    datefmt='%H:%M:%S'
)

class Kernel:
    def __init__(self):
        logging.info("Initializing Kernel & Mounting File Systems...")
        self.running = True
        self.tick_rate = 1.0

        # 1. LOAD SETTINGS
        self.config = ConfigManager()

        # 2. MOUNT STORAGE
        self.db = VectorDB(storage_path="storage/index.json")
        self.kg = KnowledgeGraph(storage_path="storage/graph.json")
        self.power_manager = PowerOrchestrator()

        # 3. START HAL & AI
        logging.info("Initializing HAL (Hardware Abstraction Layer)...")

        # --- ARCHITECTURAL FIX: Extract and bind state BEFORE initialization ---
        saved_mode = self.config.get("safe_mode")
        is_safe = True if saved_mode is None else bool(saved_mode)

        self.process_manager = ProcessManager(live_mode=True)
        # Pass the extracted 'is_safe' state and the KnowledgeGraph (self.kg)
        self.scheduler = AIScheduler(self.process_manager, kg=self.kg, initial_safe_mode=is_safe, config=self.config)

        # 4. MOUNT INTERFACE
        self.bridge = UIBridge(self, self.db, self.kg, self.config)
        
        # 5. INITIALIZE LOGGING
        self.session_logger = SessionLogger(self.config)

    def start(self):
        """
        Entry Point.
        Sets up signal handlers and hands main thread to the UI.
        """
        # Register Graceful Shutdown Handlers (Ctrl+C protection)
        signal.signal(signal.SIGINT, self.handle_exit)
        signal.signal(signal.SIGTERM, self.handle_exit)

        logging.info("Handing over main thread to UI...")
        try:
            self.bridge.launch()
        except KeyboardInterrupt:
            self.shutdown()

    def _trigger_panic(self):
        """
        Asynchronous Panic Handler.
        Triggers when Ctrl+Shift+Q is pressed.
        """
        logging.warning("\n[PANIC BUTTON PRESSED] Executing Emergency Thaw...")

        if hasattr(self, 'scheduler') and hasattr(self.scheduler, 'actuator'):
            # 1. Restore all physical hardware states
            self.scheduler.actuator.emergency_restore()

            # 2. Force Safe Mode to True in the logic
            self.scheduler.actuator.safe_mode = True
            self.scheduler.actuator.gpu_actuator.safe_mode = True

            # 3. ARCHITECTURAL FIX: Sync UI via SocketIO
            # We tell the bridge to notify the browser to update the toggle switch
            try:
                self.bridge.socketio.emit('update_setting', {'key': 'safe_mode', 'value': True})
                logging.info("[PANIC] UI Sync Signal Sent.")
            except Exception as e:
                logging.error(f"[PANIC] UI Sync Failed: {e}")

    def handle_exit(self, signum, frame):
        """Catches OS Signals (Ctrl+C) and stops safely."""
        logging.info(f"\nSignal {signum} received. Cleaning up...")
        self.shutdown()

    def boot(self):
        """
        Called by the UI Thread (in background).
        Actual System Startup.
        """
        logging.info("Boot sequence complete. System is LIVE.")

        # Apply initial power mode
        initial_mode = self.config.get("power_mode", "performance")
        self.power_manager.apply_mode(initial_mode, self.scheduler)

        # --- ARCHITECTURAL FIX: THE GLOBAL PANIC BUTTON ---
        # If the PC freezes, pressing Ctrl+Shift+Q will instantly thaw all processes
        try:
            keyboard.add_hotkey('ctrl+shift+q', self._trigger_panic)
            logging.info("[SYSTEM] Global Panic Button Registered: Press Ctrl+Shift+Q to emergency thaw.")
        except Exception as e:
            logging.error(f"[SYSTEM] Failed to register Global Panic Button: {e}")

        # Background Indexing Service
        # If the brain is empty, start crawling the User Profile
        if len(self.db.documents) == 0:
            logging.info("Index is empty. Starting Background Indexer Service...")
            threading.Thread(target=self._background_indexer, daemon=True).start()

        # Enter the infinite CPU loop
        self.run_loop()

    def _background_indexer(self):
        """Runs purely in the background so it doesn't freeze the OS."""
        try:
            indexer = LocalIndexer(self.db, self.kg)
            # Scans C:\Users\YourName safely
            indexer.scan_user_directory()
        except Exception as e:
            logging.error(f"Background Indexer crashed: {e}")

    def run_loop(self):
        """
        The Heartbeat (Background Thread).
        """
        tick_count = 0
        try:
            while self.running:
                # -------------------------------------------------
                # 1. SYNC REALITY (The Eyes)
                # -------------------------------------------------
                self.process_manager.update(tick_count)

                # -------------------------------------------------
                # 2. SCHEDULER TICK (The Brain)
                # -------------------------------------------------
                self.scheduler.tick(tick_count)

                # -------------------------------------------------
                # 3. VISUALIZATION (The Face)
                # -------------------------------------------------
                if tick_count % 1 == 0:
                    self.push_ui_update(tick_count)

                # Terminal Vision Debug (Logs tensor inputs every 10 ticks)
                if tick_count % 10 == 0 and self.scheduler.last_state is not None:
                    self.scheduler.encoder.debug_print(self.scheduler.last_state)

                # -------------------------------------------------
                # 4. CLOCK
                # -------------------------------------------------
                time.sleep(self.tick_rate)
                tick_count += 1

        except Exception as e:
            logging.error(f"Kernel Crash: {e}")
            self.shutdown()

    def push_ui_update(self, tick):
        import psutil
        import os
        current = self.scheduler.current_process
        cpu_name = current.name if current else "IDLE"

        metrics = self.scheduler.metrics.get_system_state_vector(self.process_manager)
        avg_wait = metrics[0]
        suf = min(avg_wait / 500.0, 1.0)
        eps = self.scheduler.agent.epsilon if self.scheduler.agent else 1.0

        try:
            batt = psutil.sensors_battery()
            bat_pct = int(batt.percent) if batt else 100
            ac = batt.power_plugged if batt else True
        except: bat_pct, ac = 100, True

        temp = self.scheduler.actuator.sensors.get_cpu_temp()
        overall_cpu = psutil.cpu_percent()
        cores = psutil.cpu_percent(percpu=True)
        gpu_stats_list = self.scheduler.actuator.sensors.get_gpu_stats()
        max_gpu_util = max([g["util"] for g in gpu_stats_list]) if gpu_stats_list else 0.0
        max_gpu_temp = max([g["temp"] for g in gpu_stats_list]) if gpu_stats_list else 0.0
        tot_gpu_mem_used = sum([g["mem_used"] for g in gpu_stats_list]) if gpu_stats_list else 0.0
        tot_gpu_mem_tot = sum([g["mem_total"] for g in gpu_stats_list]) if gpu_stats_list else 0.0
        # Add RAM Stats
        mem = psutil.virtual_memory()
        ram_total = mem.total / (1024**3)
        ram_used = mem.used / (1024**3)
        ram_avail = mem.available / (1024**3)
        ram_free = mem.free / (1024**3)

        # Add Uptime
        uptime_seconds = time.time() - psutil.boot_time()

        # Add Storage Stats (All Drives)
        drives_data = []
        try:
            for part in psutil.disk_partitions(all=False):
                try:
                    usage = psutil.disk_usage(part.mountpoint)
                    drives_data.append({
                        "name": part.mountpoint,
                        "used_pct": usage.percent
                    })
                except: pass
        except: pass

        # Economy Bankruptcies
        try: bankruptcies = self.scheduler.economy.total_bankruptcies
        except: bankruptcies = 0

        # Top 3 Processes for CPU Hover Tooltip
        top_procs = []
        try:
            sorted_procs = sorted(self.process_manager.ready_queue, key=lambda x: x.complexity, reverse=True)[:3]
            for p in sorted_procs:
                top_procs.append({"name": p.name, "cpu": round(p.complexity, 1)})
        except: pass

        # Evolution (PDE)
        try:
            genome = self.scheduler.pde.current_genome
            pde_stats = {
                "alpha": genome.alpha, "beta": genome.beta,
                "focus": genome.focus_burn, "game": genome.game_burn,
                "fitness": self.scheduler.pde.best_fitness if self.scheduler.pde.best_fitness != float('inf') else 0.0
            }
        except: pde_stats = {"alpha":0.7,"beta":0.3,"focus":5.0,"game":10.0,"fitness":0.0}

        # Vision Tensor
        try:
            if self.scheduler.last_state is not None:
                vision_tensor = self.scheduler.last_state.numpy().flatten().tolist()
            else: vision_tensor = []
        except: vision_tensor = []

        # Knowledge Graph Payload (cap at 50 nodes for UI perf)
        kg_nodes_ui = []
        kg_edges_ui = []
        try:
            nodes_list = list(self.kg.edges.keys())[:50]
            for n in nodes_list:
                node_label = os.path.basename(n) if n else "Unknown"
                kg_nodes_ui.append({"id": n, "label": node_label, "type": "doc", "color": "var(--chart-3)", "r": 15})
                for target in self.kg.edges[n].keys():
                    if target in nodes_list:
                        kg_edges_ui.append([nodes_list.index(n), nodes_list.index(target)])
            
            # dedup edges
            unique_edges = []
            for e in kg_edges_ui:
                if [e[1], e[0]] not in unique_edges and e not in unique_edges:
                    unique_edges.append(e)
            kg_edges_ui = unique_edges
        except: pass

        # Semantic Search Stats
        try:
            sem_stats = {"docs": len(self.db.documents), "entities": len(self.kg.edges)}
        except: sem_stats = {"docs":0, "entities":0}

        # Predictions Panel
        predictions = []
        session_graph = {"nodes": [], "edges": []}
        try:
            if hasattr(self.scheduler, 'predictor'):
                if current and current.name:
                    predictions = self.scheduler.predictor.predict_next(current.name, top_k=10)
                
                nodes_set = set()
                edges_list = []
                for src, targets in self.scheduler.predictor.transitions.items():
                    nodes_set.add(src)
                    for tgt, count in targets.items():
                        nodes_set.add(tgt)
                        edges_list.append({"from": src, "to": tgt, "weight": count})
                
                session_graph["nodes"] = list(nodes_set)
                session_graph["edges"] = edges_list
        except Exception as e:
            pass

        procs_data =[]
        for proc in self.process_manager.ready_queue:
            prio_str = "Normal"
            if proc.priority >= 8: prio_str = "High"
            elif proc.priority <= 3: prio_str = "Low"

            # Determine UI State
            ui_state = "idle"
            if current and proc.pid == current.pid: ui_state = "active"
            elif proc.pid in self.scheduler.actuator.frozen_pids: ui_state = "suspended"
            elif proc.priority >= 8: ui_state = "optimizing"

            try:
                mem_mb = psutil.Process(int(proc.pid)).memory_info().rss / (1024 * 1024)
            except: mem_mb = 0

            try:
                credits = self.scheduler.economy.ledger.get(str(proc.pid), 1000.0)
                tax_rate = self.scheduler.economy.BURN_RATES.get(self.scheduler.current_intent.name, 1.0)
                burn_rate = max(proc.complexity * tax_rate, 0.1)
                try: fg_pid = self.scheduler.actuator._get_foreground_pid()
                except: fg_pid = None
                if str(proc.pid) == str(fg_pid):
                    burn_rate = 0.0
            except: credits, burn_rate = 1000.0, 0.0

            procs_data.append({
                "name": proc.name, "pid": proc.pid, "cpu": proc.complexity,
                "prio": prio_str, "wait": round(proc.wait_time_accumulated, 1),
                "state": ui_state, "mem": mem_mb, "credits": round(credits, 1), "burn_rate": round(burn_rate, 1),
                "gpu": 0, "vram": 0, "mode": "Performance" if ui_state == "active" else "Background"
            })

        log_lvl = "info"
        action_log = f"AI Target: {cpu_name}"
        if current and current.pid:
            try:
                owner = psutil.Process(int(current.pid)).username().lower()
                if '\\' in owner: owner = owner.split('\\')[-1]
                if owner != self.scheduler.actuator.current_user:
                    action_log = f"Blocked Target: {cpu_name}"
                    log_lvl = "warn"
            except: pass

        payload = {
            "tick": tick, "cpu": overall_cpu, "temp": temp, "bat": bat_pct, "ac": ac,
            "lat": avg_wait, "eps": eps, "suf": suf, "core_count": len(cores), "cores": cores,
            "gpuUtil": max_gpu_util, "gpuTemp": max_gpu_temp,
            "gpuVram": (tot_gpu_mem_used/tot_gpu_mem_tot*100) if tot_gpu_mem_tot>0 else 0,
            "gpus": gpu_stats_list,
            "ramTotal": ram_total, "ramUsed": ram_used, "ramAvail": ram_avail, "ramFree": ram_free,
            "uptime": uptime_seconds, "drives": drives_data, "topProcs": top_procs,
            "procs": procs_data,
            "bankruptcies": bankruptcies, "pde": pde_stats, "vision": vision_tensor,
            "kg_nodes": kg_nodes_ui, "kg_edges": kg_edges_ui, "sem_stats": sem_stats,
            "predictions": predictions, "session_graph": session_graph,
            "ai_log": [log_lvl, action_log], "power_mode": self.power_manager.current_mode,
            "config": self.config.settings, "safe_mode": self.config.get("safe_mode", True)
        }
        self.session_logger.log_tick(payload)
        self.bridge.update_view(payload)

    def shutdown(self):
        """Graceful Exit & Emergency Thaw."""
        logging.info("\n[SYSTEM] Shutdown signal received. Halting Kernel Loop...")
        self.running = False
        
        # 1. Release Hardware Locks FIRST (Staggered to prevent freezing)
        if hasattr(self, 'scheduler') and hasattr(self.scheduler, 'actuator'):
            self.scheduler.actuator.emergency_restore()
            
        # 2. Save Data SECOND (I/O Spikes happen here, but PC is already thawed)
        logging.info("[SYSTEM] Persisting Neural Models to NVMe...")
        if hasattr(self, 'scheduler'):
            if hasattr(self.scheduler, 'predictor'):
                self.scheduler.predictor.save()
            if self.scheduler.agent:
                self.scheduler.agent.save_brain()
            if hasattr(self.scheduler, 'fabric'):
                self.scheduler.fabric.save()
                
        logging.info("[SYSTEM] AethOS Halted Cleanly.")
        os._exit(0)

if __name__ == "__main__":
    system = Kernel()
    system.start()
