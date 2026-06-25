import torch
import logging
import psutil
from collections import deque

from aethos.core.scheduler_interface import BaseScheduler
from aethos.intelligence.agent import DQNAgent
from aethos.intelligence.vision import StateEncoder
from aethos.core.actuator import WindowsActuator
from aethos.core.manager import ProcessState
from aethos.intelligence.context import ContextEngine, UserIntent, AppCategory
from aethos.intelligence.predictor import PredictiveIntentEngine
from aethos.core.latency import LatencyGuardian
from aethos.core.economy import ResourceEconomy
from aethos.intelligence.evolution import PolicyDiscoveryEngine
from aethos.core.memory import MemoryGovernor, MemoryTemp
from aethos.intelligence.fabric import SemanticComputeFabric
from aethos.core.config import ConfigManager
from aethos.intelligence.simulator import FutureStateSimulator

class AIScheduler(BaseScheduler):
    """
    The Predictive Decision Engine (AethOS V3).
    """
    def __init__(self, process_manager, kg=None, initial_safe_mode=True, config=None):
        super().__init__(process_manager)

        if config is None:
            config = ConfigManager()

        # 1. State & Sensors
        self.encoder = StateEncoder()
        self.actuator = WindowsActuator(safe_mode=initial_safe_mode, config=config)
        self.guardian = LatencyGuardian()

        # 2. Context & Prediction
        self.context = ContextEngine()
        self.predictor = PredictiveIntentEngine(kg=kg, config=config)
        self.fg_history = deque(maxlen=10)
        self.current_intent = UserIntent.IDLE
        self.current_fg_name = "Unknown"

        # 3. Decision Engine (RL)
        action_dim = self.encoder.max_queue_size + 1
        self.agent = DQNAgent(input_dim=self.encoder.input_size, action_dim=action_dim, config=config)

        # 4. Evolution Engine (PDE)
        self.pde = PolicyDiscoveryEngine(config)
        self.pde.load_bkg()

        # 5. Resource Economy
        self.economy = ResourceEconomy()

        # 6. ARCHITECTURAL FIX: Instantiate missing V3 Modules
        self.fabric = SemanticComputeFabric()
        self.memory_governor = MemoryGovernor(pressure_threshold=85.0)
        self.fss = FutureStateSimulator(config=config)

        # 7. Loop State
        self.last_state = None
        self.last_action = None
        self.last_validation_penalty = 0.0
        self.previous_g_wait = 0.0
        self.training_mode = True

        self.EPOCH_TICKS = 10
        self.pending_boost = None

    def _enforce_resource_economy(self):
        """
        V3 Replacement for Vampire Hunter.
        Manages both RAM constraints (HOT/COLD) and CPU Credits.
        """
        try:
            # 1. Enforce Memory Economy (RAM Trimming for COLD apps)
            self.memory_governor.enforce_memory_economy(safe_mode=self.actuator.safe_mode)

            # 2. Audit CPU Ledger
            fg_pid = self.actuator._get_foreground_pid()
            bankrupt_pids = self.economy.audit_economy(
                self.manager.ready_queue,
                self.current_intent.name,
                fg_pid,
                self.actuator.frozen_pids
            )

            # 3. Execute Evictions (Batch Limit to prevent API storms)
            evicted_this_cycle = 0
            for pid in bankrupt_pids:
                if self.actuator.toggle_suspend(pid, should_suspend=True, intent=self.current_intent):
                    evicted_this_cycle += 1
                    if evicted_this_cycle >= 3:
                        break
        except Exception as e:
            pass

    def _update_temporal_context(self):
        """Builds short-term history, predicts the future, and maps Workspace Clusters."""
        try:
            fg_pid = self.actuator._get_foreground_pid()
            if fg_pid:
                # Keep foreground app HOT in RAM
                self.memory_governor.update_heat_map([fg_pid])

                try:
                    new_fg_name = psutil.Process(int(fg_pid)).name().lower()

                    if new_fg_name != self.current_fg_name:
                        self.predictor.record_transition(new_fg_name)

                        # --- PRE-WARMING WORKSPACE CLUSTERS ---
                        predictions = self.predictor.predict_next(new_fg_name)
                        if predictions:
                            top_pred = predictions[0]
                            if top_pred['probability'] > 0.60:
                                target_app = top_pred['app']

                                # Fetch the full cluster of apps bound to this target
                                cluster = self.fabric.get_workspace_cluster(target_app)
                                cluster.add(target_app)

                                logging.info(f"🌌 [FABRIC] Pre-Warming Workspace: {list(cluster)} (Confidence: {top_pred['probability']*100:.0f}%)")

                                # Thaw the entire cluster
                                for frozen_pid in list(self.actuator.frozen_pids):
                                    try:
                                        frozen_name = psutil.Process(int(frozen_pid)).name().lower()
                                        if frozen_name in cluster:
                                            self.actuator.toggle_suspend(frozen_pid, should_suspend=False, intent=self.current_intent)
                                            self.memory_governor.update_heat_map([frozen_pid])
                                            self.economy.inject_stimulus(frozen_pid) # Inject CPU credits
                                    except: pass

                    self.current_fg_name = new_fg_name
                except: pass

            # Switch Rate & Intent
            self.fg_history.append(self.current_fg_name)
            switches = sum(1 for i in range(1, len(self.fg_history)) if self.fg_history[i] != self.fg_history[i-1])
            new_intent = self.context.evaluate_intent(self.context.classify_process(self.current_fg_name), switch_rate=switches)

            if new_intent != self.current_intent:
                logging.info(f"[CONTEXT] Mode Shift: {self.current_intent.name} -> {new_intent.name} (Active: {self.current_fg_name})")
                self.current_intent = new_intent

            # --- SNAPSHOT THE WORKSPACE ---
            hot_app_names = []
            for pid_str, last_active in self.memory_governor.heat_map.items():
                if self.memory_governor.get_temperature(pid_str) == MemoryTemp.HOT:
                    try:
                        name = psutil.Process(int(pid_str)).name().lower()
                        hot_app_names.append(name)
                    except: pass

            self.fabric.snapshot_context(self.current_intent, list(set(hot_app_names)))

        except Exception: pass

    def _validate_action(self, selected_process):
        """
        ARCHITECTURAL GUARD: The Bounded RL Validator.
        Prevents the AI from taking stupid or illegal actions based on current Context.
        """
        penalty = 0.0
        if not selected_process: return None, penalty

        proc_cat = self.context.classify_process(selected_process.name)

        if self.current_intent == UserIntent.GAMING:
            if proc_cat not in [AppCategory.GAME, AppCategory.COMMUNICATION]:
                logging.warning(f"[VALIDATOR] Vetoed AI attempt to boost {selected_process.name} during GAMING.")
                penalty = 5.0
                return None, penalty

        if self.current_intent == UserIntent.FOCUS:
            if proc_cat == AppCategory.SYSTEM:
                penalty = 2.0
                return None, penalty

        return selected_process, penalty

    def schedule(self, current_time):
        # 1. Update Context (State changes detection & Pre-warming)
        self._update_temporal_context()

        # 2. Maintain physical OS boundaries
        if self.current_process is not None and self.current_process.state != ProcessState.TERMINATED:
            if self.current_process not in self.manager.ready_queue:
                self.manager.ready_queue.append(self.current_process)

        # 3. Future State Simulation & Dynamic Economy
        current_temp = self.actuator.sensors.get_cpu_temp()
        metrics_vec = self.metrics.get_system_state_vector(self.manager)
        current_g_wait = min(metrics_vec[0] / 500.0, 1.0)

        forecast = self.fss.step(current_temp, current_g_wait)
        active_genome = self.pde.step(current_g_wait)

        multiplier = 3.0 if forecast["thermal_runaway"] else 1.0

        self.predictor.ALPHA = active_genome.alpha
        self.predictor.BETA = active_genome.beta
        self.economy.BURN_RATES["FOCUS"] = active_genome.focus_burn * multiplier
        self.economy.BURN_RATES["GAMING"] = active_genome.game_burn * multiplier

        # 4. Enforce Resource Economy
        if current_time % 5 == 0:
            self._enforce_resource_economy()

        # 5. AI Observation
        current_state_tensor = self.encoder.get_state_vector(self.manager, self.metrics)

        # 6. RL Learning Step
        if self.last_state is not None and self.training_mode:
            self._learn_step(current_state_tensor)

        # 7. AI Decision
        raw_action_idx = self.agent.select_action(current_state_tensor)
        raw_process = self._map_action_to_process(raw_action_idx)

        # 8. VALIDATION (The Hard Guard)
        validated_process, validation_penalty = self._validate_action(raw_process)
        self.last_validation_penalty = validation_penalty

        # 9. Actuation Hysteresis
        if validated_process and validated_process.pid:
            self.pending_boost = validated_process.pid

        if current_time % self.EPOCH_TICKS == 0 and self.pending_boost:
            self.actuator.enforce_priority(self.pending_boost, 8)
            self.pending_boost = None

        # 10. Store Memory
        self.last_state = current_state_tensor
        self.last_action = raw_action_idx
        self.previous_g_wait = current_g_wait

        return validated_process

    def _map_action_to_process(self, action_idx):
        queue_len = len(self.manager.ready_queue)
        if action_idx == self.encoder.max_queue_size: return None
        if action_idx < queue_len: return self.manager.ready_queue.pop(action_idx)
        if queue_len > 0: return self.manager.ready_queue.pop(0)
        return None

    def _learn_step(self, current_state_tensor):
        metrics_vec = self.metrics.get_system_state_vector(self.manager)
        current_g_wait = min(metrics_vec[0] / 500.0, 1.0)
        previous_g_wait_norm = min(self.previous_g_wait / 500.0, 1.0)
        latency_reward = (previous_g_wait_norm - current_g_wait) * 10.0

        guardian_metrics = self.guardian.get_metrics()
        stutter_penalty = guardian_metrics['stutters'] * 0.5

        rule_penalty = self.last_validation_penalty
        final_reward = latency_reward - stutter_penalty - rule_penalty

        reward_tensor = torch.tensor([[final_reward]], dtype=torch.float)
        action_tensor = torch.tensor([[self.last_action]], dtype=torch.long)

        self.agent.memory.push(self.last_state, action_tensor, current_state_tensor, reward_tensor)
        self.agent.optimize_model()
        self.agent.decay_epsilon()
