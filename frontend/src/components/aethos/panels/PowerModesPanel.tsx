import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { BatteryCharging, Cpu, Thermometer, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { socket } from "@/App"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useState, useEffect } from "react"

const modes = [
  {
    id: "efficiency",
    name: "Efficiency",
    desc: "Minimum power draw. Ideal for battery-powered operation.",
    tdp: "15W",
    boost: "Off",
    gpu: "25%",
    fans: "Quiet",
    batteryLife: "8h 20m",
    active: false,
    color: "var(--chart-2)",
  },
  {
    id: "balanced",
    name: "Balanced",
    desc: "Intelligent dynamic scaling. Best all-around profile.",
    tdp: "35W",
    boost: "Auto",
    gpu: "60%",
    fans: "Auto",
    batteryLife: "4h 50m",
    active: false,
    color: "var(--chart-3)",
  },
  {
    id: "performance",
    name: "Performance",
    desc: "Full TDP budget. AI scheduling prioritizes speed.",
    tdp: "72W",
    boost: "On",
    gpu: "100%",
    fans: "Active",
    batteryLife: "1h 42m",
    active: true,
    color: "var(--chart-1)",
  },
  {
    id: "turbo",
    name: "Turbo",
    desc: "Unrestricted boost. For sustained peak compute workloads.",
    tdp: "110W",
    boost: "Max",
    gpu: "100%",
    fans: "Max",
    batteryLife: "N/A",
    active: false,
    color: "var(--destructive)",
  },
]

export function PowerModesPanel({ sysState }: { sysState: any }) {
  const [localMode, setLocalMode] = useState<string | null>(null);
  const currentModeId = localMode || sysState?.power_mode || "performance";
  
  useEffect(() => {
    if (sysState?.power_mode && sysState.power_mode === localMode) {
      setLocalMode(null);
    }
  }, [sysState?.power_mode]);

  const activeMode = modes.find(m => m.id === currentModeId) || modes[2];

  const handleModeClick = (id: string) => {
    setLocalMode(id);
    socket.emit('update_setting', { key: 'power_mode', value: id });
  };

  return (
    <div className="flex flex-col gap-4 p-4 overflow-auto scrollbar-thin h-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Power Modes</h2>
          <p className="text-xs text-muted-foreground">TDP management · Thermal policy · Battery optimization</p>
        </div>
        <Badge className="text-xs border-0" style={{ backgroundColor: `${activeMode.color}20`, color: activeMode.color }}>
          Active: {activeMode.name}
        </Badge>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {modes.map((mode) => {
          const isActive = mode.id === currentModeId;
          return (
          <TooltipProvider key={mode.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  onClick={() => handleModeClick(mode.id)}
                  className={cn(
                    "aethos-card p-4 flex flex-col gap-3 cursor-pointer transition-all duration-200 hover:border-border",
                    isActive && "aethos-glow",
                    isActive ? "" : "opacity-60 hover:opacity-100"
                  )}
                  style={isActive ? { borderColor: `${mode.color}40` } : {}}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold text-foreground">{mode.name}</span>
                      {isActive && (
                        <span className="text-[10px]" style={{ color: mode.color }}>● Active</span>
                      )}
                    </div>
                    <div
                      className="flex size-7 items-center justify-center rounded"
                      style={{ background: `${mode.color}18` }}
                    >
                      <Zap className="size-3.5" style={{ color: mode.color }} />
                    </div>
                  </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">{mode.desc}</p>

            <Separator />

            <div className="flex flex-col gap-2">
              {[
                { label: "TDP", value: mode.tdp },
                { label: "Boost", value: mode.boost },
                { label: "Max GPU", value: mode.gpu },
                { label: "Fans", value: mode.fans },
                { label: "Battery Est.", value: mode.batteryLife },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">{label}</span>
                  <span className="text-[10px] font-mono text-foreground">{value}</span>
                </div>
              ))}
            </div>

            {isActive && (
              <div
                className="mt-1 h-0.5 rounded-full"
                style={{ background: `linear-gradient(to right, ${mode.color}, transparent)` }}
              />
            )}
          </div>
              </TooltipTrigger>
              <TooltipContent className="text-xs border-border bg-background text-foreground max-w-[200px]">
                Click to apply {mode.name} power profile to the AethOS Kernel.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )})}
      </div>

      {/* Current state */}
      <div className="grid grid-cols-3 gap-3">
        <div className="aethos-card p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Cpu className="size-4 text-[var(--chart-1)]" />
            <h3 className="text-sm font-medium text-foreground">CPU Thermal</h3>
          </div>
          {[
            { label: "Package Temp", value: `${sysState?.temp?.toFixed(1) || 0}°C`, pct: Math.min(100, (sysState?.temp || 0) / 100 * 100) },
            { label: "Core 0-3", value: `${sysState?.temp?.toFixed(1) || 0}°C`, pct: Math.min(100, (sysState?.temp || 0) / 100 * 100) },
            { label: "Core 4-7", value: `${(sysState?.temp ? sysState.temp - 2 : 0).toFixed(1)}°C`, pct: Math.min(100, ((sysState?.temp || 0) - 2) / 100 * 100) },
            { label: "Core 8-11", value: `${(sysState?.temp ? sysState.temp - 4 : 0).toFixed(1)}°C`, pct: Math.min(100, ((sysState?.temp || 0) - 4) / 100 * 100) },
          ].map(({ label, value, pct }) => (
            <div key={label} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-mono text-[var(--chart-4)]">{value}</span>
              </div>
              <Progress value={pct} className="h-1 [&>[data-slot=progress-indicator]]:bg-[var(--chart-4)]" />
            </div>
          ))}
        </div>

        <div className="aethos-card p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Thermometer className="size-4 text-[var(--chart-2)]" />
            <h3 className="text-sm font-medium text-foreground">GPU Thermal</h3>
          </div>
          {[
            { label: "GPU Die", value: `${sysState?.gpuTemp?.toFixed(1) || 0}°C`, pct: Math.min(100, (sysState?.gpuTemp || 0) / 100 * 100) },
            { label: "VRAM", value: `${sysState?.gpus?.[0]?.mem_used?.toFixed(1) || 0} GB`, pct: (sysState?.gpus?.[0]?.mem_used / (sysState?.gpus?.[0]?.mem_total || 1)) * 100 || 0 },
            { label: "Power Draw", value: `${sysState?.gpus?.[0]?.power?.toFixed(1) || 0} W`, pct: Math.min(100, (sysState?.gpus?.[0]?.power || 0) / 300 * 100) },
            { label: "Fan Speed", value: `${sysState?.gpus?.[0]?.fan?.toFixed(0) || 0}%`, pct: sysState?.gpus?.[0]?.fan || 0 },
          ].map(({ label, value, pct }) => (
            <div key={label} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-mono text-[var(--chart-2)]">{value}</span>
              </div>
              <Progress value={pct} className="h-1 [&>[data-slot=progress-indicator]]:bg-[var(--chart-2)]" />
            </div>
          ))}
        </div>

        <div className="aethos-card p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <BatteryCharging className="size-4 text-[var(--chart-3)]" />
            <h3 className="text-sm font-medium text-foreground">Battery</h3>
          </div>
          {[
            { label: "Charge Level", value: `${sysState?.bat || 100}%`, pct: sysState?.bat || 100 },
            { label: "Charge Rate", value: sysState?.ac ? "Charging" : "Discharging", pct: sysState?.ac ? 100 : 0 },
            { label: "Time Remaining", value: sysState?.ac ? "N/A" : "Est. Computing...", pct: 0 },
            { label: "Battery Health", value: "Good", pct: 100 },
          ].map(({ label, value, pct }) => (
            <div key={label} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-mono text-[var(--chart-3)]">{value}</span>
              </div>
              <Progress value={pct} className="h-1 [&>[data-slot=progress-indicator]]:bg-[var(--chart-3)]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
