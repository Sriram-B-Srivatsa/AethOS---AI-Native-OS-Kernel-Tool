import json
import os
import logging
from collections import defaultdict

class PredictiveIntentEngine:
    """
    The PIE (Predictive Intent Engine).
    Fuses Temporal Habits with Semantic Graph Relationships.
    """
    def __init__(self, kg=None, storage_path="storage/pie_matrix.json", config=None):
        self.config = config
        self.storage_path = storage_path
        self.kg = kg # Reference to the Knowledge Graph
        self.transitions = defaultdict(lambda: defaultdict(int))
        self.last_app = None

        # --- ARCHITECTURAL INVARIANTS: SENSOR FUSION WEIGHTS ---
        self.ALPHA = 0.7  # 70% weight to Temporal Habit (What usually happens next)
        self.BETA = 0.3   # 30% weight to Semantic Context (What is conceptually related)

        # --- THE CONFIDENCE FILTER ---
        self.MIN_CONFIDENCE = self.config.get("prewarm_confidence", 0.60) if self.config else 0.60 # Never output a prediction below threshold

        self.load()

    def record_transition(self, current_app):
        """Records state shifts into both temporal and semantic memory."""
        if not current_app or current_app.lower() in ["idle", "lockapp.exe", "searchui.exe"]:
            return

        current_app = current_app.lower()

        if self.last_app and self.last_app != current_app:
            # 1. Update Temporal Matrix (Markov)
            self.transitions[self.last_app][current_app] += 1

            # 2. Update Semantic Graph (Synapse)
            # We create a 'workflow' edge between apps in the Knowledge Graph.
            if self.kg:
                # Base weight of 0.5 for a workflow transition. Repeated links strengthen it natively.
                self.kg.link(self.last_app, current_app, relation_type="workflow", weight=0.5)

            # Flush to disk every 10 transitions
            total_transitions = sum(sum(targets.values()) for targets in self.transitions.values())
            if total_transitions > 0 and total_transitions % 10 == 0:
                self.save()

        self.last_app = current_app

    def predict_next(self, current_app, top_k=3):
        """
        Calculates: Score = (α * P_temp) + (β * P_sem)
        Passes result through Confidence Filter.
        """
        if not current_app: return []
        current_app = current_app.lower()

        # 1. Temporal Probabilities (P_temp)
        temporal_scores = {}
        if current_app in self.transitions:
            targets = self.transitions[current_app]
            total_jumps = sum(targets.values())
            if total_jumps > 0:
                for target, count in targets.items():
                    temporal_scores[target] = count / total_jumps

        # 2. Semantic Context (P_sem)
        semantic_scores = {}
        if self.kg:
            neighbors = self.kg.get_neighbors(current_app)
            for neighbor, data in neighbors.items():
                semantic_scores[neighbor] = data.get('weight', 0.0)

        # 3. Sensor Fusion
        all_candidates = set(temporal_scores.keys()).union(set(semantic_scores.keys()))
        predictions = []

        for candidate in all_candidates:
            p_temp = temporal_scores.get(candidate, 0.0)
            p_sem = semantic_scores.get(candidate, 0.0)

            final_score = (self.ALPHA * p_temp) + (self.BETA * p_sem)

            # THE CONFIDENCE FILTER (Do nothing if unsure)
            if final_score >= self.MIN_CONFIDENCE:
                predictions.append({"app": candidate, "probability": final_score})

        predictions.sort(key=lambda x: x["probability"], reverse=True)
        return predictions[:top_k]

    def save(self):
        try:
            os.makedirs(os.path.dirname(self.storage_path), exist_ok=True)
            serializable = {source: dict(targets) for source, targets in self.transitions.items()}
            temp_path = self.storage_path + ".tmp"
            with open(temp_path, 'w', encoding='utf-8') as f:
                json.dump(serializable, f, indent=4)
            os.replace(temp_path, self.storage_path)
        except Exception as e:
            logging.warning(f"[PIE] Failed to save matrix: {e}")

    def load(self):
        if os.path.exists(self.storage_path):
            try:
                with open(self.storage_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    for source, targets in data.items():
                        for target, count in targets.items():
                            self.transitions[source][target] = count
            except Exception:
                logging.warning("[PIE] Corrupt matrix. Starting fresh.")
