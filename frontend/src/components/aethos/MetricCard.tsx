import { type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface MetricCardProps {
  label: string
  value: string
  unit?: string
  subtext?: string
  icon: LucideIcon
  trend?: "up" | "down" | "neutral"
  trendValue?: string
  status?: "ok" | "warn" | "critical"
  tooltipText?: string
  className?: string
  middleContent?: React.ReactNode
  children?: React.ReactNode
}

const statusColors = {
  ok: "text-[var(--chart-2)]",
  warn: "text-[var(--chart-4)]",
  critical: "text-[var(--destructive)]",
}

export function MetricCard({
  label,
  value,
  unit,
  subtext,
  icon: Icon,
  trend,
  trendValue,
  status = "ok",
  tooltipText,
  className,
  middleContent,
  children,
}: MetricCardProps) {
  const card = (
    <div
      className={cn(
        "aethos-card flex flex-col gap-3 p-4 transition-all duration-200 hover:border-[var(--chart-1)]/30 hover:aethos-glow cursor-pointer",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        <div className={cn("flex size-6 items-center justify-center rounded", status === "ok" ? "bg-[var(--chart-1)]/10" : status === "warn" ? "bg-[var(--chart-4)]/10" : "bg-[var(--destructive)]/10")}>
          <Icon className={cn("size-3.5", statusColors[status])} />
        </div>
      </div>

      {middleContent && (
        <div className="mt-1">{middleContent}</div>
      )}

      <div className="flex items-end gap-1.5">
        <span className="text-2xl font-semibold tracking-tight text-foreground">{value}</span>
        {unit && <span className="text-sm text-muted-foreground mb-0.5">{unit}</span>}
        {trendValue && (
          <span className={cn(
            "ml-auto text-xs font-mono mb-0.5",
            trend === "up" ? "text-[var(--chart-4)]" : trend === "down" ? "text-[var(--chart-2)]" : "text-muted-foreground"
          )}>
            {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trendValue}
          </span>
        )}
      </div>

      {subtext && (
        <div className="text-xs text-muted-foreground">{subtext}</div>
      )}

      {children && (
        <div className="mt-1">{children}</div>
      )}
    </div>
  )

  if (!tooltipText) return card;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{card}</TooltipTrigger>
        <TooltipContent className="bg-background/95 backdrop-blur border border-border text-foreground text-xs p-2 max-w-[200px]">
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
