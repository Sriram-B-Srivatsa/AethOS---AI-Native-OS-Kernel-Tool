import {
  Activity,
  BatteryMedium,
  Brain,
  Cpu,
  HardDrive,
  MemoryStick,
  Thermometer,
  Zap,
} from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { MetricCard } from "../MetricCard"
import { MiniChart } from "../MiniChart"

const chartConfig = {
  cpu: { label: "CPU", color: "var(--chart-1)" },
  gpu: { label: "GPU", color: "var(--chart-2)" },
  ram: { label: "RAM", color: "var(--chart-3)" },
  temp: { label: "Temp", color: "var(--chart-4)" },
}

export function OverviewPanel({ sysState, history }: { sysState: any, history: any[] }) {
  return (
    <div className="flex flex-col gap-4 p-4 overflow-auto scrollbar-thin h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">System Overview</h2>
          <p className="text-xs text-muted-foreground">Real-time telemetry · Updated every 250ms</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="size-1.5 rounded-full bg-[var(--chart-2)] aethos-pulse" />
            <span>Live</span>
          </div>
          <Badge variant="outline" className="text-xs font-mono border-border">
            Mode: <span className="text-[var(--chart-1)] ml-1 capitalize">{sysState?.power_mode || "Performance"}</span>
          </Badge>
        </div>
      </div>

      {/* Metric cards row */}
      <div className="grid grid-cols-4 gap-3">
        <MetricCard
          label="CPU Usage"
          value={sysState?.cpu !== undefined ? sysState.cpu.toFixed(1) : "--"}
          unit="%"
          icon={Cpu}
          trend={sysState?.cpu > 80 ? "up" : "down"}
          trendValue=""
          subtext={`${sysState?.core_count || 0} cores active`}
          status={sysState?.cpu > 85 ? "warn" : "ok"}
          tooltipText="Measures the total processing load across all CPU cores. AethOS uses this to calculate token burn rates."
        >
          <MiniChart data={history} dataKey="cpu" color="var(--chart-1)" />
        </MetricCard>

        <MetricCard
          label="GPU Usage"
          value={sysState?.gpuUtil !== undefined ? sysState.gpuUtil.toFixed(1) : "--"}
          unit="%"
          icon={Activity}
          trend={sysState?.gpuUtil > 80 ? "up" : "down"}
          trendValue=""
          subtext={`${sysState?.gpuTemp?.toFixed(0) || 0}°C (Aggregate)`}
          status={sysState?.gpuTemp > 80 ? "warn" : "ok"}
          tooltipText="Measures the total Graphics Processing Unit load across all detected cards."
          middleContent={
            sysState?.gpus && sysState.gpus.length > 0 && (
              <div className="flex flex-col gap-0.5 border-b border-border/50 pb-2 mb-1">
                {sysState.gpus.map((g: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="truncate max-w-[120px]" title={g.name}>
                      {g.name.replace("NVIDIA GeForce ", "").replace(" Laptop GPU", "").replace(" Graphics", "")}
                    </span>
                    <span className="font-mono text-foreground">{g.util?.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            )
          }
        >
          <MiniChart data={history} dataKey="gpu" color="var(--chart-2)" />
        </MetricCard>

        <MetricCard
          label="VRAM"
          value={sysState?.gpuVram !== undefined ? sysState.gpuVram.toFixed(1) : "--"}
          unit="%"
          icon={MemoryStick}
          trend="neutral"
          trendValue=""
          subtext="Utilization"
          status="ok"
          tooltipText="Video RAM limits how many high-resolution textures or AI models can run on the GPU at once."
        >
          <Progress value={sysState?.gpuVram || 0} className="h-1 mt-1 [&>[data-slot=progress-indicator]]:bg-[var(--chart-3)]" />
        </MetricCard>

        <MetricCard
          label="System RAM"
          value={sysState?.ramUsed !== undefined ? sysState.ramUsed.toFixed(1) : "--"}
          unit="GB"
          icon={HardDrive}
          trend="up"
          trendValue=""
          subtext={`${sysState?.ramTotal?.toFixed(1) || 0} GB total · ${sysState?.ramAvail?.toFixed(1) || 0} GB free`}
          status="ok"
          tooltipText="Temporary memory used by running apps. AethOS aggressively suspends background apps to keep this free."
        >
          <MiniChart data={history} dataKey="ram" color="var(--chart-3)" />
        </MetricCard>
      </div>

      {/* Second row */}
      <div className="grid grid-cols-4 gap-3">
        <MetricCard
          label="Temperature"
          value={sysState?.temp !== undefined ? sysState.temp.toFixed(1) : "--"}
          unit="°C"
          icon={Thermometer}
          trend="up"
          trendValue=""
          subtext="Package Temp"
          status={sysState?.temp > 85 ? "warn" : "ok"}
          tooltipText="The physical heat of your CPU (Currently simulated/approximate due to Windows hardware sensor restrictions). High temperatures will cause hardware throttling."
        >
          <MiniChart data={history} dataKey="temp" color="var(--chart-4)" />
        </MetricCard>

        <MetricCard
          label="Battery"
          value={sysState?.bat || 100}
          unit="%"
          icon={BatteryMedium}
          trend="neutral"
          trendValue=""
          subtext={sysState?.ac ? "Charging / AC Power" : "On Battery"}
          status="ok"
          tooltipText="AethOS will adjust its Optimization Genome to heavily save power when running on battery."
        >
          <Progress value={sysState?.bat || 100} className="h-1 mt-1 [&>[data-slot=progress-indicator]]:bg-[var(--chart-2)]" />
        </MetricCard>

        <MetricCard
          label="AI Confidence"
          value={((1.0 - (sysState?.eps || 1.0)) * 100).toFixed(1)}
          unit="%"
          icon={Brain}
          trend="up"
          trendValue=""
          subtext={`Epsilon: ${(sysState?.eps || 1.0).toFixed(3)}`}
          status="ok"
          tooltipText="How confident the Neural Kernel is in its current strategy. 95% means it's mostly exploiting learned knowledge."
        >
          <Progress value={(1.0 - (sysState?.eps || 1.0)) * 100} className="h-1 mt-1 [&>[data-slot=progress-indicator]]:bg-[var(--chart-1)]" />
        </MetricCard>

        <MetricCard
          label="Power Mode"
          value={sysState?.power_mode ? sysState.power_mode.charAt(0).toUpperCase() + sysState.power_mode.slice(1) : (sysState?.ac ? "Performance" : "Efficiency")}
          icon={Zap}
          subtext={sysState?.ac ? "AC Power Profile" : "Battery Saver"}
          status="ok"
          tooltipText="The active power profile. AethOS seamlessly switches this to save energy or boost FPS."
        >
          <div className="flex gap-1 mt-1">
            {["Efficiency", "Balanced", "Performance", "Turbo"].map((m) => (
              <div
                key={m}
                className={`flex-1 h-1 rounded-full ${
                  (sysState?.power_mode?.toLowerCase() === m.toLowerCase())
                    ? "bg-[var(--chart-1)]"
                    : "bg-border"
                }`}
              />
            ))}
          </div>
        </MetricCard>
      </div>

      {/* Combined resource chart */}
      <div className="aethos-card p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-foreground">Resource Timeline</h3>
            <p className="text-xs text-muted-foreground">CPU · GPU · RAM — last 60 minutes</p>
          </div>
          <div className="flex items-center gap-3">
            {[
              { key: "cpu", label: "CPU", color: "var(--chart-1)" },
              { key: "gpu", label: "GPU", color: "var(--chart-2)" },
              { key: "ram", label: "RAM", color: "var(--chart-3)" },
            ].map(({ key, label, color }) => (
              <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="size-2 rounded-full" style={{ background: color }} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
        <ChartContainer config={chartConfig} className="h-[180px] w-full mt-2">
          <AreaChart data={history} margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
            <defs>
              {[
                { id: "cpu", color: "var(--chart-1)" },
                { id: "gpu", color: "var(--chart-2)" },
                { id: "ram", color: "var(--chart-3)" },
              ].map(({ id, color }) => (
                <linearGradient key={id} id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} stroke="oklch(1 0 0 / 5%)" />
            <XAxis dataKey="t" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} interval={2} label={{ value: 'Time (Ticks)', position: 'insideBottom', offset: -15, fill: 'var(--muted-foreground)', fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} domain={[0, 100]} label={{ value: 'Usage %', angle: -90, position: 'insideLeft', offset: 15, fill: 'var(--muted-foreground)', fontSize: 10 }} />
            <Tooltip content={<ChartTooltipContent />} />
            <Area type="monotone" dataKey="cpu" stroke="var(--chart-1)" strokeWidth={1.5} fill="url(#grad-cpu)" dot={false} />
            <Area type="monotone" dataKey="gpu" stroke="var(--chart-2)" strokeWidth={1.5} fill="url(#grad-gpu)" dot={false} />
            <Area type="monotone" dataKey="ram" stroke="var(--chart-3)" strokeWidth={1.5} fill="url(#grad-ram)" dot={false} />
          </AreaChart>
        </ChartContainer>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-6 gap-3">
        {[
          { label: "Storage", value: sysState?.drives?.[0]?.used_pct !== undefined ? `${sysState.drives[0].used_pct.toFixed(1)}%` : "--", color: "text-foreground", tooltip: "Percentage of primary drive used." },
          { label: "Tasks Optimized", value: "Auto", color: "text-[var(--chart-1)]", tooltip: "AethOS automatically optimizes any active foreground tasks." },
          { label: "Avg Latency", value: sysState?.lat !== undefined ? `${sysState.lat.toFixed(1)} ms` : "--", color: "text-[var(--chart-2)]", tooltip: "Calculates the average wait time of processes in the CPU queue. Lower is better." },
          { label: "Predict Prob", value: sysState?.eps !== undefined ? `${((1.0 - sysState.eps) * 100).toFixed(0)}%` : "--", color: "text-foreground", tooltip: "The probability that the AI acts on its learned prediction rather than taking a random action." },
          { label: "Suffering", value: sysState?.suf !== undefined ? `${(sysState.suf * 100).toFixed(1)}%` : "--", color: "text-[var(--chart-4)]", tooltip: "A metric derived from high latency or starved processes. The AI tries to minimize this." },
          { label: "System Ticks", value: sysState?.tick !== undefined ? sysState.tick : "--", color: "text-foreground", tooltip: "The number of execution cycles the AethOS Kernel has completed since boot." },
        ].map(({ label, value, color, tooltip }) => (
          <div key={label} className="aethos-card p-3 flex flex-col gap-1 relative group cursor-pointer">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
            <span className={`text-sm font-semibold font-mono ${color}`}>{value}</span>
            {/* Simple CSS Tooltip */}
            <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-background/95 border border-border backdrop-blur p-2 rounded text-xs text-foreground z-10 bottom-full mb-2 left-1/2 -translate-x-1/2 w-32 text-center pointer-events-none">
              {tooltip}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
