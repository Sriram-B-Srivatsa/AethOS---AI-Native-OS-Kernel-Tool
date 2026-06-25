// AethOS Prime - Static demo data

export const cpuHistory = [
  { t: "00:00", v: 28 }, { t: "00:05", v: 34 }, { t: "00:10", v: 42 },
  { t: "00:15", v: 38 }, { t: "00:20", v: 55 }, { t: "00:25", v: 61 },
  { t: "00:30", v: 47 }, { t: "00:35", v: 39 }, { t: "00:40", v: 34 },
  { t: "00:45", v: 29 }, { t: "00:50", v: 44 }, { t: "00:55", v: 52 },
  { t: "01:00", v: 48 }, { t: "01:05", v: 36 }, { t: "01:10", v: 33 },
]

export const gpuHistory = [
  { t: "00:00", v: 61 }, { t: "00:05", v: 68 }, { t: "00:10", v: 72 },
  { t: "00:15", v: 78 }, { t: "00:20", v: 84 }, { t: "00:25", v: 79 },
  { t: "00:30", v: 73 }, { t: "00:35", v: 68 }, { t: "00:40", v: 76 },
  { t: "00:45", v: 82 }, { t: "00:50", v: 77 }, { t: "00:55", v: 71 },
  { t: "01:00", v: 66 }, { t: "01:05", v: 74 }, { t: "01:10", v: 80 },
]

export const ramHistory = [
  { t: "00:00", v: 52 }, { t: "00:05", v: 54 }, { t: "00:10", v: 55 },
  { t: "00:15", v: 57 }, { t: "00:20", v: 59 }, { t: "00:25", v: 58 },
  { t: "00:30", v: 61 }, { t: "00:35", v: 63 }, { t: "00:40", v: 62 },
  { t: "00:45", v: 64 }, { t: "00:50", v: 66 }, { t: "00:55", v: 65 },
  { t: "01:00", v: 67 }, { t: "01:05", v: 68 }, { t: "01:10", v: 67 },
]

export const tempHistory = [
  { t: "00:00", v: 58 }, { t: "00:05", v: 60 }, { t: "00:10", v: 63 },
  { t: "00:15", v: 65 }, { t: "00:20", v: 68 }, { t: "00:25", v: 71 },
  { t: "00:30", v: 69 }, { t: "00:35", v: 67 }, { t: "00:40", v: 64 },
  { t: "00:45", v: 62 }, { t: "00:50", v: 66 }, { t: "00:55", v: 70 },
  { t: "01:00", v: 72 }, { t: "01:05", v: 68 }, { t: "01:10", v: 65 },
]

export const neuralMetrics = [
  { t: "T-14", epsilon: 0.18, reward: 0.72, confidence: 0.81 },
  { t: "T-13", epsilon: 0.17, reward: 0.74, confidence: 0.83 },
  { t: "T-12", epsilon: 0.16, reward: 0.76, confidence: 0.84 },
  { t: "T-11", epsilon: 0.15, reward: 0.78, confidence: 0.85 },
  { t: "T-10", epsilon: 0.14, reward: 0.77, confidence: 0.86 },
  { t: "T-9",  epsilon: 0.13, reward: 0.80, confidence: 0.87 },
  { t: "T-8",  epsilon: 0.12, reward: 0.82, confidence: 0.88 },
  { t: "T-7",  epsilon: 0.11, reward: 0.81, confidence: 0.87 },
  { t: "T-6",  epsilon: 0.10, reward: 0.84, confidence: 0.89 },
  { t: "T-5",  epsilon: 0.09, reward: 0.86, confidence: 0.90 },
  { t: "T-4",  epsilon: 0.09, reward: 0.85, confidence: 0.91 },
  { t: "T-3",  epsilon: 0.08, reward: 0.88, confidence: 0.92 },
  { t: "T-2",  epsilon: 0.08, reward: 0.87, confidence: 0.91 },
  { t: "T-1",  epsilon: 0.07, reward: 0.90, confidence: 0.93 },
  { t: "Now",  epsilon: 0.07, reward: 0.91, confidence: 0.94 },
]

export const schedulerData = [
  { slot: "0s",  value: 0.78 }, { slot: "2s",  value: 0.82 },
  { slot: "4s",  value: 0.79 }, { slot: "6s",  value: 0.85 },
  { slot: "8s",  value: 0.88 }, { slot: "10s", value: 0.84 },
  { slot: "12s", value: 0.91 }, { slot: "14s", value: 0.89 },
  { slot: "16s", value: 0.93 }, { slot: "18s", value: 0.90 },
  { slot: "20s", value: 0.94 }, { slot: "22s", value: 0.92 },
]

export const predictionTimeline = [
  { t: "Now",    vscode: 0.82, figma: 0.31, slack: 0.64, terminal: 0.51 },
  { t: "+2m",   vscode: 0.85, figma: 0.38, slack: 0.71, terminal: 0.44 },
  { t: "+5m",   vscode: 0.87, figma: 0.44, slack: 0.66, terminal: 0.38 },
  { t: "+10m",  vscode: 0.84, figma: 0.51, slack: 0.72, terminal: 0.32 },
  { t: "+15m",  vscode: 0.79, figma: 0.61, slack: 0.78, terminal: 0.28 },
  { t: "+20m",  vscode: 0.73, figma: 0.68, slack: 0.74, terminal: 0.25 },
  { t: "+30m",  vscode: 0.65, figma: 0.74, slack: 0.69, terminal: 0.21 },
]

export const processes = [
  { name: "aethos-neural-scheduler", pid: 1042, cpu: 8.4, gpu: 34.2, vram: 2.1, state: "optimizing", mode: "Performance" },
  { name: "code-editor (VS Code)", pid: 2341, cpu: 4.1, gpu: 2.8, vram: 0.4, state: "active", mode: "Balanced" },
  { name: "aethos-prediction-engine", pid: 1043, cpu: 6.2, gpu: 18.1, vram: 3.8, state: "inferring", mode: "Performance" },
  { name: "slack-desktop", pid: 3812, cpu: 1.2, gpu: 0.4, vram: 0.1, state: "idle", mode: "Efficiency" },
  { name: "figma", pid: 4201, cpu: 3.8, gpu: 12.4, vram: 1.2, state: "suspended", mode: "Balanced" },
  { name: "chrome-renderer", pid: 5110, cpu: 12.3, gpu: 8.6, vram: 0.8, state: "active", mode: "Balanced" },
  { name: "aethos-semantic-index", pid: 1044, cpu: 2.1, gpu: 4.2, vram: 1.6, state: "indexing", mode: "Background" },
  { name: "terminal (zsh)", pid: 6020, cpu: 0.1, gpu: 0.0, vram: 0.0, state: "idle", mode: "Efficiency" },
  { name: "spotify", pid: 7441, cpu: 0.8, gpu: 0.2, vram: 0.1, state: "active", mode: "Efficiency" },
  { name: "aethos-memory-daemon", pid: 1045, cpu: 1.4, gpu: 1.8, vram: 0.9, state: "compacting", mode: "Background" },
]

export const searchResults = [
  {
    id: 1,
    title: "Neural Architecture Search in AethOS v4",
    snippet: "The NAS subsystem dynamically reconfigures inference pathways based on workload telemetry. Key parameters include epsilon decay rate (currently 0.07) and reward shaping functions...",
    source: "Internal Docs",
    relevance: 0.97,
    type: "documentation",
    tags: ["neural", "architecture", "inference"],
  },
  {
    id: 2,
    title: "Power Mode Optimization for GPU Workloads",
    snippet: "Performance mode enables full TDP budget allocation (72W) with dynamic boost clock management. VRAM bandwidth increases by 34% over Balanced mode at the cost of 18W additional draw...",
    source: "System Logs",
    relevance: 0.91,
    type: "log",
    tags: ["power", "gpu", "optimization"],
  },
  {
    id: 3,
    title: "Semantic Graph: Code Execution Patterns",
    snippet: "Graph cluster #14 shows high correlation between VS Code build events and GPU memory spikes. Pre-warming Figma assets reduces cold-start latency by ~340ms on average...",
    source: "Knowledge Graph",
    relevance: 0.88,
    type: "graph",
    tags: ["semantic", "graph", "patterns"],
  },
  {
    id: 4,
    title: "Scheduler Confidence Thresholds (March 2026)",
    snippet: "Updated confidence threshold policy: predictions below 0.72 are queued for deferred execution. High-frequency events are batched into 2s scheduling windows...",
    source: "Policy Store",
    relevance: 0.84,
    type: "policy",
    tags: ["scheduler", "policy", "thresholds"],
  },
]

export const aiLogs = [
  { time: "01:12:44", level: "info",  source: "scheduler",        msg: "Prediction window committed: +5m horizon, confidence 0.94" },
  { time: "01:12:41", level: "debug", source: "neural-kernel",    msg: "Epsilon decay step: 0.0712 → 0.0704" },
  { time: "01:12:38", level: "info",  source: "memory-daemon",    msg: "Compact cycle complete: freed 840 MB VRAM" },
  { time: "01:12:35", level: "warn",  source: "thermal-manager",  msg: "CPU package temp 72°C — throttle threshold at 85°C" },
  { time: "01:12:31", level: "info",  source: "semantic-index",   msg: "Graph update: 12 new edges added to cluster #14" },
  { time: "01:12:28", level: "debug", source: "prediction-engine",msg: "Pre-warming Figma renderer assets (prob: 0.61)" },
  { time: "01:12:22", level: "info",  source: "power-manager",    msg: "Mode: Performance — TDP budget 72W allocated" },
  { time: "01:12:18", level: "error", source: "neural-kernel",    msg: "Reward function divergence detected — resetting episode" },
  { time: "01:12:14", level: "info",  source: "scheduler",        msg: "Batch window [12s] closed: 8 tasks dispatched" },
  { time: "01:12:09", level: "debug", source: "chrome-renderer",  msg: "Process affinity updated: cores 4-7 assigned" },
]
