import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Search, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useState } from "react"

const stateConfig: Record<string, { label: string; color: string; bg: string }> = {
  active:     { label: "Active",     color: "text-[var(--chart-2)]",      bg: "bg-[var(--chart-2)]/10 border-[var(--chart-2)]/30" },
  optimizing: { label: "Optimizing", color: "text-[var(--chart-1)]",      bg: "bg-[var(--chart-1)]/10 border-[var(--chart-1)]/30" },
  inferring:  { label: "Inferring",  color: "text-[var(--chart-1)]",      bg: "bg-[var(--chart-1)]/10 border-[var(--chart-1)]/30" },
  indexing:   { label: "Indexing",   color: "text-[var(--chart-3)]",      bg: "bg-[var(--chart-3)]/10 border-[var(--chart-3)]/30" },
  compacting: { label: "Compacting", color: "text-[var(--chart-4)]",      bg: "bg-[var(--chart-4)]/10 border-[var(--chart-4)]/30" },
  suspended:  { label: "Suspended",  color: "text-muted-foreground",      bg: "bg-muted/40 border-border" },
  idle:       { label: "Idle",       color: "text-muted-foreground",      bg: "bg-muted/40 border-border" },
}

// modeConfig removed

function CpuBar({ value, max = 15 }: { value: number; max?: number }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div className="flex items-center gap-2">
      <div className="w-12 h-1 rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--chart-1)]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono text-foreground w-8">{value.toFixed(1)}%</span>
    </div>
  )
}

function GpuBar({ value, max = 40 }: { value: number; max?: number }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div className="flex items-center gap-2">
      <div className="w-12 h-1 rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--chart-2)]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono text-foreground w-8">{value.toFixed(1)}%</span>
    </div>
  )
}

export function ProcessesPanel({ sysState }: { sysState: any }) {
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("All")
  const processes = sysState?.procs || []
  
  const filteredProcs = processes.filter((p: any) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchesType = typeFilter === "All" || p.name.toLowerCase().endsWith(typeFilter.toLowerCase())
    return matchesSearch && matchesType
  })

  const activeCount = processes.filter((p: any) => p.state !== "idle" && p.state !== "suspended").length;
  const totalCpu = sysState?.cpu?.toFixed(1) || "0.0"
  const totalGpu = sysState?.gpuUtil?.toFixed(1) || "0.0"
  const totalRam = sysState?.ramUsed?.toFixed(1) || "0.0"

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4 p-4 overflow-auto scrollbar-thin h-full">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Process Manager</h2>
            <p className="text-xs text-muted-foreground">{processes.length} tracked processes · AI-optimized scheduling</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input 
                placeholder="Search Processes..." 
                className="h-7 pl-8 text-xs w-48 bg-muted/40 border-border" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                  <SlidersHorizontal className="size-3" />
                  {typeFilter === "All" ? "Filter" : typeFilter}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[150px] bg-background border-border text-foreground">
                {["All", ".exe", ".dll", ".sys", "System"].map(ext => (
                  <DropdownMenuItem key={ext} onClick={() => setTypeFilter(ext)} className="text-xs cursor-pointer">
                    {ext === "All" ? "All Types" : ext}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

      {/* Summary bar */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "Active Processes", value: activeCount, sub: `of ${processes.length} tracked`, tt: "Processes currently being actively scheduled or optimized by AethOS. It is totally normal for this to be 0 when AethOS has successfully suspended all heavy background tasks." },
          { label: "Total CPU", value: `${totalCpu}%`, sub: "system utilization", tt: "Total package CPU utilization across all logical cores." },
          { label: "Total GPU", value: `${totalGpu}%`, sub: "compute utilization", tt: "Highest compute utilization across all connected GPUs." },
          { label: "Total RAM", value: `${totalRam} GB`, sub: "system allocations", tt: "Total physical memory in use across the entire OS." },
          { label: "Bankruptcies", value: `${sysState?.bankruptcies || 0}`, sub: "evictions today", tt: "The number of times a background process ran out of compute credits and was suspended/throttled by the AI." },
        ].map(({ label, value, sub, tt }) => (
          <Tooltip key={label}>
            <TooltipTrigger asChild>
              <div className="aethos-card p-3 flex flex-col gap-1 cursor-help hover:border-[var(--chart-1)]/30 transition-colors">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
                <span className="text-lg font-semibold font-mono text-foreground">{value}</span>
                <span className="text-[10px] text-muted-foreground">{sub}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="bg-background/95 text-foreground backdrop-blur border border-border max-w-[200px]">
              <p className="text-xs">{tt}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>

      {/* Table */}
      <div className="aethos-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="text-[10px] text-muted-foreground uppercase tracking-wider w-[220px]">Process</TableHead>
              <TableHead className="text-[10px] text-muted-foreground uppercase tracking-wider w-[60px]">PID</TableHead>
              <TableHead className="text-[10px] text-muted-foreground uppercase tracking-wider">CPU</TableHead>
              <TableHead className="text-[10px] text-muted-foreground uppercase tracking-wider">
                <Tooltip><TooltipTrigger>GPU</TooltipTrigger><TooltipContent className="bg-background/95 text-foreground border-border text-xs"><p>Per-process GPU requires Kernel ETW Tracing (Disabled)</p></TooltipContent></Tooltip>
              </TableHead>
              <TableHead className="text-[10px] text-muted-foreground uppercase tracking-wider">RAM</TableHead>
              <TableHead className="text-[10px] text-muted-foreground uppercase tracking-wider">State</TableHead>
              <TableHead className="text-[10px] text-muted-foreground uppercase tracking-wider">
                <Tooltip><TooltipTrigger>Credits</TooltipTrigger><TooltipContent className="bg-background/95 text-foreground border-border text-xs"><p>Current execution budget. Exhaustion leads to bankruptcy.</p></TooltipContent></Tooltip>
              </TableHead>
              <TableHead className="text-[10px] text-muted-foreground uppercase tracking-wider">
                <Tooltip><TooltipTrigger>Burn Rate</TooltipTrigger><TooltipContent className="bg-background/95 text-foreground border-border text-xs"><p>Credits burned per tick. Foreground apps burn 0.</p></TooltipContent></Tooltip>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProcs.map((proc: any) => {
              const state = stateConfig[proc.state] ?? stateConfig.idle
              return (
                <TableRow key={proc.pid} className="hover:bg-muted/30 border-border cursor-pointer transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={cn("size-1.5 rounded-full", state.color.replace("text-", "bg-")
                        .replace("[var(--chart-2)]", "[var(--chart-2)]")
                      )}>
                        <div className={cn("size-1.5 rounded-full", {
                          "bg-[var(--chart-2)]": proc.state === "active",
                          "bg-[var(--chart-1)] aethos-pulse": proc.state === "optimizing" || proc.state === "inferring",
                          "bg-[var(--chart-3)]": proc.state === "indexing",
                          "bg-[var(--chart-4)]": proc.state === "compacting",
                          "bg-muted-foreground": proc.state === "idle" || proc.state === "suspended",
                        })} />
                      </div>
                      <span className="text-xs font-mono text-foreground">{proc.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-mono text-muted-foreground">{proc.pid}</span>
                  </TableCell>
                  <TableCell>
                    <CpuBar value={proc.cpu} />
                  </TableCell>
                  <TableCell>
                    <GpuBar value={proc.gpu} />
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-mono text-muted-foreground">{proc.mem?.toFixed(1) || 0} MB</span>
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className={cn("text-[10px] font-medium border cursor-help", state.bg, state.color)}>
                          {state.label}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent className="bg-background/95 text-foreground border-border text-xs max-w-[200px]">
                        <p>{proc.state === "idle" || proc.state === "suspended" ? "Process is suspended to save power." : "Process is actively running and burning credits."}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <span className={cn("text-xs font-mono font-medium", proc.credits < 200 ? "text-[var(--chart-1)]" : "text-[var(--chart-2)]")}>
                      {proc.credits?.toFixed(0) || 1000}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-mono text-muted-foreground">-{proc.burn_rate?.toFixed(1) || 0}/t</span>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
    </TooltipProvider>
  )
}
