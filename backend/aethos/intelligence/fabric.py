import json
import os
import logging
from collections import defaultdict
from aethos.intelligence.context import UserIntent

class SemanticComputeFabric:
    """
    The Goal-Centric Orchestrator.
    Maps concurrent usage patterns into isolated Workspace Clusters.
    """
    def __init__(self, storage_path="storage/fabric.json"):
        self.storage_path = storage_path
        # Co-occurrence matrix: {"code.exe": {"chrome.exe": 5, "docker.exe": 3}}
        self.co_occurrence = defaultdict(lambda: defaultdict(int))
        self.load()

    def snapshot_context(self, intent: UserIntent, hot_app_names: list):
        """
        Architectural Invariant: Only map clusters during high-value cognitive states.
        If a user is just IDLE or MULTITASKING aimlessly, do not pollute the fabric.
        """
        if intent not in [UserIntent.FOCUS, UserIntent.GAMING]:
            return

        if len(hot_app_names) < 2:
            return

        # Build bidirectional graph of co-occurring apps
        for app_a in hot_app_names:
            for app_b in hot_app_names:
                if app_a != app_b:
                    self.co_occurrence[app_a][app_b] += 1

        # Periodic flush to disk
        total_edges = sum(sum(edges.values()) for edges in self.co_occurrence.values())
        if total_edges > 0 and total_edges % 20 == 0:
            self.save()

    def get_workspace_cluster(self, trigger_app: str, min_co_occurrence=3) -> set:
        """
        Retrieves all applications mathematically bound to the trigger application.
        """
        cluster = set()
        trigger_app = trigger_app.lower()

        if trigger_app not in self.co_occurrence:
            return cluster

        # Find apps that have strongly co-occurred with the trigger app
        for related_app, count in self.co_occurrence[trigger_app].items():
            if count >= min_co_occurrence:
                cluster.add(related_app)

        return cluster

    def save(self):
        try:
            os.makedirs(os.path.dirname(self.storage_path), exist_ok=True)
            serializable = {k: dict(v) for k, v in self.co_occurrence.items()}
            temp_path = self.storage_path + ".tmp"
            with open(temp_path, 'w', encoding='utf-8') as f:
                json.dump(serializable, f, indent=4)
            os.replace(temp_path, self.storage_path)
            logging.debug("[FABRIC] Workspace clusters persisted.")
        except Exception as e:
            logging.warning(f"[FABRIC] Failed to save fabric: {e}")

    def load(self):
        if os.path.exists(self.storage_path):
            try:
                with open(self.storage_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    for source, targets in data.items():
                        for target, count in targets.items():
                            self.co_occurrence[source][target] = count
                logging.info("[FABRIC] Semantic Compute Fabric loaded.")
            except Exception:
                logging.warning("[FABRIC] Corrupt fabric. Starting fresh.")
