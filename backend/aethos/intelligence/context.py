from enum import Enum, auto

class AppCategory(Enum):
    GAME = auto()
    BROWSER = auto()
    DEV_TOOL = auto()
    MEDIA = auto()
    COMMUNICATION = auto()
    SYSTEM = auto()
    UNCATEGORIZED = auto()

class UserIntent(Enum):
    GAMING = auto()       # Maximize P-Cores, evict background VRAM
    FOCUS = auto()        # Protect foreground I/O, soft-throttle background
    MULTITASK = auto()    # Balanced scheduling, no aggressive eviction
    IDLE = auto()         # System is unattended; safe for deep background optimization

class ContextEngine:
    """
    Translates raw OS telemetry into human semantic intent.
    Designed as a pure, stateless function block.
    """
    def __init__(self):
        # Tier 1: Static Heuristic Signatures
        # In later phases, this will be populated dynamically by the Policy Discovery Engine.
        self._signatures = {
            AppCategory.BROWSER: {"chrome.exe", "msedge.exe", "firefox.exe", "brave.exe", "opera.exe"},
            AppCategory.DEV_TOOL: {"code.exe", "devenv.exe", "pycharm64.exe", "studio64.exe", "idea64.exe", "trae.exe", "python.exe", "docker.exe", "terminal.exe", "cmd.exe"},
            AppCategory.COMMUNICATION: {"discord.exe", "slack.exe", "teams.exe", "zoom.exe", "whatsapp.exe"},
            AppCategory.MEDIA: {"spotify.exe", "vlc.exe", "microsoft.media.player.exe"},
            AppCategory.GAME: {"steam.exe", "epicgameslauncher.exe", "fcprimal.exe", "csgo.exe", "valorant.exe", "cyberpunk2077.exe", "eldenring.exe"},
            AppCategory.SYSTEM: {"explorer.exe", "dwm.exe", "taskmgr.exe", "searchindexer.exe", "svchost.exe"}
        }

    def classify_process(self, process_name: str) -> AppCategory:
        """Contract: Returns a valid AppCategory for any given string."""
        if not process_name:
            return AppCategory.UNCATEGORIZED

        proc_lower = process_name.lower().strip()

        # O(N) lookup across categories.
        # Allowed because N (categories) is exceptionally small.
        for category, names in self._signatures.items():
            if proc_lower in names:
                return category

        return AppCategory.UNCATEGORIZED

    def evaluate_intent(self, active_category: AppCategory, switch_rate: int, is_idle: bool = False) -> UserIntent:
        """
        Contract: Determines global system mode based on current category and temporal velocity.
        """
        if is_idle:
            return UserIntent.IDLE

        # Rapid context switching implies multitasking, regardless of the active app type
        if switch_rate > 3:
            return UserIntent.MULTITASK

        # Hard constraints based on category
        if active_category == AppCategory.GAME:
            return UserIntent.GAMING

        if active_category == AppCategory.DEV_TOOL:
            return UserIntent.FOCUS

        # Browsers, Communications, and Uncategorized default to Multitask
        return UserIntent.MULTITASK
