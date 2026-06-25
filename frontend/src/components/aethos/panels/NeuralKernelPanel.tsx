import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  Legend
} from "recharts"
import { useState, useEffect } from "react"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { FlaskConical, Sparkles, TrendingUp } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const chartConfig = {
  epsilon: { label: "Epsilon", color: "var(--chart-4)" },
  reward: { label: "Reward", color: "var(--chart-1)" },
  confidence: { label: "Confidence", color: "var(--chart-2)" },
  fitness: { label: "PDE Fitness", color: "var(--chart-3)" },
}

export function NeuralKernelPanel({ sysState }: { sysState: any }) {
  const [history, setHistory] = useState<any[]>([])
  const [optLog, setOptLog] = useState<any[]>([])

  useEffect(() => {
    if (!sysState?.tick) return;
    setHistory((prev) => {
      const next = [...prev, {
        t: sysState.tick,
        reward: 1.0 - (sysState.suf || 0),
        confidence: 1.0 - (sysState.eps || 1.0),
        epsilon: sysState.eps || 1.0,
        fitness: sysState.pde?.fitness || 0,
      }];
      return next.slice(-60);
    });
  }, [sysState]);

  useEffect(() => {
    if (sysState?.ai_log && sysState.ai_log.length === 2) {
      const [lvl, action] = sysState.ai_log;
      if (action) {
        setOptLog(prev => {
          if (prev.length > 0 && prev[0].action === action) return prev;
          const newLog = [{ action, gain: lvl === "warn" ? "Blocked" : "Optimized", t: new Date().toLocaleTimeString() }, ...prev];
          return newLog.slice(0, 5);
        });
      }
    }
  }, [sysState?.ai_log]);

  const epsilon = sysState?.eps || 1.0;
  const reward = 1.0 - (sysState?.suf || 0);
  const confidence = 1.0 - epsilon;

  // Derive mock scheduler data from current confidence
  const schedulerData = Array.from({ length: 6 }, (_, i) => ({
    slot: `T+${i*2}s`,
    value: Math.max(0.5, confidence - (i * 0.05) + (Math.random() * 0.05)),
  }));

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4 p-4 overflow-auto scrollbar-thin h-full">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Neural Kernel</h2>
            <p className="text-xs text-muted-foreground">Reinforcement learning scheduler · PPO agent</p>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-xs border-[var(--chart-1)]/50 text-[var(--chart-1)] font-mono">
                  Episode {sysState?.tick ? Math.floor(sysState.tick / 60) + 342 : 342}
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="bg-background/95 text-foreground backdrop-blur border border-border max-w-[200px]">
                <p className="text-xs">Represents the current continuous learning cycle. Increases as AethOS completes system observation phases.</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge className="text-xs bg-[var(--chart-1)]/15 text-[var(--chart-1)] border-0 cursor-pointer">
                  <div className="size-1.5 rounded-full bg-[var(--chart-1)] aethos-pulse mr-1.5" />
                  Local Inference
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="bg-background/95 text-foreground backdrop-blur border border-border max-w-[200px]">
                <p className="text-xs">AethOS is actively monitoring hardware states but learning is frozen (Local Mode). It is running in a low-power inference state.</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Epsilon (ε)", value: epsilon.toFixed(4), desc: "Exploration rate", icon: FlaskConical, color: "var(--chart-4)", progress: epsilon * 100, tt: "The rate at which the AI takes random actions to explore new optimizations. Fixed at 0.05 meaning 95% exploitation." },
            { label: "Reward Score", value: reward.toFixed(3), desc: "Cumulative reward", icon: TrendingUp, color: "var(--chart-1)", progress: reward * 100, tt: "The current system reward calculated from latency. Near 1.0 means the system is perfectly optimized." },
            { label: "Pred. Confidence", value: `${(confidence * 100).toFixed(1)}%`, desc: "Scheduler confidence", icon: Sparkles, color: "var(--chart-2)", progress: confidence * 100, tt: "How heavily the AI relies on learned knowledge versus randomness." },
          ].map(({ label, value, desc, icon: Icon, color, progress, tt }) => (
            <Tooltip key={label}>
              <TooltipTrigger asChild>
                <div className="aethos-card p-4 flex flex-col gap-3 cursor-pointer hover:border-[var(--chart-1)]/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
                    <div className="flex size-6 items-center justify-center rounded" style={{ background: `${color}15` }}>
                      <Icon className="size-3.5" style={{ color }} />
                    </div>
                  </div>
                  <span className="text-2xl font-semibold tracking-tight font-mono" style={{ color }}>{value}</span>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">{desc}</span>
                    <Progress value={progress} className="h-1 [&>[data-slot=progress-indicator]]:transition-none" style={{ "--tw-ring-color": color } as React.CSSProperties} />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-background/95 text-foreground backdrop-blur border border-border max-w-[200px]">
                <p className="text-xs">{tt}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="aethos-card p-4 flex flex-col gap-3 cursor-pointer">
                <div>
                  <h3 className="text-sm font-medium text-foreground">Training Curves</h3>
                  <p className="text-xs text-muted-foreground">Reward · Confidence over episodes</p>
                </div>
                <ChartContainer config={chartConfig} className="h-[140px] mt-2">
                  <LineChart data={history} margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                    <CartesianGrid vertical={false} stroke="oklch(1 0 0 / 5%)" />
                    <XAxis dataKey="t" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} interval={4} label={{ value: 'Time (Ticks)', position: 'insideBottom', offset: -15, fill: 'var(--muted-foreground)', fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} domain={[0, 1]} label={{ value: 'Metric Value', angle: -90, position: 'insideLeft', offset: 15, fill: 'var(--muted-foreground)', fontSize: 10 }} />
                    <RechartsTooltip content={<ChartTooltipContent />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', bottom: -10 }} />
                    <Line type="monotone" dataKey="reward" stroke="var(--chart-1)" strokeWidth={1.5} dot={false} name="Reward" />
                    <Line type="monotone" dataKey="confidence" stroke="var(--chart-2)" strokeWidth={1.5} dot={false} name="Confidence" />
                    <Line type="monotone" dataKey="fitness" stroke="var(--chart-3)" strokeWidth={1.5} dot={false} name="PDE Fitness" />
                    <Line type="monotone" dataKey="epsilon" stroke="var(--chart-4)" strokeWidth={1} dot={false} strokeDasharray="3 2" name="Epsilon" />
                  </LineChart>
                </ChartContainer>
              </div>
            </TooltipTrigger>
            <TooltipContent className="bg-background/95 text-foreground backdrop-blur border border-border max-w-[250px]">
              <p className="text-xs">
                <strong>Training Curves:</strong> Visualizes system stability. In Local Mode (Learning Frozen), these lines will remain mostly flat because the AI's internal weights are fixed and it is not aggressively exploring new parameters.
              </p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="aethos-card p-4 flex flex-col gap-3 cursor-pointer">
                <div>
                  <h3 className="text-sm font-medium text-foreground">Scheduler Confidence</h3>
                  <p className="text-xs text-muted-foreground">Future event predictions</p>
                </div>
                <ChartContainer config={chartConfig} className="h-[140px] mt-2">
                  <BarChart data={schedulerData} margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                    <CartesianGrid vertical={false} stroke="oklch(1 0 0 / 5%)" />
                    <XAxis dataKey="slot" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} label={{ value: 'Future Time Slots', position: 'insideBottom', offset: -15, fill: 'var(--muted-foreground)', fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} domain={[0.5, 1]} label={{ value: 'Probability', angle: -90, position: 'insideLeft', offset: 15, fill: 'var(--muted-foreground)', fontSize: 10 }} />
                    <RechartsTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" fill="var(--chart-1)" radius={[2, 2, 0, 0]} opacity={0.8} name="Confidence" />
                  </BarChart>
                </ChartContainer>
              </div>
            </TooltipTrigger>
            <TooltipContent className="bg-background/95 text-foreground backdrop-blur border border-border max-w-[250px]">
              <p className="text-xs">
                <strong>Confidence:</strong> Inversely calculated as (1.0 - Epsilon). Since Epsilon is floored at 0.05, confidence is locked at a stable 95%.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="aethos-card p-4 flex flex-col gap-3">
            <h3 className="text-sm font-medium text-foreground">Agent & Genome State</h3>
            <div className="flex flex-col gap-0">
              {[
                { key: "Genome Alpha", value: sysState?.pde?.alpha?.toFixed(2) || "0.70", detail: "Memory Adaptability", status: "ok", tt: "How heavily the AI relies on past habits (like knowing you game at 8PM) vs recent events." },
                { key: "Genome Beta", value: sysState?.pde?.beta?.toFixed(2) || "0.30", detail: "Intent Detection", status: "ok", tt: "How quickly the AI reacts when you suddenly open a heavy app it wasn't expecting." },
                { key: "Focus Burn", value: sysState?.pde?.focus?.toFixed(1) || "5.0", detail: "Eco Tax (Focus Mode)", status: "ok", tt: "How aggressively background apps are throttled to save battery when you are just browsing or typing." },
                { key: "Gaming Burn", value: sysState?.pde?.game?.toFixed(1) || "10.0", detail: "Eco Tax (Gaming Mode)", status: "warn", tt: "The absolute maximum punishment given to background apps to ensure your game gets 100% of the PC's power." },
                { key: "PDE Fitness", value: sysState?.pde?.fitness?.toFixed(3) || "0.000", detail: "Overall System Health", status: "ok", tt: "A single score combining latency, battery drain, and thermal throttling. Higher is better." },
              ].map(({ key, value, detail, status, tt }, i, arr) => (
                <Tooltip key={key}>
                  <TooltipTrigger asChild>
                    <div className="cursor-pointer hover:bg-muted/30 rounded p-1">
                      <div className="flex items-center justify-between py-1">
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-foreground">{key}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{detail}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className={`size-1.5 rounded-full ${status === "ok" ? "bg-[var(--chart-2)]" : "bg-[var(--chart-4)]"}`} />
                          <span className="text-xs font-mono text-foreground">{value}</span>
                        </div>
                      </div>
                      {i < arr.length - 1 && <Separator className="my-1" />}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-background/95 text-foreground backdrop-blur border border-border">
                    <p className="text-xs">{tt}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>

          <div className="aethos-card p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">Optimization Activity</h3>
              <Badge variant="outline" className="text-[10px] text-muted-foreground">Live Telemetry</Badge>
            </div>
            <div className="flex flex-col gap-2">
              {optLog.length > 0 ? optLog.map(({ action, gain, t }, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-md p-2 bg-muted/40 transition-all">
                  <div className={`mt-0.5 size-1.5 rounded-full shrink-0 ${gain === 'Blocked' ? 'bg-[var(--chart-4)]' : 'bg-[var(--chart-1)]'}`} />
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-xs text-foreground leading-snug">{action}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono ${gain === 'Blocked' ? 'text-[var(--chart-4)]' : 'text-[var(--chart-2)]'}`}>{gain}</span>
                      <span className="text-[10px] text-muted-foreground">{t}</span>
                    </div>
                  </div>
                </div>
              )) : (
                <span className="text-xs text-muted-foreground p-2">Waiting for Kernel activity...</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
