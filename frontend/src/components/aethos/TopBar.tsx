import { Activity, ChevronRight, Cpu, Zap } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface TopBarProps {
  activePanel: string
  sysState?: any
}

const breadcrumbMap: Record<string, string[]> = {
  overview: ["Dashboard", "Overview"],
  "neural-kernel": ["Dashboard", "Neural Kernel"],
  hardware: ["Dashboard", "Hardware"],
  processes: ["Dashboard", "Processes"],
  "semantic-search": ["Dashboard", "Semantic Search"],
  predictions: ["Dashboard", "Predictions"],
  "knowledge-graph": ["Dashboard", "Knowledge Graph"],
  "power-modes": ["Dashboard", "Power Modes"],
  "ai-logs": ["Dashboard", "AI Logs"],
  settings: ["Dashboard", "Settings"],
}

export function TopBar({ activePanel, sysState }: TopBarProps) {
  const crumbs = breadcrumbMap[activePanel] ?? ["Dashboard", "Overview"]
  const cpu = sysState?.cpu !== undefined ? sysState.cpu.toFixed(1) : "--"
  const temp = sysState?.temp ? `${sysState.temp.toFixed(1)}°C` : "--"
  const ramPct = sysState?.ramTotal && sysState?.ramUsed ? ((sysState.ramUsed / sysState.ramTotal) * 100).toFixed(1) : "--"
  const battery = sysState?.bat ? `${sysState.bat.toFixed(0)}%` : "AC Power"

  return (
    <div className="flex h-11 items-center justify-between border-b border-border bg-background/80 backdrop-blur-sm px-4 shrink-0">
      {/* Left: breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm">
        {crumbs.map((crumb, i) => (
          <span key={crumb} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="size-3 text-muted-foreground" />}
            <span className={i === 0 ? "text-muted-foreground" : "text-foreground font-medium"}>
              {crumb}
            </span>
          </span>
        ))}
      </div>

      {/* Center: system status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="size-1.5 rounded-full bg-[var(--chart-2)] aethos-pulse" />
          <span>{sysState?.tick ? "AI Engine Active" : "Waiting for Kernel..."}</span>
        </div>
        <Separator orientation="vertical" className="h-4" />
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Cpu className="size-3" />
          <span>{cpu}%</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Zap className="size-3 text-[var(--chart-4)]" />
          <span>{battery} {temp ? `/ ${temp}` : ""}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Activity className="size-3 text-[var(--chart-1)]" />
          <span>{ramPct}% RAM</span>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className="text-xs border-[var(--chart-1)]/30 text-[var(--chart-1)] bg-[var(--chart-1)]/8 font-mono"
        >
          Local Mode
        </Badge>
      </div>
    </div>
  )
}
