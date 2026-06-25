import random
import logging
import copy
from aethos.core.config import ConfigManager

class OptimizationGenome:
    """The DNA of the AethOS Orchestrator."""
    def __init__(self):
        self.alpha = 0.7        # Temporal Prediction Weight
        self.beta = 0.3         # Semantic Prediction Weight
        self.focus_burn = 5.0   # CPU Credit burn rate during FOCUS
        self.game_burn = 10.0   # CPU Credit burn rate during GAMING
        self.vhp_thresh = 20.0  # Battery % trigger for Vampire Hunter

    def mutate(self, variance=0.1):
        """Alters genes by +/- variance %, respecting boundaries."""
        new_genome = copy.deepcopy(self)

        # Mutate Alpha/Beta while keeping sum = 1.0
        alpha_shift = random.uniform(-variance, variance)
        new_alpha = max(0.1, min(0.9, self.alpha + alpha_shift))
        new_genome.alpha = new_alpha
        new_genome.beta = 1.0 - new_alpha

        # Mutate Burn Rates
        new_genome.focus_burn = max(1.0, self.focus_burn * random.uniform(1-variance, 1+variance))
        new_genome.game_burn = max(2.0, self.game_burn * random.uniform(1-variance, 1+variance))

        return new_genome

class PolicyDiscoveryEngine:
    """
    Evaluates and evolves the Optimization Genome based on real-world suffering metrics.
    """
    def __init__(self, config: ConfigManager):
        self.config = config
        self.current_genome = OptimizationGenome()
        self.best_genome = OptimizationGenome()

        self.best_fitness = float('inf') # Lower suffering is better
        self.current_epoch_suffering = []

        # How many ticks to test a mutation before judging it (e.g., 5 mins at 10 ticks/sec = 3000)
        # Using a smaller number (300) for rapid adaptation during alpha phase.
        self.EVAL_EPOCH_TICKS = 300
        self.ticks_in_epoch = 0

    def load_bkg(self):
        """Loads the Best Known Good genome from config."""
        saved_genes = self.config.get("genome")
        if saved_genes:
            self.best_genome.alpha = saved_genes.get("alpha", 0.7)
            self.best_genome.beta = saved_genes.get("beta", 0.3)
            self.best_genome.focus_burn = saved_genes.get("focus_burn", 5.0)
            self.best_genome.game_burn = saved_genes.get("game_burn", 10.0)
            self.best_genome.vhp_thresh = saved_genes.get("vhp_thresh", self.config.get("vhp_thresh", 15.0))
            self.current_genome = copy.deepcopy(self.best_genome)
        else:
            self.best_genome.vhp_thresh = self.config.get("vhp_thresh", 15.0)
            self.current_genome.vhp_thresh = self.config.get("vhp_thresh", 15.0)

    def save_bkg(self):
        """Persists the winning genome."""
        genes = {
            "alpha": self.best_genome.alpha,
            "beta": self.best_genome.beta,
            "focus_burn": self.best_genome.focus_burn,
            "game_burn": self.best_genome.game_burn
        }
        self.config.set("genome", genes)
        logging.info("[PDE] New Optimal Genome Persisted.")

    def step(self, current_suffering):
        """The Evolutionary Loop."""
        self.current_epoch_suffering.append(current_suffering)
        self.ticks_in_epoch += 1

        # Catastrophic Failure Isolation (Emergency Rollback)
        if current_suffering > 0.9 and len(self.current_epoch_suffering) > 10:
            recent_avg = sum(self.current_epoch_suffering[-10:]) / 10.0
            if recent_avg > 0.9:
                logging.warning("[PDE] Mutation caused catastrophic lag. Executing Emergency Rollback.")
                self.rollback()
                return self.current_genome

        # Epoch Evaluation
        if self.ticks_in_epoch >= self.EVAL_EPOCH_TICKS:
            epoch_avg = sum(self.current_epoch_suffering) / len(self.current_epoch_suffering)

            # Fitness Check
            if epoch_avg < self.best_fitness:
                logging.info(f"🧬 [PDE] Mutation SUCCESS. Suffering dropped to {epoch_avg:.3f}. Adopting genes.")
                self.best_fitness = epoch_avg
                self.best_genome = copy.deepcopy(self.current_genome)
                self.save_bkg()
            else:
                logging.info(f"🧬 [PDE] Mutation FAILED (Score: {epoch_avg:.3f} > Best: {self.best_fitness:.3f}). Rolling back.")
                self.rollback()

            # Generate next generation
            self.current_genome = self.best_genome.mutate()
            logging.info(f"🧬 [PDE] Applying new mutation (Alpha: {self.current_genome.alpha:.2f}, GameBurn: {self.current_genome.game_burn:.1f})")

            # Reset Epoch
            self.current_epoch_suffering = []
            self.ticks_in_epoch = 0

        return self.current_genome

    def rollback(self):
        self.current_genome = copy.deepcopy(self.best_genome)
        self.current_epoch_suffering = []
        self.ticks_in_epoch = 0
