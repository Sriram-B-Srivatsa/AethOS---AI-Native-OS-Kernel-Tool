
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const levelConfig = {
  info:  { label: "INFO",  color: "text-[var(--chart-1)]",      bg: "bg-[var(--chart-1)]/8" },
  debug: { label: "DEBUG", color: "text-muted-foreground",       bg: "bg-muted/30" },
  warn:  { label: "WARN",  color: "text-[var(--chart-4)]",      bg: "bg-[var(--chart-4)]/8" },
  error: { label: "ERROR", color: "text-[var(--destructive)]",  bg: "bg-[var(--destructive)]/8" },
}

export function AILogsPanel({ sysState }: { sysState?: any }) {
  const [logs, setLogs] = useState<any[]>([])
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (sysState?.ai_log) {
      const newLog = {
        time: new Date().toLocaleTimeString('en-US', { hour12: false }),
        level: sysState.ai_log[0] || "info",
        source: "agent",
        msg: sysState.ai_log[1] || ""
      };
      setLogs(prev => {
        if (prev.length > 0 && prev[0].msg === newLog.msg) return prev;
        return [newLog, ...prev].slice(0, 100);
      });
    }
  }, [sysState?.tick]);

  const filteredLogs = logs.filter(l => 
    l.msg.toLowerCase().includes(search.toLowerCase()) || 
    l.source.toLowerCase().includes(search.toLowerCase()) ||
    l.level.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4 p-4 overflow-auto scrollbar-thin h-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">AI Logs</h2>
          <p className="text-xs text-muted-foreground">Kernel · Scheduler · Prediction engine</p>
        </div>
        <div className="flex items-center gap-2">
          {(["info", "warn", "error", "debug"] as const).map((level) => {
            const cfg = levelConfig[level]
            return (
              <Badge
                key={level}
                variant="outline"
                className={cn("text-[10px] font-mono cursor-pointer border-border", cfg.color)}
              >
                {cfg.label}
              </Badge>
            )
          })}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input
          placeholder="Search logs..."
          className="h-8 pl-9 text-xs font-mono bg-muted/40 border-border"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Log entries */}
      <div className="aethos-card overflow-hidden flex flex-col">
        <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-muted/20">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider w-16">Time</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider w-12">Level</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider w-32">Source</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Message</span>
        </div>
        <div className="flex flex-col divide-y divide-border">
          {filteredLogs.map(({ time, level, source, msg }, i) => {
            const cfg = levelConfig[level as keyof typeof levelConfig] ?? levelConfig.debug
            return (
              <TooltipProvider key={i}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "flex items-start gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer",
                        level === "error" && "bg-[var(--destructive)]/5",
                        level === "warn" && "bg-[var(--chart-4)]/5"
                      )}
                    >
                      <span className="text-[11px] font-mono text-muted-foreground w-16 shrink-0">{time}</span>
                      <Badge
                        variant="outline"
                        className={cn("text-[9px] font-mono w-12 justify-center shrink-0 border-0", cfg.bg, cfg.color)}
                      >
                        {cfg.label}
                      </Badge>
                      <span className="text-[11px] font-mono text-muted-foreground w-32 shrink-0 truncate">{source}</span>
                      <span className={cn("text-[11px] font-mono leading-relaxed truncate", cfg.color === "text-muted-foreground" ? "text-foreground/70" : cfg.color)}>
                        {msg}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs border-border bg-background text-foreground max-w-[400px]">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold">{cfg.label} [{source}]</span>
                      <span className="font-mono text-[10px] break-words whitespace-pre-wrap">{msg}</span>
                      <span className="text-[9px] text-muted-foreground mt-1">{time}</span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )
          })}
        </div>
      </div>
    </div>
  )
}
