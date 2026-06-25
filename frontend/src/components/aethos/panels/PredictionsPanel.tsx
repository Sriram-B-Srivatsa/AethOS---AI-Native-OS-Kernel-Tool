import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useState, useEffect } from "react"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Cpu, FolderOpen, Globe, MessageSquare, Code2, Music, Flame, Info, Maximize2, ZoomIn, ZoomOut } from "lucide-react"
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const defaultIcons: Record<string, any> = {
  "code.exe": Code2, "slack.exe": MessageSquare, "figma.exe": FolderOpen,
  "chrome.exe": Globe, "spotify.exe": Music, "terminal.exe": Cpu
}

const colorPalette = [
  "var(--chart-1)", "var(--chart-2)", "var(--chart-3)", 
  "var(--chart-4)", "var(--chart-5)", "#8b5cf6", "#ec4899", "#10b981"
]

export function PredictionsPanel({ sysState }: { sysState: any }) {
  const [history, setHistory] = useState<any[]>([])
  const [modalZoom, setModalZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [startPan, setStartPan] = useState({ x: 0, y: 0 })

  const livePredictions = sysState?.predictions || []
  const liveGraph = sysState?.session_graph || { nodes: [], edges: [] }
  
  // Create dynamic chart config based on top predictions
  const dynamicConfig: any = {}
  livePredictions.slice(0, 5).forEach((p: any, idx: number) => {
    dynamicConfig[p.app] = { label: p.app, color: colorPalette[idx % colorPalette.length] }
  })

  useEffect(() => {
    if (!sysState?.tick) return;
    setHistory((prev) => {
      const dataPoint: any = { t: sysState.tick }
      livePredictions.slice(0, 5).forEach((p: any) => {
        dataPoint[p.app] = p.probability
      })
      const next = [...prev, dataPoint];
      return next.slice(-60);
    });
  }, [sysState?.tick]);

  const conf = 1.0 - (sysState?.eps || 1.0);
  const numWarmed = livePredictions.filter((p: any) => p.probability > 0.6).length;

  const renderSessionGraph = (width = 500, height = 300, isEnlarged = false) => {
    const cx = width / 2;
    const cy = height / 2;
    const r = Math.min(cx, cy) - 40;
    
    const activeZoom = isEnlarged ? modalZoom : 1;
    const activePanX = isEnlarged ? pan.x : 0;
    const activePanY = isEnlarged ? pan.y : 0;

    const handleMouseDown = (e: React.MouseEvent) => {
      if (!isEnlarged) return;
      setIsDragging(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
      if (!isEnlarged || !isDragging) return;
      setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
    };

    const handleMouseUp = () => setIsDragging(false);

    const nodes = liveGraph.nodes.map((id: string, i: number, arr: any[]) => {
      const angle = (2 * Math.PI * i) / arr.length;
      return {
        id,
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
        r: 16,
        primary: i === 0,
        prob: livePredictions.find((p:any) => p.app === id)?.probability || 0.5
      }
    })

    return (
      <svg 
        width="100%" 
        height="100%" 
        viewBox={`0 0 ${width} ${height}`} 
        className={`overflow-visible ${isEnlarged ? 'cursor-grab active:cursor-grabbing' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <g transform={`translate(${activePanX}, ${activePanY}) scale(${activeZoom})`} style={{ transformOrigin: "center" }}>
          {liveGraph.edges.map((e: any, i: number) => {
            const f = nodes.find((n:any) => n.id === e.from)
            const t = nodes.find((n:any) => n.id === e.to)
            if (!f || !t) return null;
            return (
              <line
                key={i}
                x1={f.x} y1={f.y} x2={t.x} y2={t.y}
                stroke="oklch(1 0 0 / 12%)"
                strokeWidth={Math.min(3, e.weight * 0.5 + 1)}
                strokeDasharray={f.prob > 0.6 && t.prob > 0.6 ? "none" : "4 3"}
              />
            )
          })}
          {nodes.map((node: any) => (
            <g key={node.id}>
              {node.prob > 0.6 && (
                <circle
                  cx={node.x} cy={node.y} r={node.r + 6}
                  fill="none"
                  stroke="var(--chart-1)"
                  strokeWidth={1}
                  opacity={0.2}
                />
              )}
              <circle
                cx={node.x} cy={node.y} r={node.r}
                fill={node.primary ? "oklch(0.72 0.15 200 / 20%)" : "oklch(1 0 0 / 6%)"}
                stroke={node.prob > 0.6 ? "var(--chart-1)" : "oklch(1 0 0 / 15%)"}
                strokeWidth={node.primary ? 1.5 : 1}
              />
              <text
                x={node.x} y={node.y + 1}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={node.r > 15 ? 8 : 7}
                fill={node.prob > 0.5 ? "oklch(0.92 0.01 220)" : "oklch(0.55 0.01 220)"}
                fontFamily="Inter, system-ui, sans-serif"
                fontWeight={node.primary ? "600" : "400"}
              >
                {node.id}
              </text>
              <text
                x={node.x} y={node.y + node.r + 10}
                textAnchor="middle"
                fontSize={7}
                fill="oklch(0.52 0.01 220)"
                fontFamily="JetBrains Mono, monospace"
              >
                {node.prob.toFixed(2)}
              </text>
            </g>
          ))}
        </g>
      </svg>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 overflow-auto scrollbar-thin h-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Predictions</h2>
          <p className="text-xs text-muted-foreground">App pre-warming · Session graph · Horizon: +30m</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono border-border">
            Confidence: <span className="text-[var(--chart-1)] ml-1">{conf.toFixed(2)}</span>
          </Badge>
          <Badge className="text-xs bg-[var(--chart-2)]/12 text-[var(--chart-2)] border-0">
            <Flame className="size-3 mr-1" />
            {numWarmed} pre-warmed
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Prediction list */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Top 10 App Predictions</span>
          {livePredictions.length === 0 ? (
            <div className="flex-1 flex items-center justify-center border border-dashed border-border rounded text-xs text-muted-foreground p-4 text-center">
              Awaiting sufficient telemetry to form predictions. Open more apps to train the engine.
            </div>
          ) : (
            <div className="overflow-auto scrollbar-thin max-h-[500px] flex flex-col gap-2">
            {livePredictions.slice(0, 10).map((p: any) => {
              const Icon = defaultIcons[p.app.toLowerCase()] || Cpu
              const isWarmed = p.probability > 0.6
              return (
              <div
                key={p.app}
                className="aethos-card p-3 flex items-center gap-3 hover:border-[var(--chart-1)]/30 transition-all cursor-pointer"
              >
                <div className="flex size-7 items-center justify-center rounded bg-muted/60 shrink-0">
                  <Icon className="size-3.5 text-muted-foreground" />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground truncate max-w-[150px]" title={p.app}>{p.app}</span>
                    {isWarmed && (
                      <Badge variant="outline" className="text-[9px] px-1 h-3.5 border-[var(--chart-2)]/40 text-[var(--chart-2)] shrink-0">
                        WARM
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={p.probability * 100}
                      className="h-1 flex-1 [&>[data-slot=progress-indicator]]:bg-[var(--chart-1)]"
                    />
                    <span className="text-[10px] font-mono text-[var(--chart-1)] shrink-0">{(p.probability * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
              )
            })}
            </div>
          )}
        </div>

        {/* Graph visualization */}
        <div className="aethos-card p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">Session Graph</h3>
            <Dialog>
              <DialogTrigger asChild>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer hover:text-foreground">
                  <Maximize2 className="size-3" /> Enlarge
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-5xl h-[80vh] bg-background border-border flex flex-col p-6">
                <DialogTitle className="text-lg font-semibold mb-4 flex items-center justify-between">
                  <span>Expanded Session Graph</span>
                  <div className="flex items-center gap-2 mr-4">
                    <div onClick={() => setModalZoom(z => Math.max(0.5, z - 0.2))} className="p-1 rounded hover:bg-muted cursor-pointer border border-border"><ZoomOut className="size-4" /></div>
                    <div onClick={() => setModalZoom(z => Math.min(3, z + 0.2))} className="p-1 rounded hover:bg-muted cursor-pointer border border-border"><ZoomIn className="size-4" /></div>
                  </div>
                </DialogTitle>
                <div className="flex-1 w-full bg-black/40 rounded-lg border border-border flex items-center justify-center overflow-hidden">
                  {liveGraph.nodes.length === 0 ? (
                    <span className="text-muted-foreground text-sm">Graph is empty. Not enough transition data yet.</span>
                  ) : (
                    renderSessionGraph(1000, 600, true)
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex-1 min-h-[240px] relative">
            {liveGraph.nodes.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground border border-dashed border-border rounded mt-2">
                No session transitions mapped yet
              </div>
            ) : (
              renderSessionGraph(500, 300)
            )}
          </div>
        </div>

        {/* Right Column: Timeline & Heatmap */}
        <div className="flex flex-col gap-4">
          <div className="aethos-card p-4 flex flex-col gap-3">
            <h3 className="text-sm font-medium text-foreground">Probability Timeline</h3>
          <ChartContainer config={dynamicConfig} className="h-[200px]">
            <AreaChart data={history} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
              <defs>
                {Object.entries(dynamicConfig).map(([key, cfg]: [string, any]) => (
                  <linearGradient key={key} id={`pgr-${key.replace(/[^a-zA-Z0-9]/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={cfg.color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={cfg.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} stroke="oklch(1 0 0 / 5%)" />
              <XAxis 
                dataKey="t" 
                tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} 
                tickLine={false} 
                axisLine={false} 
                label={{ value: "Time (Ticks)", position: "insideBottom", offset: -10, fill: "var(--muted-foreground)", fontSize: 10 }}
              />
              <YAxis 
                tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} 
                tickLine={false} 
                axisLine={false} 
                domain={[0, 1]} 
                tickFormatter={(val) => `${(val * 100).toFixed(0)}%`}
                label={{ value: "Probability", angle: -90, position: "insideLeft", offset: 15, fill: "var(--muted-foreground)", fontSize: 10 }}
              />
              <RechartsTooltip content={<ChartTooltipContent />} />
              {Object.entries(dynamicConfig).map(([key, cfg]: [string, any]) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={cfg.color}
                  strokeWidth={1.5}
                  fill={`url(#pgr-${key.replace(/[^a-zA-Z0-9]/g, '')})`}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
            </AreaChart>
          </ChartContainer>
            <div className="flex flex-wrap gap-2">
              {Object.entries(dynamicConfig).map(([key, cfg]: [string, any]) => (
                <div key={key} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <div className="size-2 rounded-full" style={{ background: cfg.color }} />
                  <span>{cfg.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sensory Matrix Heatmap */}
          <div className="aethos-card p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-foreground">Sensory Matrix</h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="size-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="text-xs max-w-[250px] border-border bg-background text-foreground">
                      The Temporal Retina Tensor takes exactly what the AI sees right now (hardware states, memory usage, CPU load) and flattens it into a 1D pixel array. Bright pixels are high-stress signals.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <span className="text-[10px] text-muted-foreground">Temporal Retina Tensor</span>
            </div>
            <div className="flex flex-wrap gap-0.5 p-2 rounded border border-border/50 bg-black/20 justify-center">
              {sysState?.vision?.length > 0 ? (
                sysState.vision.map((val: number, i: number) => (
                  <div
                    key={i}
                    className="size-3 rounded-[1px] transition-colors duration-1000"
                    style={{ backgroundColor: `oklch(0.72 0.15 200 / ${Math.min(1, Math.max(0.1, val))})` }}
                    title={`Dim ${i}: ${val.toFixed(2)}`}
                  />
                ))
              ) : (
                <span className="text-[10px] text-muted-foreground py-4">Waiting for vision tensor...</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
