import logging
from collections import defaultdict

class ResourceEconomy:
    """
    Token Bucket Economy for CPU Cycles.
    Apps spend credits based on CPU usage. When bankrupt, they are throttled.
    """
    def __init__(self):
        # Ledger: { "pid_string": current_credits }
        self.ledger = defaultdict(lambda: self.MAX_CREDITS)

        # Economic Constants
        self.MAX_CREDITS = 1000.0
        self.RECHARGE_RATE = 10.0  # Credits restored per tick if idle
        self.total_bankruptcies = 0

        # Taxation Rates (How fast an app burns credits based on CPU %)
        self.BURN_RATES = {
            "IDLE": 1.0,       # Background apps burn credits slowly
            "MULTITASK": 2.0,  # Medium burn
            "FOCUS": 5.0,      # High burn for background noise
            "GAMING": 10.0     # Brutal taxation: background apps go bankrupt instantly
        }

    def audit_economy(self, ready_queue, current_intent_name, foreground_pid, frozen_pids):
        """
        Evaluates the balance of all active processes.
        Returns a list of PIDs that have gone bankrupt and must be Eco-Chambered.
        """
        bankrupt_pids = []
        tax_rate = self.BURN_RATES.get(current_intent_name, 1.0)

        for proc in ready_queue:
            pid = str(proc.pid)

            # 1. Infinite Wealth for Foreground
            if pid == str(foreground_pid):
                self.ledger[pid] = self.MAX_CREDITS
                continue

            # 2. Skip already penalized apps
            if pid in frozen_pids:
                continue

            # 3. Calculate Burn
            # Cost = (CPU % used) * Intent Tax Rate
            # Example: Game Mode (10x). Chrome uses 5% CPU. Cost = 50 credits/tick.
            # It will go bankrupt in 20 ticks (20 seconds).
            cost = max(proc.complexity * tax_rate, 0.1)

            self.ledger[pid] -= cost

            # 4. Enforce Bankruptcy
            if self.ledger[pid] <= 0:
                if self.ledger[pid] > -9999:  # Just to ensure we don't double count if it was already bankrupt, though we skip frozen above
                    self.total_bankruptcies += 1
                self.ledger[pid] = 0
                bankrupt_pids.append(pid)
                logging.debug(f"[ECONOMY] {proc.name} (PID:{pid}) is Bankrupt. Marked for eviction.")

            # 5. Recharge Idle Apps
            # If an app uses 0% CPU, it slowly earns its credits back
            elif proc.complexity <= 1.0:
                self.ledger[pid] = min(self.ledger[pid] + self.RECHARGE_RATE, self.MAX_CREDITS)

        return bankrupt_pids

    def inject_stimulus(self, pid):
        """Used when the AI proactively thaws an app (Pre-Warming). Grants max credits."""
        self.ledger[str(pid)] = self.MAX_CREDITS
