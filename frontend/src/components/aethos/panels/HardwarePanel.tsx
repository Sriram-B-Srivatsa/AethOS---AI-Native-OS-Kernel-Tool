import { useState, useEffect } from "react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { MiniChart } from "../MiniChart"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function HardwarePanel({ sysState }: { sysState: any }) {
  const [history, setHistory] = useState<any[]>([])

  useEffect(() => {
    if (!sysState?.tick) return;
    setHistory((prev) => {
      const next = [...prev, {
        t: sysState.tick,
        cpu: sysState.cpu || 0,
        gpu: sysState.gpuUtil || 0,
      }];
      return next.slice(-60);
    });
  }, [sysState]);

  const coresArray = sysState?.cores || Array(16).fill(0);
  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4 p-4 overflow-auto scrollbar-thin h-full">
        <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Hardware Monitor</h2>
          <p className="text-xs text-muted-foreground">CPU · GPU · Memory · Storage</p>
        </div>
        <Badge variant="outline" className="text-xs border-border font-mono">
          Refresh: 250ms
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* CPU */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="aethos-card p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-foreground">CPU (System Package)</h3>
                  <p className="text-[10px] text-muted-foreground">Logical Processors: {sysState?.core_count || "--"}</p>
                </div>
            <div className="text-right">
              <div className="text-lg font-semibold font-mono text-[var(--chart-1)]">{sysState?.cpu ? sysState.cpu.toFixed(1) : "--"}%</div>
              <div className="text-[10px] text-muted-foreground">Auto boost</div>
            </div>
          </div>

          <MiniChart data={history} dataKey="cpu" color="var(--chart-1)" height={48} />

          {/* Core grid */}
          <div className="grid grid-cols-8 gap-1.5">
            {coresArray.map((usage: number, id: number) => (
              <Tooltip key={id} delayDuration={100}>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center gap-0.5 cursor-pointer hover:bg-muted/50 rounded-sm p-0.5">
                    <div className="w-full h-10 rounded-sm bg-border/50 relative overflow-hidden">
                      <div
                        className="absolute bottom-0 w-full rounded-sm"
                        style={{
                          backgroundColor: id < 8 ? "var(--chart-1)" : "var(--chart-3)",
                          height: `${usage}%`,
                          opacity: 0.7 + (usage / 100) * 0.3,
                        }}
                      />
                    </div>
                    <span className="text-[8px] text-muted-foreground font-mono">{id}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-background/95 text-foreground backdrop-blur border border-border">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-medium text-foreground">
                      {id < 8 ? "Performance Core (P-Core)" : "Efficiency Core (E-Core)"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">Usage: {usage.toFixed(1)}%</span>
                    {usage > 40 && sysState?.topProcs && (
                      <div className="mt-1 flex flex-col gap-0.5 border-t border-border/50 pt-1">
                        <span className="text-[9px] text-[var(--chart-1)]">Top Global Demand:</span>
                        {sysState.topProcs.map((p: any, i: number) => (
                          <span key={i} className="text-[9px] text-muted-foreground">{p.name} ({p.cpu}%)</span>
                        ))}
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>

          <Separator />

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Package Temp", value: sysState?.temp ? `${sysState.temp.toFixed(1)}°C` : "--" },
              { label: "Active Cores", value: `${sysState?.core_count || "--"}` },
              { label: "Threads", value: "Auto" },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-0.5">
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</span>
                <span className="text-xs font-mono text-foreground">{value}</span>
              </div>
            ))}
          </div>
            </div>
          </TooltipTrigger>
          <TooltipContent className="bg-background/95 text-foreground backdrop-blur border border-border max-w-[200px]">
            <p className="text-xs">Visualizes thread saturation. AethOS aggressively offloads background tasks to E-Cores to leave P-Cores free for your active window.</p>
          </TooltipContent>
        </Tooltip>

        {/* GPU */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="aethos-card p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-foreground">GPU (Aggregate Matrix)</h3>
                  <p className="text-[10px] text-muted-foreground">All connected display adapters</p>
                </div>
            <div className="text-right">
              <div className="text-lg font-semibold font-mono text-[var(--chart-2)]">{sysState?.gpuUtil !== undefined ? sysState.gpuUtil.toFixed(1) : "--"}%</div>
              <div className="text-[10px] text-muted-foreground">Dynamic clocks</div>
            </div>
          </div>

          <MiniChart data={history} dataKey="gpu" color="var(--chart-2)" height={48} />

          <div className="flex flex-col gap-3 overflow-y-auto pr-2 max-h-[120px] scrollbar-thin">
            {sysState?.gpus?.map((g: any, i: number) => (
              <div key={i} className="flex flex-col gap-2 border-b border-border/50 pb-3 last:border-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground truncate max-w-[140px]" title={g.name}>{g.name.replace("NVIDIA GeForce ", "").replace(" Laptop GPU", "")}</span>
                  <span className="text-xs font-mono text-[var(--chart-2)]">{g.util?.toFixed(1)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-12">VRAM</span>
                  <Progress value={(g.mem_used / (g.mem_total || 1)) * 100} className="h-1 flex-1" style={{ "--progress-color": "var(--chart-3)" } as React.CSSProperties} />
                  <span className="text-[10px] font-mono text-foreground w-16 text-right">{g.mem_used?.toFixed(1)} GB</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-12">Temp</span>
                  <Progress value={(g.temp / 100) * 100} className="h-1 flex-1" style={{ "--progress-color": "var(--chart-4)" } as React.CSSProperties} />
                  <span className="text-[10px] font-mono text-foreground w-16 text-right">{g.temp?.toFixed(1)} °C</span>
                </div>
              </div>
            )) || <span className="text-xs text-muted-foreground">Hardware query pending...</span>}
          </div>

          <Separator />

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "GPU Temp", value: sysState?.gpuTemp ? `${sysState.gpuTemp.toFixed(1)}°C` : "--" },
              { label: "Power Draw", value: sysState?.gpus?.[0]?.power ? `${sysState.gpus[0].power.toFixed(1)} W` : "--" },
              { label: "Fan Speed", value: sysState?.gpus?.[0]?.fan ? `${sysState.gpus[0].fan.toFixed(0)}%` : "--" },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-0.5">
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</span>
                <span className="text-xs font-mono text-foreground">{value}</span>
              </div>
            ))}
          </div>
            </div>
          </TooltipTrigger>
          <TooltipContent className="bg-background/95 text-foreground backdrop-blur border border-border max-w-[200px]">
            <p className="text-xs">Scroll to view individual stats for your Intel and NVIDIA discrete/integrated graphics engines.</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Memory + Storage */}
      <div className="grid grid-cols-2 gap-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="aethos-card p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">Memory</h3>
            <span className="text-xs font-mono text-muted-foreground">{sysState?.ramTotal?.toFixed(1) || "--"} GB</span>
          </div>
          <div className="flex flex-col gap-2">
            {[
              { label: "Total",     value: sysState?.ramTotal ? `${sysState.ramTotal.toFixed(1)} GB` : "--", pct: 100 },
              { label: "Used",      value: sysState?.ramUsed ? `${sysState.ramUsed.toFixed(1)} GB` : "--", pct: ((sysState?.ramUsed || 0) / (sysState?.ramTotal || 1)) * 100 },
              { label: "Available", value: sysState?.ramAvail ? `${sysState.ramAvail.toFixed(1)} GB` : "--", pct: ((sysState?.ramAvail || 0) / (sysState?.ramTotal || 1)) * 100 },
            ].map(({ label, value, pct }) => (
              <div key={label} className="flex items-center gap-2 text-xs">
                <span className="w-20 text-muted-foreground shrink-0">{label}</span>
                <Progress value={pct} className="h-1 flex-1 [&>[data-slot=progress-indicator]]:bg-[var(--chart-3)]" />
                <span className="font-mono text-foreground w-16 text-right">{value}</span>
              </div>
            ))}
          </div>
            </div>
          </TooltipTrigger>
          <TooltipContent className="bg-background/95 text-foreground backdrop-blur border border-border">
            <p className="text-xs">Real-time breakdown of system memory.</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="aethos-card p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">Storage</h3>
            <span className="text-xs font-mono text-muted-foreground">Primary Drive</span>
          </div>
          <div className="flex flex-col gap-3 overflow-y-auto max-h-[150px] scrollbar-thin pr-1">
            {sysState?.drives?.map(({ name, used_pct }: any) => (
              <div key={name} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground font-medium">{name} Drive</span>
                  <span className="text-muted-foreground">{used_pct.toFixed(1)}% used</span>
                </div>
                <Progress value={used_pct} className="h-1.5 [&>[data-slot=progress-indicator]]:bg-[var(--chart-4)]" />
                <div className="flex justify-between text-xs mt-3">
                  <span className="text-muted-foreground">Latency (System Interrupts)</span>
                  <span className="font-mono">{sysState?.lat !== undefined ? sysState.lat.toFixed(1) : "--"} ms</span>
                </div>
                <Progress value={sysState?.lat ? Math.min(100, sysState.lat * 5) : 0} className="h-1 mt-1 bg-border/50 [&>[data-slot=progress-indicator]]:bg-[var(--chart-4)]" />
              </div>
            )) || <span className="text-xs text-muted-foreground">Scanning NVMe buses...</span>}
          </div>
            </div>
          </TooltipTrigger>
          <TooltipContent className="bg-background/95 text-foreground backdrop-blur border border-border">
            <p className="text-xs">Live capacity status of all connected drives.</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
    </TooltipProvider>
  )
}
