import logging
from collections import deque

class FutureStateSimulator:
    """
    Predicts future hardware constraints using kinematic math (velocity & acceleration).
    """
    def __init__(self, history_size=10, config=None):
        self.config = config
        # We track the last N ticks to calculate the slope
        self.temp_history = deque(maxlen=history_size)
        self.suf_history = deque(maxlen=history_size)
        self.history_size = history_size

    def _calculate_trend(self, data_deque):
        """
        Calculates the linear trend (slope) of a dataset.
        Returns the expected change per tick.
        """
        if len(data_deque) < 2:
            return 0.0

        data = list(data_deque)
        x_mean = sum(range(len(data))) / len(data)
        y_mean = sum(data) / len(data)

        numerator = sum((x - x_mean) * (y - y_mean) for x, y in enumerate(data))
        denominator = sum((x - x_mean) ** 2 for x in range(len(data)))

        if denominator == 0:
            return 0.0
        return numerator / denominator

    def step(self, current_temp, current_suffering):
        """
        Ingests current data and returns the Forecast.
        """
        self.temp_history.append(current_temp)
        self.suf_history.append(current_suffering)

        # Calculate velocity (slope)
        temp_velocity = self._calculate_trend(self.temp_history)
        suf_velocity = self._calculate_trend(self.suf_history)

        # Predict state 10 ticks into the future
        future_temp = current_temp + (temp_velocity * 10)
        future_suf = current_suffering + (suf_velocity * 10)

        thermal_panic = self.config.get("thermal_panic", 85.0) if self.config else 85.0
        is_thermal_runaway = future_temp > thermal_panic and temp_velocity > 0.5
        is_load_runaway = future_suf > 0.8 and suf_velocity > 0.05

        if is_thermal_runaway:
            logging.warning(f"⚠️ [FSS] Thermal Runaway Predicted! T+10s Temp: {future_temp:.1f}°C")

        return {
            "future_temp": future_temp,
            "future_suf": future_suf,
            "thermal_runaway": is_thermal_runaway,
            "load_runaway": is_load_runaway
        }
